// =====================================================
//  auth.js — ระบบ Authentication + Role-Based Access
//  งานแนะแนว โรงเรียนยางวิทยาคาร
// =====================================================

// ── ROLE DEFINITIONS ─────────────────────────────────
const ROLES = {
  ADMIN:   'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
  EXEC:    'exec'
};

const ROLE_LABELS = {
  admin:   '👑 Admin',
  teacher: '👨‍🏫 ครู',
  student: '👨‍🎓 นักเรียน',
  exec:    '🏫 ผู้บริหาร'
};

// ── PERMISSION MAP ────────────────────────────────────
// true = ทำได้, 'read' = ดูอย่างเดียว, 'own' = เฉพาะตัวเอง, false = ไม่มีสิทธิ์
const PERMISSIONS = {
  // หน้าหลัก
  'news.view':      { admin: true,  teacher: true,   student: true,   exec: true  },
  'news.edit':      { admin: true,  teacher: false,  student: false,  exec: false },

  // ทุนการศึกษา
  'scholarship.view':   { admin: true, teacher: true,   student: true,  exec: true  },
  'scholarship.edit':   { admin: true, teacher: false,  student: false, exec: false },

  // ทะเบียนนักเรียน
  'student.viewAll':    { admin: true, teacher: 'read', student: false,  exec: 'read' },
  'student.viewOwn':    { admin: true, teacher: true,   student: 'own',  exec: false },
  'student.edit':       { admin: true, teacher: false,  student: false,  exec: false },

  // Portfolio
  'portfolio.viewAll':  { admin: true, teacher: true,   student: false,  exec: false },
  'portfolio.upload':   { admin: true, teacher: false,  student: 'own',  exec: false },
  'portfolio.delete':   { admin: true, teacher: false,  student: false,  exec: false },

  // ติดตามการสมัคร
  'tracking.viewAll':   { admin: true, teacher: 'read', student: false,  exec: 'read' },
  'tracking.editOwn':   { admin: true, teacher: false,  student: 'own',  exec: false },
  'tracking.delete':    { admin: true, teacher: false,  student: false,  exec: false },

  // จัดการระบบ
  'system.manageUsers': { admin: true, teacher: false,  student: false,  exec: false },
  'system.viewReport':  { admin: true, teacher: false,  student: false,  exec: true  },
  'system.settings':    { admin: true, teacher: false,  student: false,  exec: false },
};

// ── STATE ─────────────────────────────────────────────
let currentUser  = null;
let currentRole  = null;
let currentProfile = null;

// ── INIT AUTH ─────────────────────────────────────────
function initAuth(options = {}) {
  const {
    requireAuth = true,
    allowedRoles = null,   // null = ทุก role เข้าได้
    onReady = null
  } = options;

  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      if (requireAuth) {
        window.location.href = 'login.html';
      }
      return;
    }

    currentUser = user;

    // ดึง profile + role จาก Firestore
    try {
      const doc = await db.collection('users').doc(user.uid).get();
      if (doc.exists) {
        currentProfile = doc.data();
        currentRole    = currentProfile.role || 'student';

        // ตรวจสอบสถานะการอนุมัติ (ไม่ใช้กับ admin)
        if (currentRole !== 'admin') {
          const status = currentProfile.status;
          if (status === 'pending') {
            await firebase.auth().signOut();
            window.location.href = 'login.html?status=pending';
            return;
          }
          if (status === 'suspended') {
            await firebase.auth().signOut();
            window.location.href = 'login.html?status=suspended';
            return;
          }
        }
      } else {
        // ถ้าไม่มีใน Firestore ให้เป็น student
        currentRole = 'student';
        currentProfile = { email: user.email, role: 'student', name: user.email };
      }
    } catch(e) {
      console.error('ดึง profile ไม่ได้:', e);
      currentRole = 'student';
    }

    // ตรวจสอบ role ที่อนุญาต
    if (allowedRoles && !allowedRoles.includes(currentRole)) {
      window.location.href = 'index.html';
      return;
    }

    // อัพเดต UI Navbar
    updateNavbar();

    // ซ่อน/แสดง element ตาม role
    applyRoleUI();

    if (onReady) onReady(currentUser, currentRole, currentProfile);
  });
}

// ── CHECK PERMISSION ──────────────────────────────────
function can(permission) {
  if (!currentRole) return false;
  const perm = PERMISSIONS[permission];
  if (!perm) return false;
  return perm[currentRole] === true;
}

