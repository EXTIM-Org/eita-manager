# مستند مشخصات رابط‌های برنامه‌نویسی (API_SPEC.md)

این سند کلیه اندپوینت‌های RESTful و ساختار پیام‌های پروتکل WebSocket را برای ارتباط بین پنل کاربری (Frontend) و سرور پردازشی (Backend) تعریف می‌کند.

---

## ۱. قرارداد عمومی پاسخ‌ها (General Response Schema)

تمامی پاسخ‌های REST از فرمت استاندارد زیر تبعیت می‌کنند:

```json
{
  "success": true,
  "data": { ... },
  "message": "عملیات با موفقیت انجام شد",
  "error": null,
  "timestamp": "2026-10-08T14:35:00.000Z"
}
```

---

## ۲. سرویس احراز هویت و مدیریت حساب‌ها (`/api/v1/accounts` & `/api/v1/auth`)

### ۲.۱. درخواست ارسال کد ورود به ایتا
- **متد:** `POST /api/v1/auth/send-code`
- **بدنه درخواست:**
```json
{
  "phone_number": "09123456789",
  "label": "اکانت پشتیبانی ۱"
}
```
- **پاسخ:**
```json
{
  "success": true,
  "data": {
    "temp_auth_id": "auth_tmp_8731ad89",
    "phone_code_hash": "e98b7c6a...",
    "timeout_seconds": 120
  },
  "message": "کد تأیید با موفقیت از طریق ایتا ارسال شد."
}
```

### ۲.۲. تأیید کد و ثبت سشن
- **متد:** `POST /api/v1/auth/verify-code`
- **بدنه درخواست:**
```json
{
  "temp_auth_id": "auth_tmp_8731ad89",
  "phone_code_hash": "e98b7c6a...",
  "code": "48291",
  "password_2fa": null
}
```
- **پاسخ:**
```json
{
  "success": true,
  "data": {
    "account_id": 1,
    "internal_id": "ACC-001",
    "first_name": "علی",
    "last_name": "محمدی",
    "status": "CONNECTED"
  },
  "message": "حساب کاربری با موفقیت متصل و نشست آن رمزنگاری شد."
}
```

### ۲.۳. دریافت لیست حساب‌ها با فیلتر و جستجو
- **متد:** `GET /api/v1/accounts`
- **پارامترهای Query:**
  - `status`: `all` | `connected` | `needs_reauth` | `busy`
  - `search`: جستجو در برچسب، شماره یا نام
  - `page`: شماره صفحه (پیش‌فرض ۱)
  - `limit`: تعداد در هر صفحه (پیش‌فرض ۲۰)
- **پاسخ:**
```json
{
  "success": true,
  "data": {
    "total": 100,
    "active_count": 96,
    "needs_reauth_count": 4,
    "items": [
      {
        "id": 1,
        "internal_id": "ACC-001",
        "label": "اکانت پشتیبانی ۱",
        "phone_masked": "0912***6789",
        "status": "CONNECTED",
        "total_channels": 45,
        "total_groups": 12,
        "last_cleaned_at": "2026-10-07T10:00:00Z"
      }
    ]
  }
}
```

### ۲.۴. حذف یک حساب یا خروج نشست
- **متد:** `DELETE /api/v1/accounts/{account_id}`
- **پاسخ:**
```json
{
  "success": true,
  "data": { "account_id": 1 },
  "message": "نشست با موفقیت باطل شده و حساب از سیستم حذف شد."
}
```

---

## ۳. سرویس کاوش و پاکسازی چت‌ها (`/api/v1/clean`)

### ۳.۱. اسکن و واکشی لیست چت‌های یک حساب
- **متد:** `GET /api/v1/accounts/{account_id}/dialogs`
- **پاسخ:**
```json
{
  "success": true,
  "data": {
    "channels_count": 35,
    "groups_count": 10,
    "items": [
      {
        "peer_id": "10023456",
        "type": "channel",
        "title": "اخبار فناوری",
        "members_count": 12500,
        "is_creator": false,
        "is_admin": false
      }
    ]
  }
}
```

### ۳.۲. استارت عملیات پاکسازی (تکی یا گروهی)
- **متد:** `POST /api/v1/clean/start`
- **بدنه درخواست:**
```json
{
  "account_ids": [1, 2, 5, 8],
  "mode": "FULL_CLEAN", // یا "SELECTIVE"
  "leave_channels": true,
  "leave_groups": true,
  "skip_owned": true, // صرف‌نظر از کانال‌های تحت مالکیت کاربر
  "selected_peer_ids": [] // در حالت SELECTIVE پر می‌شود
}
```
- **پاسخ:**
```json
{
  "success": true,
  "data": {
    "job_ids": ["job_89a1", "job_89a2", "job_89a3", "job_89a4"],
    "queued_accounts": 4,
    "estimated_duration_minutes": 15
  },
  "message": "تسک‌های پاکسازی در صف پردازش قرار گرفتند."
}
```

### ۳.۳. توقف موقت / ادامه / لغو عملیات
- **متد:** `POST /api/v1/clean/{job_id}/action`
- **بدنه درخواست:**
```json
{
  "action": "PAUSE" // "RESUME" | "ABORT"
}
```

---

## ۴. ارتباط بلادرنگ (WebSocket Events `/ws/live`)

ارتباط کلاینت با سرور از طریق مسیر `/ws/live` برقرار شده و رویدادهای زیر را به شکل دوطرفه مخابره می‌کند:

### ۴.۱. رویداد پیشرفت پاکسازی (`JOB_PROGRESS`)
```json
{
  "event": "JOB_PROGRESS",
  "payload": {
    "job_id": "job_89a1",
    "account_id": 1,
    "internal_id": "ACC-001",
    "current_step": 14,
    "total_steps": 47,
    "percentage": 29.7,
    "current_peer_title": "کانال آموزشی ۳",
    "status": "LEFT_SUCCESS"
  }
}
```

### ۴.۲. رویداد مواجهه با محدودیت (`FLOOD_WAIT_WARNING`)
```json
{
  "event": "FLOOD_WAIT_WARNING",
  "payload": {
    "job_id": "job_89a1",
    "account_id": 1,
    "wait_seconds": 38,
    "resumes_at": "2026-10-08T14:40:10Z"
  }
}
```

### ۴.۳. رویداد اتمام کار و گزارش نهایی (`JOB_COMPLETED`)
```json
{
  "event": "JOB_COMPLETED",
  "payload": {
    "job_id": "job_89a1",
    "account_id": 1,
    "total_initial": 47,
    "left_success": 46,
    "failed": 1,
    "remaining_verified": 1,
    "duration_seconds": 162
  }
}
```
