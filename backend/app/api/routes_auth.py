import json
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import get_db
from app.database.models import Account, SessionRecord
from app.core.crypto import encrypt_data
from app.eitaa.client import EitaaClient

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

# In-memory storage for active verification challenges
pending_auths = {}

class SendCodeRequest(BaseModel):
    phone_number: str
    label: Optional[str] = None

class VerifyCodeRequest(BaseModel):
    temp_auth_id: str
    phone_code_hash: str
    code: str
    phone_number: str
    label: Optional[str] = None

@router.post("/send-code")
async def send_code_endpoint(req: SendCodeRequest):
    client = EitaaClient()
    try:
        res = await client.send_code(req.phone_number)
        if not res.get("success"):
            raise HTTPException(status_code=400, detail=res.get("error") or "خطا در ارسال کد به ایتا")

        temp_id = f"auth_{uuid.uuid4().hex[:12]}"
        pending_auths[temp_id] = {
            "phone_formatted": res["phone_formatted"],
            "phone_code_hash": res["phone_code_hash"],
            "label": req.label,
            "imei": client.imei
        }

        return {
            "success": True,
            "data": {
                "temp_auth_id": temp_id,
                "phone_code_hash": res["phone_code_hash"],
                "timeout_seconds": res.get("timeout_seconds", 120),
                "phone": res["phone_formatted"]
            },
            "message": "کد تأیید از طریق ایتا ارسال شد."
        }
    finally:
        await client.close()

@router.post("/verify-code")
async def verify_code_endpoint(req: VerifyCodeRequest, db: AsyncSession = Depends(get_db)):
    auth_ctx = pending_auths.get(req.temp_auth_id)
    imei = auth_ctx.get("imei") if auth_ctx else None

    client = EitaaClient(imei=imei)
    try:
        res = await client.sign_in(
            phone=req.phone_number,
            phone_code_hash=req.phone_code_hash,
            phone_code=req.code
        )

        if not res.get("success"):
            raise HTTPException(status_code=400, detail=res.get("error") or "کد ورود نامعتبر است.")

        phone = res["user"]["phone"]
        masked_phone = f"{phone[:4]}***{phone[-4:]}" if len(phone) >= 8 else phone

        # Generate internal ID: ACC-001, ACC-002, etc.
        count_res = await db.execute(select(Account))
        total_accounts = len(count_res.scalars().all())
        internal_id = f"ACC-{(total_accounts + 1):03d}"

        # Create Account
        account = Account(
            internal_id=internal_id,
            label=req.label or f"اکانت {total_accounts + 1}",
            phone_masked=masked_phone,
            phone_raw=phone,
            first_name=res["user"].get("first_name", "کاربر"),
            last_name=res["user"].get("last_name", ""),
            status="CONNECTED"
        )
        db.add(account)
        await db.flush()

        # Encrypt session data
        session_payload = json.dumps({
            "token": res["token"],
            "imei": res["imei"],
            "phone": phone
        })
        enc_res = encrypt_data(session_payload)

        session_rec = SessionRecord(
            account_id=account.id,
            encrypted_session_data=enc_res["ciphertext"],
            crypto_iv=enc_res["iv"],
            crypto_salt=enc_res["salt"],
            is_valid=True
        )
        db.add(session_rec)
        await db.commit()
        await db.refresh(account)

        # Remove from pending
        pending_auths.pop(req.temp_auth_id, None)

        return {
            "success": True,
            "data": {
                "account_id": account.id,
                "internal_id": account.internal_id,
                "label": account.label,
                "phone_masked": account.phone_masked,
                "status": account.status
            },
            "message": "حساب با موفقیت متصل و نشست آن رمزنگاری شد."
        }
    finally:
        await client.close()
