// =====================================================
//  export.js — ระบบ Export PDF / Excel / Word
//  งานแนะแนว โรงเรียนยางวิทยาคาร
//  Dependencies (โหลดจาก CDN — ใส่ใน HTML ก่อนเรียก):
//    SheetJS  : https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js
//    jsPDF    : https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
//    jsPDF-AutoTable: https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js
// =====================================================

// ── โหลด Font ภาษาไทยสำหรับ jsPDF ──────────────────
// ใช้ print window แทน jsPDF เพื่อรองรับภาษาไทยได้สมบูรณ์

const SCHOOL_NAME = 'โรงเรียนยางวิทยาคาร อ.ศรีขรภูมิ จ.สุรินทร์';
const DEPT_NAME   = 'งานแนะแนว';

// ── Dropdown Export Button ──────────────────────────
/**
 * สร้างปุ่ม Export แบบ dropdown
 * @param {string} containerId - id ของ element ที่จะใส่ปุ่ม
 * @param {object} options - { pdf, excel, word } แต่ละตัวเป็น function callback
 */
function createExportButton(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;display:inline-block';

  const btn = document.createElement('button');
  btn.className = 'btn btn-secondary';
  btn.style.cssText = 'display:flex;align-items:center;gap:.4rem';
  btn.innerHTML = '📥 Export <span style="font-size:.7rem">▼</span>';
  btn.onclick = (e) => {
    e.stopPropagation();
    document.querySelectorAll('.__export-menu').forEach(m => { m.style.display = 'none'; });
    if (menu.style.display === 'block') { menu.style.display = 'none'; return; }
    // คำนวณตำแหน่งจาก button
    const rect = btn.getBoundingClientRect();
    menu.style.top  = (rect.bottom + window.scrollY + 4) + 'px';
    menu.style.left = (rect.right + window.scrollX - 170) + 'px';
    menu.style.display = 'block';
  };

  const menu = document.createElement('div');
  menu.className = '__export-menu';
  menu.style.cssText = `
    display:none; position:absolute; top:0; left:0;
    background:white; border:1.5px solid #e5e7eb; border-radius:10px;
    box-shadow:0 8px 24px rgba(0,0,0,0.15); min-width:170px; z-index:99999;
    overflow:hidden;
  `;
  document.body.appendChild(menu);

  const items = [];
  if (options.excel) items.push({ icon: '📊', label: 'Excel (.xlsx)', fn: options.excel });
  if (options.pdf)   items.push({ icon: '📄', label: 'PDF (.pdf)',    fn: options.pdf   });
  if (options.word)  items.push({ icon: '📝', label: 'Word (.docx)',  fn: options.word  });

  items.forEach(item => {
    const a = document.createElement('button');
    a.style.cssText = 'width:100%;padding:.65rem 1rem;background:none;border:none;text-align:left;font-family:inherit;font-size:.875rem;cursor:pointer;display:flex;align-items:center;gap:.6rem;color:#374151;transition:background .1s';
    a.innerHTML = `<span>${item.icon}</span> ${item.label}`;
    a.onmouseover = () => a.style.background = '#f3f4f6';
    a.onmouseout  = () => a.style.background = 'none';
    a.onclick = (e) => { e.stopPropagation(); menu.style.display = 'none'; item.fn(); };
    menu.appendChild(a);
  });

  document.addEventListener('click', () => { menu.style.display = 'none'; });

  wrap.appendChild(btn);
  container.appendChild(wrap);
}

// ── EXCEL Export ────────────────────────────────────
/**
 * Export ข้อมูลเป็น Excel
 * @param {Array} headers - ['คอลัมน์1', 'คอลัมน์2', ...]
 * @param {Array} rows    - [['ข้อมูล1', 'ข้อมูล2'], ...]
 * @param {string} sheetName
 * @param {string} filename
 */
