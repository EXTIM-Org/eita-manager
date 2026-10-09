from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, delete, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database.connection import get_db
from app.database.models import CleaningJob, JobItem, Account

router = APIRouter(prefix="/api/v1/reports", tags=["Reports & History"])

@router.get("")
async def get_cleaning_reports(
    status: Optional[str] = "all",
    account_id: Optional[int] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(CleaningJob, Account)
        .outerjoin(Account, CleaningJob.account_id == Account.id)
        .order_by(desc(CleaningJob.started_at))
    )

    if account_id:
        query = query.where(CleaningJob.account_id == account_id)

    if status and status != "all":
        status_upper = status.upper()
        if status_upper == "COMPLETED":
            query = query.where(CleaningJob.status.in_(["COMPLETED", "COMPLETED_WITH_ERRORS"]))
        else:
            query = query.where(CleaningJob.status == status_upper)

    result = await db.execute(query)
    rows = result.all()

    items = []
    for job, acc in rows:
        # Search filter if provided
        if search:
            s = search.lower()
            acc_name = (acc.label or acc.first_name or "") if acc else ""
            acc_id_str = acc.internal_id if acc else ""
            job_id_str = job.id
            if s not in acc_name.lower() and s not in acc_id_str.lower() and s not in job_id_str.lower():
                continue

        duration_sec = None
        if job.finished_at and job.started_at:
            duration_sec = int((job.finished_at - job.started_at).total_seconds())

        items.append({
            "id": job.id,
            "account_id": job.account_id,
            "account_internal_id": acc.internal_id if acc else f"ACC-{job.account_id}",
            "account_label": (acc.label or acc.first_name or "بدون نام") if acc else "حساب حذف شده",
            "phone_masked": acc.phone_masked if acc else "",
            "status": job.status,
            "total_targets": job.total_targets,
            "success_count": job.success_count,
            "fail_count": job.fail_count,
            "remaining_count": job.remaining_count,
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "finished_at": job.finished_at.isoformat() if job.finished_at else None,
            "duration_seconds": duration_sec,
            "failure_summary": job.failure_summary
        })

    return {
        "success": True,
        "data": {
            "total": len(items),
            "items": items
        }
    }

@router.get("/{job_id}/items")
async def get_job_items(job_id: str, db: AsyncSession = Depends(get_db)):
    # Check if job exists
    job_res = await db.execute(select(CleaningJob).where(CleaningJob.id == job_id))
    job = job_res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="تسک پاکسازی یافت نشد.")

    # Fetch items
    items_res = await db.execute(
        select(JobItem).where(JobItem.job_id == job_id).order_by(JobItem.id)
    )
    items = items_res.scalars().all()

    return {
        "success": True,
        "data": {
            "job_id": job.id,
            "status": job.status,
            "total_targets": job.total_targets,
            "success_count": job.success_count,
            "fail_count": job.fail_count,
            "failure_summary": job.failure_summary,
            "items": [
                {
                    "id": item.id,
                    "peer_id": item.peer_id,
                    "peer_type": item.peer_type,
                    "peer_title": item.peer_title or item.peer_id,
                    "status": item.status,
                    "error_code": item.error_code,
                    "error_message": item.error_message,
                    "retry_count": item.retry_count,
                    "processed_at": item.processed_at.isoformat() if item.processed_at else None
                }
                for item in items
            ]
        }
    }

@router.delete("/{job_id}")
async def delete_job_report(job_id: str, db: AsyncSession = Depends(get_db)):
    job_res = await db.execute(select(CleaningJob).where(CleaningJob.id == job_id))
    job = job_res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="گزارش مورد نظر یافت نشد.")

    await db.delete(job)
    await db.commit()

    return {
        "success": True,
        "message": "گزارش پاکسازی با موفقیت حذف گردید."
    }

@router.delete("")
async def clear_all_reports(db: AsyncSession = Depends(get_db)):
    # Delete non-running jobs
    await db.execute(
        delete(CleaningJob).where(CleaningJob.status.notin_(["RUNNING", "PAUSED", "PENDING"]))
    )
    await db.commit()

    return {
        "success": True,
        "message": "کلیه سوابق و تاریخچه‌های خاتمه‌یافته با موفقیت پاکسازی شدند."
    }
