# คู่มือตั้งค่า Firebase + Cloudinary
## งานแนะแนว โรงเรียนยางวิทยาคาร

---

## ขั้นตอนที่ 1 — สร้าง Firebase Project (ฐานข้อมูล)

1. ไปที่ https://console.firebase.google.com
2. คลิก **Add project** → ตั้งชื่อ เช่น `yangwittaya-guidance`
3. ปิด Google Analytics → คลิก **Create project**
4. เมื่อสร้างเสร็จ คลิก **Firestore Database** (เมนูซ้าย)
5. คลิก **Create database** → เลือก **Start in test mode** → เลือก Region: `asia-southeast1` → **Enable**
6. กลับหน้าหลัก Project → คลิก **⚙️ Project Settings**
7. เลื่อนลงมาที่ **Your apps** → คลิกไอคอน **`</>`** (Web)
8. ตั้งชื่อ App เช่น `guidance-web` → คลิก **Register app**
9. **คัดลอก firebaseConfig** ที่แสดงขึ้นมา มีหน้าตาแบบนี้:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "yangwittaya-guidance.firebaseapp.com",
  projectId: "yangwittaya-guidance",
  storageBucket: "yangwittaya-guidance.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

10. เปิดไฟล์ **`config.js`** แล้ววาง firebaseConfig แทนที่ค่าเดิม

---

## ขั้นตอนที่ 2 — สร้าง Cloudinary Account (เก็บไฟล์ 25 GB)

1. ไปที่ https://cloudinary.com → คลิก **Sign Up Free**
2. กรอกข้อมูล สมัครด้วย Email หรือ Google
3. เข้า Dashboard → หา **Cloud Name** (เช่น `dxxxxxxxx`)
4. ไปที่ **Settings → Upload**
5. เลื่อนลงมาที่ **Upload presets** → คลิก **Add upload preset**
6. ตั้งค่า:
   - **Preset name**: `portfolio_upload`
   - **Signing mode**: `Unsigned` ← สำคัญมาก!
   - **Folder**: `yangwittaya/portfolio`
7. คลิก **Save**
8. เปิดไฟล์ **`config.js`** แก้ไขบรรทัดนี้:

```js
const CLOUDINARY_CLOUD_NAME    = "dxxxxxxxx";       // ← Cloud Name ของคุณ
const CLOUDINARY_UPLOAD_PRESET = "portfolio_upload"; // ← ชื่อ preset ที่สร้าง
```

---

## ขั้นตอนที่ 3 — เปิดใช้งาน

เปิดไฟล์ `index.html` ในเบราว์เซอร์ได้เลย!

- ข้อมูลจะถูกเก็บใน **Firebase Firestore** อัตโนมัติ
- ไฟล์ Portfolio จะถูกอัพโหลดขึ้น **Cloudinary 25 GB**
- ใช้งานได้บน PC, มือถือ ทุกเครื่อง

---

## สรุปไฟล์ในโปรเจกต์

| ไฟล์ | หน้าที่ |
|---|---|
| `config.js` | ตั้งค่า Firebase + Cloudinary (แก้ไขที่นี่) |
| `index.html` | หน้าหลัก Dashboard |
| `scholarships.html` | ทุนการศึกษา |
| `students.html` | ทะเบียนนักเรียน |
| `portfolio.html` | อัพโหลดแฟ้มผลงาน |
| `tracking.html` | ติดตามการสมัครเรียน |
| `style.css` | รูปแบบหน้าเว็บ |

---

## หมายเหตุ

- **Firestore test mode** หมดอายุ 30 วัน → ไปแก้ Rules ใน Firebase Console ก่อนหมดอายุ
- **Cloudinary Free**: 25 GB Storage, 25 GB Bandwidth/เดือน เพียงพอสำหรับการใช้งานของโรงเรียน
- ถ้ายังไม่ได้ตั้งค่า ระบบจะใช้ **Demo Mode** แสดงข้อมูลตัวอย่างให้ทดลองดูก่อน