function exportExcel(headers, rows, sheetName = 'Sheet1', filename = 'export') {
  if (typeof XLSX === 'undefined') {
    alert('กรุณารอโหลด SheetJS ให้เสร็จก่อน');
    return;
  }

  const today = new Date().toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' });

  // แถวหัวเอกสาร
  const titleRows = [
    [SCHOOL_NAME],
    [DEPT_NAME + ' — ' + sheetName],
    ['วันที่พิมพ์: ' + today],
    [], // บรรทัดว่าง
    headers
  ];

  const wsData = [...titleRows, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // กำหนดความกว้างคอลัมน์อัตโนมัติ
  const colWidths = headers.map((h, i) => ({
    wch: Math.max(
      h.length * 2,
      ...rows.map(r => String(r[i] || '').length * 1.5)
    )
  }));
  ws['!cols'] = colWidths;

  // Merge แถวหัว
  ws['!merges'] = [
    { s:{r:0,c:0}, e:{r:0,c:headers.length-1} },
    { s:{r:1,c:0}, e:{r:1,c:headers.length-1} },
    { s:{r:2,c:0}, e:{r:2,c:headers.length-1} },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename + '_' + new Date().toISOString().slice(0,10) + '.xlsx');
}

// ── PDF Export (ใช้ print window รองรับภาษาไทย) ────
/**
 * Export ข้อมูลเป็น PDF โดยใช้ print dialog
 * @param {string} title     - ชื่อรายงาน
 * @param {Array}  headers   - หัวตาราง
 * @param {Array}  rows      - ข้อมูล
 * @param {Array}  colWidths - ความกว้างคอลัมน์ (%) เช่น ['20%','30%','50%']
 */
function exportPDF(title, headers, rows, colWidths = []) {
  const today = new Date().toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' });

  const colStyle = colWidths.length
    ? headers.map((_, i) => `<col style="width:${colWidths[i]||'auto'}">`)
    : '';

  const headerHtml = headers.map(h => `<th>${h}</th>`).join('');
  const rowsHtml   = rows.map((row, idx) =>
    `<tr class="${idx%2===0?'even':'odd'}">` + row.map(c => `<td>${c ?? '-'}</td>`).join('') + '</tr>'
  ).join('');

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Sarabun',sans-serif; font-size:13px; color:#1f2937; padding:20px; }
  .header { text-align:center; margin-bottom:16px; border-bottom:2px solid #1a56a4; padding-bottom:12px; }
  .header h1 { font-size:16px; color:#1a56a4; font-weight:700; }
  .header h2 { font-size:14px; font-weight:600; margin-top:4px; }
  .header p  { font-size:11px; color:#6b7280; margin-top:4px; }
  table { width:100%; border-collapse:collapse; margin-top:8px; }
  col { }
  th { background:#1a56a4; color:white; padding:8px 10px; text-align:left; font-size:12px; font-weight:700; }
  td { padding:7px 10px; font-size:12px; border-bottom:1px solid #e5e7eb; vertical-align:top; }
  tr.even td { background:#f8fafc; }
  tr.odd  td { background:white; }
  .footer { margin-top:16px; font-size:10px; color:#9ca3af; text-align:right; }
  @media print {
    body { padding:10px; }
    @page { margin:15mm; }
  }
</style>
</head>
<body>
<div class="header">
  <h1>${SCHOOL_NAME}</h1>
  <h2>${DEPT_NAME} — ${title}</h2>
  <p>วันที่พิมพ์: ${today} | จำนวน: ${rows.length} รายการ</p>
</div>
<table>
  ${colStyle.length ? '<colgroup>' + colStyle.join('') + '</colgroup>' : ''}
  <thead><tr>${headerHtml}</tr></thead>
  <tbody>${rowsHtml}</tbody>
</table>
<div class="footer">ระบบงานแนะแนว โรงเรียนยางวิทยาคาร</div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.focus(); win.print(); };
}

// ── WORD Export (HTML → .doc ที่ Word เปิดได้) ─────
/**
 * Export ข้อมูลเป็น Word document
 * @param {string} title
 * @param {Array}  headers
 * @param {Array}  rows
 */
function exportWord(title, headers, rows) {
  const today = new Date().toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' });

  const headerHtml = headers.map(h => `<th style="background:#1a56a4;color:white;padding:8px;border:1px solid #ccc;font-size:13px">${h}</th>`).join('');
  const rowsHtml   = rows.map((row, idx) =>
    `<tr style="background:${idx%2===0?'#f8fafc':'white'}">` +
    row.map(c => `<td style="padding:7px 8px;border:1px solid #ddd;font-size:13px">${c ?? '-'}</td>`).join('') +
    '</tr>'
  ).join('');

  const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8">
  <meta name:ProgId content="Word.Document">
  <meta name:Generator content="Microsoft Word 15">
  <title>${title}</title>
  <style>
    body { font-family:'Sarabun',sans-serif; font-size:13pt; margin:2cm; }
    h1 { font-size:16pt; color:#1a56a4; text-align:center; margin-bottom:4pt; }
    h2 { font-size:13pt; text-align:center; margin-bottom:4pt; }
    p.sub { font-size:10pt; color:#6b7280; text-align:center; margin-bottom:16pt; }
    table { width:100%; border-collapse:collapse; }
  </style>
</head>
<body>
  <h1>${SCHOOL_NAME}</h1>
  <h2>${DEPT_NAME} — ${title}</h2>
  <p class="sub">วันที่พิมพ์: ${today} | จำนวน: ${rows.length} รายการ</p>
  <table>
    <thead><tr>${headerHtml}</tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`;

  const blob = new Blob(['﻿' + html], { type: 'application/msword' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = title + '_' + new Date().toISOString().slice(0,10) + '.doc';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Toast Notification ───────────────────────────────
function exportToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;background:#065f46;color:white;padding:.75rem 1.25rem;border-radius:10px;font-size:.9rem;font-weight:600;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.2)';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
