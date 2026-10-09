import asyncio
import random
import time
import uuid
import json
from datetime import datetime, timezone
from typing import Dict, List, Optional, Callable
from sqlalchemy import select, update
from app.database.connection import AsyncSessionLocal
from app.database.models import Account, CleaningJob, JobItem, SessionRecord, DialogSnapshot
from app.core.crypto import decrypt_data
from app.core.settings import load_settings
from app.eitaa.client import EitaaClient

def utc_now():
    return datetime.now(timezone.utc)

class CleaningTask:
    def __init__(self, job_id: str, account_id: int, mode: str = "FULL_CLEAN", selected_peer_ids: Optional[List[str]] = None):
        self.job_id = job_id
        self.account_id = account_id
        self.mode = mode
        self.selected_peer_ids = selected_peer_ids or []
        self.state = "PENDING" # PENDING, RUNNING, PAUSED, COMPLETED, ABORTED, FAILED
        self.total_targets = 0
        self.success_count = 0
        self.fail_count = 0
        self.remaining_count = 0
        self.pause_event = asyncio.Event()
        self.pause_event.set() # Unpaused initially
        self.abort_requested = False

class CleaningEngine:
    def __init__(self):
        self.active_tasks: Dict[str, CleaningTask] = {}
        self.task_queue: asyncio.Queue = asyncio.Queue()
        cfg = load_settings()
        self.max_concurrency = int(cfg.get("max_concurrency", 5))
        self.min_delay = float(cfg.get("min_delay", 1.0))
        self.max_delay = float(cfg.get("max_delay", 2.5))
        self.flood_wait_action = cfg.get("flood_wait_action", "AUTO_WAIT")
        self.max_flood_wait_seconds = int(cfg.get("max_flood_wait_seconds", 120))
        self.protect_creator_dialogs = bool(cfg.get("protect_creator_dialogs", True))
        self.auto_delete_history = bool(cfg.get("auto_delete_history", True))
        self.workers: List[asyncio.Task] = []
        self.ws_broadcaster: Optional[Callable] = None
        self.is_running = False

    def apply_settings(self, cfg: dict):
        self.min_delay = float(cfg.get("min_delay", self.min_delay))
        self.max_delay = float(cfg.get("max_delay", self.max_delay))
        self.flood_wait_action = cfg.get("flood_wait_action", self.flood_wait_action)
        self.max_flood_wait_seconds = int(cfg.get("max_flood_wait_seconds", self.max_flood_wait_seconds))
        self.protect_creator_dialogs = bool(cfg.get("protect_creator_dialogs", self.protect_creator_dialogs))
        self.auto_delete_history = bool(cfg.get("auto_delete_history", self.auto_delete_history))

        new_concurrency = int(cfg.get("max_concurrency", self.max_concurrency))
        old_concurrency = self.max_concurrency
        self.max_concurrency = new_concurrency

        if self.is_running and new_concurrency > old_concurrency:
            for i in range(old_concurrency, new_concurrency):
                worker = asyncio.create_task(self._worker_loop(i + 1))
                self.workers.append(worker)

    def set_broadcaster(self, broadcaster: Callable):
        self.ws_broadcaster = broadcaster

    async def broadcast(self, event: str, payload: dict):
        if self.ws_broadcaster:
            try:
                await self.ws_broadcaster(event, payload)
            except Exception:
                pass

    async def start(self):
        if self.is_running:
            return
        self.is_running = True
        for i in range(self.max_concurrency):
            worker = asyncio.create_task(self._worker_loop(i + 1))
            self.workers.append(worker)

    async def stop(self):
        self.is_running = False
        for task in self.active_tasks.values():
            task.abort_requested = True
            task.pause_event.set()
        for worker in self.workers:
            worker.cancel()
        self.workers.clear()

    async def queue_account_clean(self, account_id: int, mode: str = "FULL_CLEAN", selected_peer_ids: Optional[List[str]] = None) -> str:
        job_id = f"job_{uuid.uuid4().hex[:10]}"
        task = CleaningTask(job_id, account_id, mode, selected_peer_ids)
        self.active_tasks[job_id] = task

        # Save CleaningJob in DB
        async with AsyncSessionLocal() as session:
            job_record = CleaningJob(
                id=job_id,
                account_id=account_id,
                status="PENDING",
                total_targets=0,
                success_count=0,
                fail_count=0,
                remaining_count=0,
                started_at=utc_now()
            )
            session.add(job_record)
            
            # Update account status to BUSY
            await session.execute(
                update(Account).where(Account.id == account_id).values(status="BUSY")
            )
            await session.commit()

        await self.task_queue.put(task)
        await self.broadcast("JOB_QUEUED", {
            "job_id": job_id,
            "account_id": account_id,
            "status": "QUEUED"
        })
        return job_id

    async def pause_job(self, job_id: str) -> bool:
        if job_id in self.active_tasks:
            task = self.active_tasks[job_id]
            task.state = "PAUSED"
            task.pause_event.clear()
            async with AsyncSessionLocal() as session:
                await session.execute(
                    update(CleaningJob).where(CleaningJob.id == job_id).values(status="PAUSED")
                )
                await session.commit()
            await self.broadcast("JOB_PAUSED", {"job_id": job_id, "account_id": task.account_id})
            return True
        return False

    async def resume_job(self, job_id: str) -> bool:
        if job_id in self.active_tasks:
            task = self.active_tasks[job_id]
            task.state = "RUNNING"
            task.pause_event.set()
            async with AsyncSessionLocal() as session:
                await session.execute(
                    update(CleaningJob).where(CleaningJob.id == job_id).values(status="RUNNING")
                )
                await session.commit()
            await self.broadcast("JOB_RESUMED", {"job_id": job_id, "account_id": task.account_id})
            return True
        return False

    async def abort_job(self, job_id: str) -> bool:
        if job_id in self.active_tasks:
            task = self.active_tasks[job_id]
            task.abort_requested = True
            task.state = "ABORTED"
            task.pause_event.set()
            async with AsyncSessionLocal() as session:
                await session.execute(
                    update(CleaningJob).where(CleaningJob.id == job_id).values(
                        status="ABORTED", finished_at=utc_now()
                    )
                )
                await session.execute(
                    update(Account).where(Account.id == task.account_id).values(status="CONNECTED")
                )
                await session.commit()
            await self.broadcast("JOB_ABORTED", {"job_id": job_id, "account_id": task.account_id})
            return True
        return False

    async def _worker_loop(self, worker_id: int):
        while self.is_running:
            if worker_id > self.max_concurrency:
                break
            try:
                task: CleaningTask = await self.task_queue.get()
                if worker_id > self.max_concurrency:
                    # Concurrency decreased, put task back for active workers
                    await self.task_queue.put(task)
                    self.task_queue.task_done()
                    break
                await self._process_task(task)
                self.task_queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                await asyncio.sleep(2.0)

    async def _process_task(self, task: CleaningTask):
        client = None
        try:
            task.state = "RUNNING"
            async with AsyncSessionLocal() as session:
                # Load account and decrypt session
                acc_result = await session.execute(
                    select(Account).where(Account.id == task.account_id)
                )
                account = acc_result.scalar_one_or_none()
                if not account:
                    task.state = "FAILED"
                    await self.broadcast("JOB_COMPLETED", {
                        "job_id": task.job_id,
                        "account_id": task.account_id,
                        "total_targets": 0,
                        "success_count": 0,
                        "fail_count": 0,
                        "status": "FAILED"
                    })
                    return

                sess_result = await session.execute(
                    select(SessionRecord).where(SessionRecord.account_id == task.account_id)
                )
                session_rec = sess_result.scalar_one_or_none()
                if not session_rec or not session_rec.is_valid:
                    task.state = "FAILED"
                    await session.execute(
                        update(Account).where(Account.id == task.account_id).values(status="NEEDS_REAUTH")
                    )
                    await session.execute(
                        update(CleaningJob).where(CleaningJob.id == task.job_id).values(
                            status="FAILED",
                            failure_summary="نشست نامعتبر است یا منقضی شده است.",
                            finished_at=utc_now()
                        )
                    )
                    await session.commit()
                    await self.broadcast("JOB_COMPLETED", {
                        "job_id": task.job_id,
                        "account_id": task.account_id,
                        "total_targets": 0,
                        "success_count": 0,
                        "fail_count": 0,
                        "status": "FAILED"
                    })
                    return

            try:
                decrypted_json = decrypt_data({
                    "ciphertext": session_rec.encrypted_session_data,
                    "salt": session_rec.crypto_salt,
                    "iv": session_rec.crypto_iv
                })
                session_dict = json.loads(decrypted_json)
            except Exception as e:
                task.state = "FAILED"
                await session.execute(
                    update(CleaningJob).where(CleaningJob.id == task.job_id).values(
                        status="FAILED",
                        failure_summary=f"خطا در رمزگشایی نشست: {e}",
                        finished_at=utc_now()
                    )
                )
                await session.commit()
                await self.broadcast("JOB_COMPLETED", {
                    "job_id": task.job_id,
                    "account_id": task.account_id,
                    "total_targets": 0,
                    "success_count": 0,
                    "fail_count": 0,
                    "status": "FAILED"
                })
                return

            # Load snapshots of dialogs to clean
            dialogs_result = await session.execute(
                select(DialogSnapshot).where(DialogSnapshot.account_id == task.account_id)
            )
            dialogs = dialogs_result.scalars().all()

            # If snapshots are empty, automatically scan from Eitaa first
            if not dialogs:
                temp_client = EitaaClient(
                    token=session_dict.get("token", ""),
                    imei=session_dict.get("imei", ""),
                    account_id=task.account_id
                )
                try:
                    scan_res = await temp_client.get_dialogs()
                    if scan_res.get("success"):
                        for it in scan_res.get("items", []):
                            snap = DialogSnapshot(
                                account_id=task.account_id,
                                peer_id=it["peer_id"],
                                peer_type=it["type"],
                                title=it["title"],
                                access_hash=it.get("access_hash", 0),
                                is_creator=it.get("is_creator", False),
                                is_admin=it.get("is_admin", False),
                                members_count=it.get("members_count", 0)
                            )
                            session.add(snap)
                        await session.commit()
                        dialogs_result = await session.execute(
                            select(DialogSnapshot).where(DialogSnapshot.account_id == task.account_id)
                        )
                        dialogs = dialogs_result.scalars().all()
                finally:
                    await temp_client.close()
            
            # Filter targets: omit if account is creator (if enabled), filter by selected if not FULL_CLEAN
            targets = []
            for d in dialogs:
                if self.protect_creator_dialogs and d.is_creator:
                    continue
                if task.mode == "SELECTIVE" and task.selected_peer_ids:
                    if d.peer_id not in task.selected_peer_ids:
                        continue
                targets.append(d)

            task.total_targets = len(targets)
            task.remaining_count = len(targets)

            await session.execute(
                update(CleaningJob).where(CleaningJob.id == task.job_id).values(
                    status="RUNNING",
                    total_targets=task.total_targets,
                    remaining_count=task.remaining_count
                )
            )
            await session.commit()

        # Initialize Eitaa Client for execution
        client = EitaaClient(
            token=session_dict.get("token", ""),
            imei=session_dict.get("imei", ""),
            account_id=task.account_id
        )

        try:
            for index, target in enumerate(targets):
                if task.abort_requested:
                    break

                # Wait if paused
                await task.pause_event.wait()
                if task.abort_requested:
                    break

                # Attempt leave
                peer_id_int = int(target.peer_id) if target.peer_id.isdigit() else 0
                leave_success = False
                error_msg = None
                error_code = None

                if target.peer_type in ["channel", "supergroup"]:
                    res = await client.leave_channel(channel_id=peer_id_int, access_hash=target.access_hash)
                    if res.get("success") and self.auto_delete_history:
                        await client.delete_channel_history(channel_id=peer_id_int, access_hash=target.access_hash)
                else:
                    res = await client.delete_chat_user(chat_id=peer_id_int)
                    if res.get("success") and self.auto_delete_history:
                        # For basic groups, we don't have access_hash, pass 0
                        await client.delete_channel_history(channel_id=peer_id_int, access_hash=0, is_channel=False)

                if res.get("success"):
                    leave_success = True
                    task.success_count += 1
                else:
                    err_text = res.get("error_message", "Unknown error")
                    error_code = str(res.get("error_code", "ERROR"))
                    error_msg = err_text

                    # Handle FLOOD_WAIT
                    if "FLOOD_WAIT" in err_text.upper():
                        wait_seconds = 30
                        # Extract number if present
                        parts = err_text.split("_")
                        if len(parts) >= 3 and parts[-1].isdigit():
                            wait_seconds = int(parts[-1])
                        
                        await self.broadcast("FLOOD_WAIT_WARNING", {
                            "job_id": task.job_id,
                            "account_id": task.account_id,
                            "wait_seconds": wait_seconds
                        })

                        if wait_seconds > self.max_flood_wait_seconds:
                            if self.flood_wait_action == "ABORT":
                                task.abort_requested = True
                                break
                            elif self.flood_wait_action == "PAUSE":
                                await self.pause_job(task.job_id)
                                break

                        if self.flood_wait_action == "ABORT":
                            task.abort_requested = True
                            break
                        elif self.flood_wait_action == "PAUSE":
                            await self.pause_job(task.job_id)
                            break
                        else:
                            # AUTO_WAIT: sleep wait_seconds
                            await asyncio.sleep(wait_seconds)
                    else:
                        task.fail_count += 1

                task.remaining_count = max(0, task.total_targets - (task.success_count + task.fail_count))

                # Record Job Item in DB
                async with AsyncSessionLocal() as session:
                    item = JobItem(
                        job_id=task.job_id,
                        peer_id=target.peer_id,
                        peer_type=target.peer_type,
                        peer_title=target.title,
                        status="LEFT_SUCCESS" if leave_success else "ERROR",
                        error_code=error_code,
                        error_message=error_msg,
                        processed_at=utc_now()
                    )
                    session.add(item)
                    if leave_success:
                        # Remove from snapshot
                        await session.delete(target)
                    await session.execute(
                        update(CleaningJob).where(CleaningJob.id == task.job_id).values(
                            success_count=task.success_count,
                            fail_count=task.fail_count,
                            remaining_count=task.remaining_count
                        )
                    )
                    await session.commit()

                # Broadcast progress via WebSocket
                progress_pct = round(((index + 1) / max(1, task.total_targets)) * 100, 1)
                await self.broadcast("JOB_PROGRESS", {
                    "job_id": task.job_id,
                    "account_id": task.account_id,
                    "current_step": index + 1,
                    "total_steps": task.total_targets,
                    "percentage": progress_pct,
                    "current_peer_title": target.title,
                    "status": "LEFT_SUCCESS" if leave_success else "ERROR",
                    "success_count": task.success_count,
                    "fail_count": task.fail_count
                })

                # Adaptive Jitter Delay based on system settings
                delay = random.uniform(min(self.min_delay, self.max_delay), max(self.min_delay, self.max_delay))
                await asyncio.sleep(delay)

            # Final status update
            final_status = "ABORTED" if task.abort_requested else ("COMPLETED" if task.fail_count == 0 else "COMPLETED_WITH_ERRORS")
            task.state = final_status

            async with AsyncSessionLocal() as session:
                await session.execute(
                    update(CleaningJob).where(CleaningJob.id == task.job_id).values(
                        status=final_status,
                        finished_at=utc_now()
                    )
                )
                await session.execute(
                    update(Account).where(Account.id == task.account_id).values(
                        status="CONNECTED",
                        last_cleaned_at=utc_now()
                    )
                )
                await session.commit()

            await self.broadcast("JOB_COMPLETED", {
                "job_id": task.job_id,
                "account_id": task.account_id,
                "total_targets": task.total_targets,
                "success_count": task.success_count,
                "fail_count": task.fail_count,
                "status": final_status
            })

        finally:
            if client:
                try:
                    await client.close()
                except Exception:
                    pass
            self.active_tasks.pop(task.job_id, None)

cleaner_engine = CleaningEngine()