function canRead(permission) {
  if (!currentRole) return false;
  const perm = PERMISSIONS[permission];
  if (!perm) return false;
  return perm[currentRole] === true || perm[currentRole] === 'read' || perm[currentRole] === 'own';
}

// ── APPLY ROLE UI ─────────────────────────────────────
// ใช้ data attributes บน HTML elements:
// data-role="admin"              → แสดงเฉพาะ admin
// data-role="admin,teacher"      → แสดงเฉพาะ admin และ teacher
// data-hide-role="student"       → ซ่อนสำหรับ student
// data-perm="scholarship.edit"   → แสดงถ้ามีสิทธิ์ทำ
// data-perm-read="student.viewAll" → แสดงถ้ามีสิทธิ์อ่าน
function applyRoleUI() {
  if (!currentRole) return;

  // data-role: แสดงเฉพาะ role ที่ระบุ
  document.querySelectorAll('[data-role]').forEach(el => {
    const roles = el.getAttribute('data-role').split(',').map(r => r.trim());
    el.style.display = roles.includes(currentRole) ? '' : 'none';
  });

  // data-hide-role: ซ่อนสำหรับ role ที่ระบุ
  document.querySelectorAll('[data-hide-role]').forEach(el => {
    const roles = el.getAttribute('data-hide-role').split(',').map(r => r.trim());
    if (roles.includes(currentRole)) el.style.display = 'none';
  });

  // data-perm: แสดงถ้า can()
  document.querySelectorAll('[data-perm]').forEach(el => {
    const perm = el.getAttribute('data-perm');
    el.style.display = can(perm) ? '' : 'none';
  });

  // data-perm-read: แสดงถ้า canRead()
  document.querySelectorAll('[data-perm-read]').forEach(el => {
    const perm = el.getAttribute('data-perm-read');
    el.style.display = canRead(perm) ? '' : 'none';
  });

  // disable buttons ถ้าเป็น read-only mode
  document.querySelectorAll('[data-readonly-role]').forEach(el => {
    const roles = el.getAttribute('data-readonly-role').split(',').map(r => r.trim());
    if (roles.includes(currentRole)) {
      el.querySelectorAll('button, input, select, textarea').forEach(inp => {
        inp.disabled = true;
      });
    }
  });
}

// ── UPDATE NAVBAR ─────────────────────────────────────
function updateNavbar() {
  const userInfoEl = document.getElementById('navUserInfo');
  if (userInfoEl && currentProfile) {
    const name = currentProfile.name || currentUser.email;
    const roleLabel = ROLE_LABELS[currentRole] || currentRole;
    userInfoEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:0.5rem">
        <div style="background:rgba(255,255,255,0.2);border-radius:8px;padding:4px 10px;font-size:0.8rem">
          <span style="opacity:.8">${roleLabel}</span>
          <span style="margin:0 4px;opacity:.4">|</span>
          <span style="font-weight:600">${name}</span>
        </div>
        <button onclick="logout()" style="background:rgba(255,255,255,0.15);border:none;color:white;border-radius:8px;padding:4px 10px;cursor:pointer;font-size:0.8rem;font-family:inherit">ออกจากระบบ</button>
      </div>`;
  }
}

// ── LOGOUT ────────────────────────────────────────────
async function logout() {
  if (!confirm('ต้องการออกจากระบบ?')) return;
  await firebase.auth().signOut();
  window.location.href = 'login.html';
}

// ── GETTERS ───────────────────────────────────────────
function getRole()    { return currentRole; }
function getUser()    { return currentUser; }
function getProfile() { return currentProfile; }
function isAdmin()    { return currentRole === ROLES.ADMIN; }
function isTeacher()  { return currentRole === ROLES.TEACHER; }
function isStudent()  { return currentRole === ROLES.STUDENT; }
function isExec()     { return currentRole === ROLES.EXEC; }

// ── SHOW READ-ONLY BANNER ─────────────────────────────
function showReadOnlyBanner(message = 'คุณมีสิทธิ์ดูข้อมูลอย่างเดียว ไม่สามารถแก้ไขได้') {
  const banner = document.createElement('div');
  banner.className = 'alert alert-info';
  banner.style.cssText = 'margin-bottom:1rem;display:flex;align-items:center;gap:.5rem';
  banner.innerHTML = `<span>👁️</span> ${message}`;
  const main = document.querySelector('.main-content');
  if (main) main.insertBefore(banner, main.firstChild);
}
