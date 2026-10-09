from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from app.core.settings import load_settings, save_settings, reset_settings
from app.engine.cleaner import cleaner_engine

router = APIRouter(prefix="/api/v1/settings", tags=["Settings"])

class SettingsUpdateRequest(BaseModel):
    max_concurrency: int = Field(default=5, ge=1, le=50, description="تعداد اکانت‌های همزمان")
    min_delay: float = Field(default=1.0, ge=0.5, le=30.0, description="حداقل تاخیر بین هر خروج به ثانیه")
    max_delay: float = Field(default=2.5, ge=1.0, le=60.0, description="حداکثر تاخیر بین هر خروج به ثانیه")
    flood_wait_action: str = Field(default="AUTO_WAIT", description="اقدام در مواجهه با FLOOD_WAIT (AUTO_WAIT, PAUSE, ABORT)")
    max_flood_wait_seconds: int = Field(default=120, ge=10, le=3600, description="حداکثر زمان مجاز انتظار FLOOD_WAIT")
    protect_creator_dialogs: bool = Field(default=True, description="محافظت از کانال‌ها و گروه‌های تحت مالکیت")
    auto_delete_history: bool = Field(default=True, description="حذف خودکار تاریخچه گفتگوها بعد از خروج")

@router.get("")
async def get_system_settings():
    """Get current system settings."""
    cfg = load_settings()
    return {
        "success": True,
        "data": cfg
    }

@router.post("")
async def update_system_settings(req: SettingsUpdateRequest):
    """Update system settings and apply immediately to cleaner engine."""
    if req.min_delay > req.max_delay:
        raise HTTPException(
            status_code=400,
            detail="حداقل تاخیر نمی‌تواند بیشتر از حداکثر تاخیر باشد."
        )

    saved = save_settings(req.model_dump())
    cleaner_engine.apply_settings(saved)

    return {
        "success": True,
        "data": saved,
        "message": "تنظیمات با موفقیت ذخیره و در سامانه اعمال گردید."
    }

@router.post("/reset")
async def reset_system_settings():
    """Reset system settings to default values."""
    defaults = reset_settings()
    cleaner_engine.apply_settings(defaults)

    return {
        "success": True,
        "data": defaults,
        "message": "تنظیمات سامانه به مقادیر پیش‌فرض بازنشانی شد."
    }
