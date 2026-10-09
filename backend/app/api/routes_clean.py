import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import get_db
from app.database.models import Account, SessionRecord, DialogSnapshot, CleaningJob
from app.core.crypto import decrypt_data
from app.eitaa.client import EitaaClient
from app.engine.cleaner import cleaner_engine

router = APIRouter(prefix="/api/v1/clean", tags=["Cleaning"])

class StartCleanRequest(BaseModel):
    account_ids: List[int]
    mode: str = "FULL_CLEAN" # FULL_CLEAN or SELECTIVE
    selected_peer_ids: Optional[List[str]] = None

class JobActionRequest(BaseModel):
    action: str # PAUSE, RESUME, ABORT

@router.get("/{account_id}/dialogs")
async def scan_account_dialogs(account_id: int, db: AsyncSession = Depends(get_db)):
    acc_res = await db.execute(select(Account).where(Account.id == account_id))
    account = acc_res.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="حساب کاربری یافت نشد.")

    sess_res = await db.execute(select(SessionRecord).where(SessionRecord.account_id == account_id))
    session_rec = sess_res.scalar_one_or_none()
    if not session_rec or not session_rec.is_valid:
        raise HTTPException(status_code=400, detail="نشست حساب منقضی شده یا نامعتبر است. لطفاً روی ورود مجدد کلیک کنید.")

    try:
        decrypted = decrypt_data({
            "ciphertext": session_rec.encrypted_session_data,
            "salt": session_rec.crypto_salt,
            "iv": session_rec.crypto_iv
        })
        sdata = json.loads(decrypted)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطا در رمزگشایی نشست: {e}")

    client = EitaaClient(token=sdata.get("token", ""), imei=sdata.get("imei", ""), account_id=account_id)
    try:
        res = await client.get_dialogs()
        
        # If Eitaa returned authorization error
        if not res.get("success"):
            err_code = res.get("error_code")
            err_msg = res.get("error")
            if err_code == 401 or err_msg == "INVALID_LOGIN":
                account.status = "NEEDS_REAUTH"
                session_rec.is_valid = False
                await db.commit()
                return {
                    "success": False,
                    "detail": "نشست این حساب در سرور ایتا منقضی یا نامعتبر است. لطفاً جهت اتصال و دریافت توکن معتبر، روی دکمه «ورود مجدد» یا افزودن حساب کلیک کنید و کد جدید را وارد نمایید."
                }
            return {
                "success": False,
                "detail": f"خطا در ارتباط با سرور ایتا: {err_msg or 'پاسخی دریافت نشد'}"
            }

        # Clear old snapshots for this account
        await db.execute(delete(DialogSnapshot).where(DialogSnapshot.account_id == account_id))

        new_items = res.get("items", [])
        for it in new_items:
            snap = DialogSnapshot(
                account_id=account.id,
                peer_id=it["peer_id"],
                peer_type=it["type"],
                title=it["title"],
                access_hash=it.get("access_hash", 0),
                is_creator=it.get("is_creator", False),
                is_admin=it.get("is_admin", False),
                members_count=it.get("members_count", 0)
            )
            db.add(snap)

        channels_count = sum(1 for it in new_items if it["type"] == "channel")
        groups_count = sum(1 for it in new_items if it["type"] in ["supergroup", "basic_group", "group"])

        account.total_channels_cached = channels_count
        account.total_groups_cached = groups_count
        account.status = "CONNECTED"
        await db.commit()

        return {
            "success": True,
            "data": {
                "account_id": account.id,
                "channels_count": channels_count,
                "groups_count": groups_count,
                "items": [
                    {
                        "peer_id": it["peer_id"],
                        "type": it["type"],
                        "title": it["title"],
                        "members_count": it.get("members_count", 0),
                        "is_creator": it.get("is_creator", False),
                        "is_admin": it.get("is_admin", False)
                    }
                    for it in new_items
                ]
            }
        }
    finally:
        await client.close()

@router.post("/start")
async def start_cleaning(req: StartCleanRequest, db: AsyncSession = Depends(get_db)):
    if not req.account_ids:
        raise HTTPException(status_code=400, detail="هیچ حسابی برای پاکسازی انتخاب نشده است.")

    job_ids = []
    already_active_count = 0
    for acc_id in req.account_ids:
        acc_res = await db.execute(select(Account).where(Account.id == acc_id))
        account = acc_res.scalar_one_or_none()
        if not account:
            continue
        if account.status == "NEEDS_REAUTH":
            continue

        # Prevent duplicate tasks for the same account
        is_already_active = any(
            t.account_id == acc_id and t.state in ["PENDING", "RUNNING", "PAUSED"]
            for t in cleaner_engine.active_tasks.values()
        )
        if is_already_active:
            already_active_count += 1
            continue

        job_id = await cleaner_engine.queue_account_clean(
            account_id=acc_id,
            mode=req.mode,
            selected_peer_ids=req.selected_peer_ids
        )
        job_ids.append(job_id)

    msg = f"{len(job_ids)} حساب کاربری در صف پاکسازی قرار گرفتند."
    if already_active_count > 0:
        msg += f" ({already_active_count} حساب از قبل در حال پردازش بود)"

    return {
        "success": True,
        "data": {
            "job_ids": job_ids,
            "queued_count": len(job_ids)
        },
        "message": msg
    }

@router.post("/{job_id}/action")
async def handle_job_action(job_id: str, req: JobActionRequest):
    action = req.action.upper()
    if action == "PAUSE":
        ok = await cleaner_engine.pause_job(job_id)
    elif action == "RESUME":
        ok = await cleaner_engine.resume_job(job_id)
    elif action == "ABORT":
        ok = await cleaner_engine.abort_job(job_id)
    else:
        raise HTTPException(status_code=400, detail="عملیات درخواستی نامعتبر است.")

    if not ok:
        raise HTTPException(status_code=404, detail="تسک پاکسازی فعال با این شناسه یافت نشد.")

    return {
        "success": True,
        "message": f"دستور {action} با موفقیت اعمال شد."
    }

@router.post("/abort-all")
async def abort_all_jobs():
    """Abort all running and queued cleaning jobs immediately."""
    count = await cleaner_engine.abort_all()
    return {
        "success": True,
        "data": {"aborted_count": count},
        "message": f"تمام عملیات‌های پاکسازی ({count} تسک) لغو و متوقف شدند."
    }

@router.get("/active-jobs")
async def get_active_jobs():
    jobs = []
    # Purge any finished or dead tasks from cleaner_engine.active_tasks
    finished_keys = [
        jid for jid, task in cleaner_engine.active_tasks.items()
        if task.state in ["COMPLETED", "COMPLETED_WITH_ERRORS", "FAILED", "ABORTED"]
    ]
    for k in finished_keys:
        cleaner_engine.active_tasks.pop(k, None)

    for jid, task in list(cleaner_engine.active_tasks.items()):
        total = task.total_targets
        current = task.success_count + task.fail_count
        pct = round((current / total) * 100, 1) if total > 0 else 0.0
        jobs.append({
            "job_id": jid,
            "account_id": task.account_id,
            "state": task.state,
            "total_targets": total,
            "total_steps": total,
            "current_step": current,
            "success_count": task.success_count,
            "fail_count": task.fail_count,
            "remaining_count": task.remaining_count,
            "percentage": pct
        })
    return {
        "success": True,
        "data": jobs
    }
