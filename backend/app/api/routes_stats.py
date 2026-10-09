from fastapi import APIRouter, Depends
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.connection import get_db
from app.database.models import Account, CleaningJob

router = APIRouter(prefix="/api/v1/stats", tags=["Dashboard Statistics"])

@router.get("")
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    # Accounts stats
    accs_res = await db.execute(select(Account))
    accounts = accs_res.scalars().all()
    
    total_accounts = len(accounts)
    active_accounts = sum(1 for a in accounts if a.status == "CONNECTED")
    needs_reauth = sum(1 for a in accounts if a.status == "NEEDS_REAUTH")
    busy_accounts = sum(1 for a in accounts if a.status == "BUSY")

    # Cleaning jobs stats
    jobs_res = await db.execute(select(CleaningJob).order_by(desc(CleaningJob.started_at)))
    jobs = jobs_res.scalars().all()

    total_cleaned_items = sum(j.success_count for j in jobs)
    total_failed_items = sum(j.fail_count for j in jobs)
    total_processed_items = total_cleaned_items + total_failed_items
    success_rate_pct = round((total_cleaned_items / total_processed_items) * 100, 1) if total_processed_items > 0 else 100.0
    
    last_cleaned_account = max(
        [a.last_cleaned_at for a in accounts if a.last_cleaned_at is not None],
        default=None
    )

    recent_history = []
    for j in jobs[:10]:
        total = j.total_targets
        current = j.success_count + j.fail_count
        if total > 0:
            pct = round((current / total) * 100, 1)
        elif j.status in ["COMPLETED", "COMPLETED_WITH_ERRORS"]:
            pct = 100.0
        else:
            pct = 0.0

        recent_history.append({
            "id": j.id,
            "account_id": j.account_id,
            "status": j.status,
            "total_targets": total,
            "success_count": j.success_count,
            "fail_count": j.fail_count,
            "percentage": pct,
            "started_at": j.started_at.isoformat() if j.started_at else None,
            "finished_at": j.finished_at.isoformat() if j.finished_at else None
        })

    return {
        "success": True,
        "data": {
            "total_accounts": total_accounts,
            "active_accounts": active_accounts,
            "needs_reauth_accounts": needs_reauth,
            "busy_accounts": busy_accounts,
            "total_cleaned_items": total_cleaned_items,
            "total_failed_items": total_failed_items,
            "success_rate_pct": success_rate_pct,
            "last_cleaned_at": last_cleaned_account.isoformat() if last_cleaned_account else None,
            "recent_history": recent_history
        }
    }
