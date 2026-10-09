from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from app.core.settings import load_settings, save_settings, reset_settings
from app.engine.cleaner import cleaner_engine

router = APIRouter(prefix="/api/v1/settings", tags=["Settings"])

class SettingsUpdateRequest(BaseModel):
    max_concurrency: int = Field(default=5, ge=1, le=100, description="تعداد اکانت‌های همزمان")
    min_delay: Optional[float] = Field(default=1.0, description="حداقل تاخیر بین هر خروج به ثانیه")
    max_delay: Optional[float] = Field(default=2.5, description="حداکثر تاخیر بین هر خروج به ثانیه")
    flood_wait_action: Optional[str] = Field(default="AUTO_WAIT", description="اقدام در مواجهه با FLOOD_WAIT")
    max_flood_wait_seconds: Optional[int] = Field(default=120, description="حداکثر زمان مجاز انتظار FLOOD_WAIT")
    protect_creator_dialogs: bool = Field(default=True, description="محافظت از کانال‌ها و گروه‌های تحت مالکیت")
    auto_delete_history: bool = Field(default=True, description="حذف خودکار تاریخچه گفتگوها بعد از خروج")

@router.get("")
async def get_system_settings():
    """Get current system settings."""
    cfg = load_settings()
    # Ensure hardcoded balanced values and 50 concurrency are reflected
    cfg["max_concurrency"] = 50
    cfg["min_delay"] = 1.0
    cfg["max_delay"] = 2.5
    cfg["flood_wait_action"] = "AUTO_WAIT"
    cfg["max_flood_wait_seconds"] = 120
    return {
        "success": True,
        "data": cfg
    }

@router.post("")
async def update_system_settings(req: SettingsUpdateRequest):
    """Update system settings and apply immediately to cleaner engine."""
    data = req.model_dump()
    # Enforce standard balanced anti-flood parameters and 50 concurrency
    data["max_concurrency"] = 50
    data["min_delay"] = 1.0
    data["max_delay"] = 2.5
    data["flood_wait_action"] = "AUTO_WAIT"
    data["max_flood_wait_seconds"] = 120

    saved = save_settings(data)
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
