// =====================================================
//  งานแนะแนว โรงเรียนยางวิทยาคาร
//  config.js — Firebase Firestore + Cloudinary
//  ดูคู่มือการตั้งค่าที่ไฟล์ SETUP.md
// =====================================================

// ── 1. FIREBASE CONFIG ──────────────────────────────
// วางค่าจาก Firebase Console → Project Settings → Your apps
const firebaseConfig = {
  apiKey:            "AIzaSyDf0M6evpJeWDgyw3BzgsaXPo4RvpbuMmw",
  authDomain:        "yangwittaya-guidance.firebaseapp.com",
  projectId:         "yangwittaya-guidance",
  storageBucket:     "yangwittaya-guidance.firebasestorage.app",
  messagingSenderId: "951333355835",
  appId:             "1:951333355835:web:74b9ca9a3841635e15f71e",
  measurementId:     "G-2PQDX8VZ0R"
};

// ── 2. CLOUDINARY CONFIG ────────────────────────────
// วางค่าจาก Cloudinary Dashboard
const CLOUDINARY_CLOUD_NAME    = "demouhbhu";        // Cloud name จาก Dashboard
const CLOUDINARY_UPLOAD_PRESET = "portfolio_upload"; // Unsigned preset ที่สร้างแล้ว

// =====================================================
//  ไม่ต้องแก้ไขด้านล่างนี้
// =====================================================

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ── COLLECTION NAMES ─────────────────────────────────
const COL = {
  STUDENTS:     'students',
  SCHOLARSHIPS: 'scholarships',
  TRACKING:     'tracking',
  PORTFOLIO:    'portfolio'
};

// ── FIRESTORE HELPERS ────────────────────────────────

/** ดึงข้อมูลทั้งหมด */
async function dbGetAll(collection) {
  const snap = await db.collection(collection).orderBy('createdAt', 'desc').get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/** ดึงด้วย ID */
async function dbGetById(collection, id) {
  const doc = await db.collection(collection).doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

/** ค้นหา (client-side filter) */
async function dbSearch(collection, query) {
  const all = await dbGetAll(collection);
  const q = query.toLowerCase();
  return all.filter(row =>
    Object.values(row).some(v => String(v).toLowerCase().includes(q))
  );
}

/** เพิ่มข้อมูลใหม่ */
async function dbAdd(collection, data) {
  data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
  data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
  const ref = await db.collection(collection).add(data);
  return { id: ref.id };
}

/** อัพเดตข้อมูล */
async function dbUpdate(collection, id, data) {
  data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
  await db.collection(collection).doc(id).update(data);
  return { updated: true };
}

/** ลบข้อมูล */
async function dbDelete(collection, id) {
  await db.collection(collection).doc(id).delete();
  return { deleted: true };
}

// ── CLOUDINARY UPLOAD ────────────────────────────────

/**
 * อัพโหลดไฟล์ขึ้น Cloudinary
 * @param {File} file - ไฟล์ที่ต้องการอัพโหลด
 * @param {string} folder - โฟลเดอร์ใน Cloudinary เช่น "portfolio/67001"
 * @param {function} onProgress - callback (percent) สำหรับแสดง progress
 * @returns {Promise<{url, publicId, name, size, type}>}
 */
async function uploadToCloudinary(file, folder = 'portfolio', onProgress = null) {
  if (!CLOUDINARY_CLOUD_NAME || CLOUDINARY_CLOUD_NAME === 'YOUR_CLOUD_NAME') {
    throw new Error('กรุณาตั้งค่า CLOUDINARY_CLOUD_NAME ใน config.js');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', folder);
  formData.append('resource_type', 'auto');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`);

    if (onProgress) {
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        const res = JSON.parse(xhr.responseText);
        resolve({
          url:      res.secure_url,
          publicId: res.public_id,
          name:     file.name,
          size:     formatFileSize(file.size),
          type:     file.type,
          format:   res.format
        });
      } else {
        reject(new Error('อัพโหลดไม่สำเร็จ: ' + xhr.responseText));
      }
    };

    xhr.onerror = () => reject(new Error('เกิดข้อผิดพลาดในการเชื่อมต่อ'));
    xhr.send(formData);
  });
}

/** แสดงขนาดไฟล์ */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/** ตรวจสอบว่าตั้งค่า Firebase แล้วหรือยัง */
function isConfigured() {
  return firebaseConfig.apiKey !== 'YOUR_API_KEY';
}

// ── DEMO DATA MODE ───────────────────────────────────
// ถ้ายังไม่ได้ตั้งค่า Firebase → ใช้ in-memory demo data
let _demoStore = {
  students:     [],
  scholarships: [],
  tracking:     [],
  portfolio:    []
};

// Wrap: ถ้าตั้งค่าแล้วใช้ Firestore, ถ้ายังไม่ตั้งค่าใช้ demo store
async function getData(col) {
  if (!isConfigured()) return _demoStore[col] || [];
  return dbGetAll(col);
}

async function addData(col, data) {
  if (!isConfigured()) {
    const id = 'demo_' + Date.now();
    _demoStore[col] = _demoStore[col] || [];
    _demoStore[col].unshift({ id, ...data, createdAt: new Date() });
    return { id };
  }
  return dbAdd(col, data);
}

async function updateData(col, id, data) {
  if (!isConfigured()) {
    const idx = (_demoStore[col]||[]).findIndex(x => x.id === id);
    if (idx >= 0) _demoStore[col][idx] = { ..._demoStore[col][idx], ...data };
    return { updated: true };
  }
  return dbUpdate(col, id, data);
}

async function deleteData(col, id) {
  if (!isConfigured()) {
    _demoStore[col] = (_demoStore[col]||[]).filter(x => x.id !== id);
    return { deleted: true };
  }
  return dbDelete(col, id);
}
