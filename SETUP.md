# CargoLink — מדריך הגדרה מלא

## שלב 1 — Google Cloud Project

1. פתח: https://console.cloud.google.com
2. לחץ על **"Select a project"** → **"New Project"**
3. שם פרויקט: `CargoLink` → לחץ **Create**
4. ודא שהפרויקט החדש נבחר בחלק העליון

---

## שלב 2 — הפעלת APIs

בתוך הפרויקט:

1. לחץ על **"APIs & Services"** → **"Enable APIs and Services"**
2. חפש ואפשר את:
   - `Google Sheets API` → Enable
   - `Google Drive API` → Enable

---

## שלב 3 — יצירת Service Account

1. לחץ על **"APIs & Services"** → **"Credentials"**
2. לחץ **"+ Create Credentials"** → **"Service Account"**
3. שם: `cargolink-service` → לחץ **Create and Continue** → **Done**
4. לחץ על ה-Service Account שנוצר
5. לחץ **"Keys"** → **"Add Key"** → **"Create new key"** → **JSON** → **Create**
6. קובץ JSON יורד אוטומטית — שמור אותו

---

## שלב 4 — Google Form

צור Google Form חדש עם השאלות הבאות **בסדר הזה בדיוק**:

> חשוב: שמות השאלות יכולים להיות בעברית. הסדר הוא הקריטי.

| # | שאלה | סוג |
|---|------|-----|
| 1 | שם מלא | Short answer |
| 2 | יחידה / ארגון | Short answer |
| 3 | מספר טלפון | Short answer |
| 4 | כתובת מייל | Short answer (Email validation) |
| 5 | כיוון הטיסה | Multiple choice: `ישראל → איחוד האמירויות` / `איחוד האמירויות → ישראל` |
| 6 | תאריך טיסה | Date |
| 7 | שעת המראה | Short answer |
| 8 | סוג מטוס | Short answer |
| 9 | שדה יציאה | Short answer |
| 10 | שדה יעד | Short answer |
| 11 | קטגוריית ציוד | Multiple choice: `Technological Equipment` / `Logistics Equipment` / `Toiletries` / `Medical Equipment` / `Personal Equipment` / `Other` |
| 12 | פירוט קטגוריה (אם נבחר אחר) | Short answer |
| 13 | תיאור המטען (באנגלית בלבד) | Paragraph |
| 14 | מספר אריזות | Short answer |
| 15 | מידות אריזה (L × W × H ס"מ) | Short answer |
| 16 | משקל לאריזה (ק"ג) | Short answer |
| 17 | משקל כולל (ק"ג) | Short answer |
| 18 | סוג אריזה | Multiple choice: `קרטון` / `משטח` / `מכולה` / `מזוודה` / `אחר` |
| 19 | האם המטען כולל חומרים מסוכנים? | Multiple choice: `כן` / `לא` |
| 20 | סיווג חומר מסוכן (אם יש) | Short answer |
| 21 | תיאור חומר מסוכן (אם יש) | Short answer |
| 22 | העלאת אישורי DG | File upload |
| 23 | העלאת MSDS / מסמכי בטיחות | File upload |
| 24 | אישור סופי | Checkbox (Required): `אני מאשר כי כל המידע מדויק ונכתב באנגלית` |

**לאחר יצירת הטופס:**
- לחץ **Responses** → **Link to Sheets** → צור גיליון חדש
- שמור את **Sheet ID** מה-URL: `https://docs.google.com/spreadsheets/d/**SHEET_ID**/edit`

---

## שלב 5 — שיתוף ה-Sheet עם ה-Service Account

1. פתח את ה-Google Sheet שנוצר
2. לחץ **Share**
3. הדבק את האימייל של ה-Service Account (נמצא בקובץ JSON שהורדת, שדה `client_email`)
4. הענק הרשאת **Editor**
5. לחץ **Send**

---

## שלב 6 — קובץ .env.local

1. העתק את `.env.local.example` ושנה שם ל-`.env.local`
2. מלא את השדות:

```env
AUTH_SECRET=כל-מחרוזת-אקראית-ארוכה-שתרצה

VIEWER_PASSCODE=הקוד-לצפייה
ADMIN_PASSCODE=הקוד-למנהל

GOOGLE_SHEETS_ID=ה-ID-של-ה-Sheet

GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

**לגבי `GOOGLE_SERVICE_ACCOUNT_JSON`:**
פתח את קובץ ה-JSON שהורדת, בחר הכל (Ctrl+A), העתק, והדבק **על שורה אחת** (ללא שבירות שורה) בתוך הגרשיים.

---

## שלב 7 — הרצה מקומית

```bash
cd C:\ClodeCodeProjects\cargolink
npm run dev
```

פתח: http://localhost:3000

---

## שלב 8 — פריסה ל-Netlify

1. פתח https://netlify.com → Sign up / Login
2. לחץ **"Add new site"** → **"Import an existing project"**
3. חבר GitHub (העלה את הפרויקט ל-GitHub קודם) או **Deploy manually**

**לפריסה ידנית (בלי GitHub):**
```bash
npm run build
```
ואז גרור את תיקיית `.next` לאזור הדרופ ב-Netlify.

**הגדרת Environment Variables ב-Netlify:**
- לחץ על Site → **Site settings** → **Environment variables**
- הוסף את כל המשתנים מהקובץ `.env.local` שלך

---

## מבנה הגיליון (אוטומטי)

| שמות גיליונות | תיאור |
|--------------|-------|
| `Form Responses 1` | נוצר אוטומטית על ידי Google Forms |
| `Flights` | נוצר אוטומטית על ידי המערכת |

**עמודות שהמערכת מוסיפה אוטומטית ל-Form Responses:**
- עמודה Z: Request ID
- עמודה AA: Status
- עמודה AB: Admin Notes
- עמודה AC: Assigned Flight ID

---

## שאלות נפוצות

**שאלה: הבקשות לא נטענות**
→ ודא שה-Service Account מחובר לגיליון עם הרשאת Editor
→ ודא שה-GOOGLE_SHEETS_ID נכון

**שאלה: הטופס מגיש אבל הנתונים לא נכונים**
→ ודא שסדר השאלות בגוגל פורם תואם לטבלה בשלב 4

**שאלה: שגיאה ב-PDF**
→ ודא שיש לפחות מטען אחד מאושר ומשויך לטיסה
