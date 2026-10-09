import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, delete, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import get_db
from app.database.models import Account, SessionRecord, CleaningJob, DialogSnapshot
from app.core.crypto import decrypt_data
from app.eitaa.client import EitaaClient

router = APIRouter(prefix="/api/v1/accounts", tags=["Accounts"])

class BulkActionRequest(BaseModel):
    account_ids: List[int]

@router.get("")
async def get_accounts(
    status: Optional[str] = "all",
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Account).order_by(desc(Account.id))
    
    if status and status != "all":
        query = query.where(Account.status == status.upper())

    result = await db.execute(query)
    accounts = result.scalars().all()

    # Apply search filter if specified
    if search:
        s = search.lower()
        accounts = [
            a for a in accounts
            if s in (a.label or "").lower()
            or s in (a.internal_id or "").lower()
            or s in (a.phone_masked or "").lower()
            or s in (a.first_name or "").lower()
        ]

    active_count = sum(1 for a in accounts if a.status == "CONNECTED")
    needs_reauth_count = sum(1 for a in accounts if a.status == "NEEDS_REAUTH")

    return {
        "success": True,
        "data": {
            "total": len(accounts),
            "active_count": active_count,
            "needs_reauth_count": needs_reauth_count,
            "items": [
                {
                    "id": a.id,
                    "internal_id": a.internal_id,
                    "label": a.label,
                    "phone_masked": a.phone_masked,
                    "first_name": a.first_name,
                    "last_name": a.last_name,
                    "status": a.status,
                    "total_channels": a.total_channels_cached,
                    "total_groups": a.total_groups_cached,
                    "last_cleaned_at": a.last_cleaned_at.isoformat() if a.last_cleaned_at else None,
                    "created_at": a.created_at.isoformat() if a.created_at else None
                }
                for a in accounts
            ]
        }
    }

@router.get("/{account_id}")
async def get_account_detail(account_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Account).where(Account.id == account_id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="حساب کاربری یافت نشد.")

    # Fetch recent jobs
    jobs_res = await db.execute(
        select(CleaningJob).where(CleaningJob.account_id == account_id).order_by(desc(CleaningJob.started_at)).limit(10)
    )
    jobs = jobs_res.scalars().all()

    # Fetch dialog snapshots
    dialogs_res = await db.execute(
        select(DialogSnapshot).where(DialogSnapshot.account_id == account_id)
    )
    dialogs = dialogs_res.scalars().all()

    return {
        "success": True,
        "data": {
            "account": {
                "id": account.id,
                "internal_id": account.internal_id,
                "label": account.label,
                "phone_masked": account.phone_masked,
                "first_name": account.first_name,
                "last_name": account.last_name,
                "status": account.status,
                "total_channels": account.total_channels_cached,
                "total_groups": account.total_groups_cached,
                "last_cleaned_at": account.last_cleaned_at.isoformat() if account.last_cleaned_at else None,
                "created_at": account.created_at.isoformat() if account.created_at else None
            },
            "recent_jobs": [
                {
                    "id": j.id,
                    "status": j.status,
                    "total_targets": j.total_targets,
                    "success_count": j.success_count,
                    "fail_count": j.fail_count,
                    "remaining_count": j.remaining_count,
                    "started_at": j.started_at.isoformat() if j.started_at else None,
                    "finished_at": j.finished_at.isoformat() if j.finished_at else None
                }
                for j in jobs
            ],
            "dialogs": [
                {
                    "peer_id": d.peer_id,
                    "type": d.peer_type,
                    "title": d.title,
                    "members_count": d.members_count,
                    "is_creator": d.is_creator,
                    "is_admin": d.is_admin
                }
                for d in dialogs
            ]
        }
    }

@router.delete("/{account_id}")
async def delete_account(account_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Account).where(Account.id == account_id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="حساب کاربری یافت نشد.")

    await db.delete(account)
    await db.commit()

    return {
        "success": True,
        "message": "حساب کاربری و اطلاعات نشست به صورت امن حذف شدند."
    }

@router.post("/bulk-delete")
async def bulk_delete_accounts(req: BulkActionRequest, db: AsyncSession = Depends(get_db)):
    for acc_id in req.account_ids:
        acc_res = await db.execute(select(Account).where(Account.id == acc_id))
        acc = acc_res.scalar_one_or_none()
        if acc:
            await db.delete(acc)
    await db.commit()
    return {
        "success": True,
        "message": f"{len(req.account_ids)} حساب کاربری با موفقیت حذف شدند."
    }

@router.post("/{account_id}/health")
async def check_account_health(account_id: int, db: AsyncSession = Depends(get_db)):
    acc_res = await db.execute(select(Account).where(Account.id == account_id))
    account = acc_res.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="حساب کاربری یافت نشد.")

    sess_res = await db.execute(select(SessionRecord).where(SessionRecord.account_id == account_id))
    session_rec = sess_res.scalar_one_or_none()
    if not session_rec:
        account.status = "NEEDS_REAUTH"
        await db.commit()
        return {"success": False, "status": "NEEDS_REAUTH"}

    try:
        decrypted = decrypt_data({
            "ciphertext": session_rec.encrypted_session_data,
            "salt": session_rec.crypto_salt,
            "iv": session_rec.crypto_iv
        })
        sdata = json.loads(decrypted)
        client = EitaaClient(token=sdata.get("token", ""), imei=sdata.get("imei", ""), account_id=account_id)
        is_alive = await client.check_health()
        await client.close()
        
        account.status = "CONNECTED" if is_alive else "NEEDS_REAUTH"
        session_rec.is_valid = is_alive
        await db.commit()
        return {"success": True, "status": account.status}
    except Exception:
        account.status = "NEEDS_REAUTH"
        session_rec.is_valid = False
        await db.commit()
        return {"success": False, "status": "NEEDS_REAUTH"}
