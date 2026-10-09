# Eitaa Multi-Account Manager & Cleaner
سامانه جامع مدیریت و پاکسازی گروهی و هوشمند حساب‌های ایتا

سیستم اختصاصی تحت وب جهت اتصال، نگهداری امن نشست‌ها (Sessions) و پاکسازی هوشمند (ترک کانال‌ها و گروه‌ها) تا سقف ۱۰۰+ حساب کاربری به صورت تکی یا همزمان با رعایت کامل محدودیت‌ها و پروتکل‌های امنیتی.

---

## 🎯 قابلیت‌های کلیدی

- **مدیریت ۱۰۰+ حساب کاربری:** تعریف برچسب، شناسه داخلی، دسته‌بندی و فیلتر حساب‌های فعال / نیازمند ورود.
- **نشست‌های ماندگار و رمزنگاری‌شده:** ذخیره کلیدهای احراز هویت با الگوریتم AES-256-GCM؛ بدون نیاز به ورود مجدد در مراجعات بعدی.
- **پاکسازی منعطف:** قابلیت پاکسازی کامل (Leave All) یا انتخاب انتخابی کانال‌ها و سوپرگروه‌ها.
- **موتور هوشمند کنترل Rate-Limit:** زمان‌بندی پویا بین درخواست‌های خروج به منظور جلوگیری از محدودیت اکانت یا مسدودسازی موقت توسط ایتا.
- **عملیات دسته‌ای و ناهمگام (Batch & Async):** اجرای عملیات روی چند حساب به صورت همزمان یا صفی با درصد پیشرفت زنده (WebSocket).
- **قابلیت Pause / Resume:** امکان توقف موقت عملیات و از سرگیری مجدد بدون از دست رفتن وضعیت.
- **گزارش‌گیری و ممیزی تحلیلی:** ثبت کامل آمار قبل و بعد از پاکسازی، تعداد موفق، خطاها و دلایل رد شدن.
- **امنیت سطح بالا:** قفل مادر پنل (Master Password)، ایزوله‌سازی محلی داده‌ها بدون ارسال به هیچ سرور خارجی شخص ثالث.

---

## 🏗️ پشته فنی پیشنهادی (Tech Stack)

| لایه | تکنولوژی انتخابی | دلایل انتخاب |
| :--- | :--- | :--- |
| **Backend & Core** | Python (FastAPI + AsyncIO) | توانایی بالا در پردازش همزمان I/O، صف‌های ناهمگام و سبک بودن |
| **Eitaa Client Layer** | Eitaa Protocol Handler / Async Engine | پیاده‌سازی پروتکل ارتباطی ایتا جهت ارسال کد، تأیید دو مرحله‌ای و متدهای خروج از چت |
| **Security & Crypto** | PyCryptodome (AES-256-GCM + PBKDF2) | رمزنگاری کلیدهای سشن با کلید مشتق‌شده از پسورد اصلی پنل |
| **Database** | SQLite (با قابلیت ارتقا به PostgreSQL) + SQLAlchemy Async | بدون نیاز به کانفیگ سنگین سرور، نگهداری فایل رمزنگاری شده روی دیسک محلی |
| **Frontend UI** | Modern Responsive Web Dashboard (HTML5 / Vanilla JS / CSS Glassmorphism) | رابط کاربری بدون فریمورک سنگین، سبک و بهینه‌سازی‌شده برای دسکتاپ و موبایل |
| **Realtime Sync** | WebSockets | مخابره ثانیه‌ای درصد پیشرفت، وضعیت لاگ‌ها و تغییر وضعیت اکانت‌ها |

---

## 📂 ساختار اسناد و مستندات طراحی

تمامی جزییات سیستم در مستندات تخصصی زیر تدوین شده است:

1. [REQUIREMENTS.md](file:///c:/Users/Mohammad/Desktop/Projects/bale-bot-channel-remover/REQUIREMENTS.md) - مستند نیازمندی‌های عملکردی و غیرعملکردی
2. [ARCHITECTURE.md](file:///c:/Users/Mohammad/Desktop/Projects/bale-bot-channel-remover/ARCHITECTURE.md) - معماری سیستم، جریان احراز هویت و پترن‌های طراحی
3. [CLEANING_ENGINE.md](file:///c:/Users/Mohammad/Desktop/Projects/bale-bot-channel-remover/CLEANING_ENGINE.md) - معماری موتور اجرایی پاکسازی و قوانین ضد مسدودسازی
4. [DATABASE_SCHEMA.md](file:///c:/Users/Mohammad/Desktop/Projects/bale-bot-channel-remover/DATABASE_SCHEMA.md) - طراحی پایگاه داده و مدل ذخیره‌سازی نشست‌ها
5. [API_SPEC.md](file:///c:/Users/Mohammad/Desktop/Projects/bale-bot-channel-remover/API_SPEC.md) - تعریف اندپوینت‌های REST و رویدادهای WebSocket
6. [ROADMAP.md](file:///c:/Users/Mohammad/Desktop/Projects/bale-bot-channel-remover/ROADMAP.md) - برنامه زمان‌بندی و فازبندی پیاده‌سازی کد
