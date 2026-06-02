// =========================================
// Google Apps Script - งานแนะแนว โรงเรียนยางวิทยาคาร
// วิธีใช้: ไปที่ script.google.com → สร้างโปรเจกต์ใหม่ → วางโค้ดนี้
//          จากนั้น Deploy → New deployment → Web app → Anyone can access
// =========================================

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // ← ใส่ ID ของ Google Sheets ที่นี่

const SHEETS = {
  STUDENTS: 'ทะเบียนนักเรียน',
  SCHOLARSHIPS: 'ทุนการศึกษา',
  TRACKING: 'ติดตามการสมัคร',
  PORTFOLIO: 'Portfolio'
};

function doGet(e) {
  const action = e.parameter.action;
  const sheet = e.parameter.sheet;

  try {
    let result;
    if (action === 'getAll') {
      result = getAllData(sheet);
    } else if (action === 'getById') {
      result = getById(sheet, e.parameter.id);
    } else if (action === 'search') {
      result = searchData(sheet, e.parameter.query);
    }
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const { action, sheet, data, id } = body;

  try {
    let result;
    if (action === 'add') {
      result = addRow(sheet, data);
    } else if (action === 'update') {
      result = updateRow(sheet, id, data);
    } else if (action === 'delete') {
      result = deleteRow(sheet, id);
    }
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    initSheet(sheet, sheetName);
  }
  return sheet;
}

function initSheet(sheet, name) {
  const headers = {
    [SHEETS.STUDENTS]: ['ID','รหัสนักเรียน','ชื่อ-นามสกุล','ชั้น','ห้อง','เพศ','วันเกิด','ที่อยู่','เบอร์โทร','ผู้ปกครอง','เบอร์ผู้ปกครอง','GPA','แผนการเรียน','ความสนใจ','วันที่บันทึก'],
    [SHEETS.SCHOLARSHIPS]: ['ID','ชื่อทุน','ประเภท','จำนวนเงิน','คุณสมบัติ','เอกสาร','วันรับสมัคร','วันสิ้นสุด','ช่องทางสมัคร','สถานะ','วันที่บันทึก'],
    [SHEETS.TRACKING]: ['ID','รหัสนักเรียน','ชื่อนักเรียน','สถาบัน','คณะ/สาขา','ประเภทการรับ','รอบ','วันสมัคร','สถานะ','ผล','หมายเหตุ','วันที่อัพเดต'],
    [SHEETS.PORTFOLIO]: ['ID','รหัสนักเรียน','ชื่อนักเรียน','ประเภทไฟล์','ชื่อไฟล์','Google Drive URL','คำอธิบาย','วันที่อัพโหลด']
  };
  if (headers[name]) {
    sheet.getRange(1, 1, 1, headers[name].length).setValues([headers[name]]);
    sheet.setFrozenRows(1);
  }
}

function getAllData(sheetName) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map((row, i) => {
    const obj = { rowIndex: i + 2 };
    headers.forEach((h, j) => obj[h] = row[j]);
    return obj;
  });
}

function getById(sheetName, id) {
  const all = getAllData(sheetName);
  return all.find(r => String(r['ID']) === String(id)) || null;
}

function searchData(sheetName, query) {
  const all = getAllData(sheetName);
  const q = query.toLowerCase();
  return all.filter(row =>
    Object.values(row).some(v => String(v).toLowerCase().includes(q))
  );
}

function addRow(sheetName, data) {
  const sheet = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const lastId = sheet.getLastRow() <= 1 ? 0 : sheet.getRange(sheet.getLastRow(), 1).getValue();
  const newId = (parseInt(lastId) || 0) + 1;
  data['ID'] = newId;
  data['วันที่บันทึก'] = new Date().toLocaleDateString('th-TH');
  data['วันที่อัพเดต'] = new Date().toLocaleDateString('th-TH');
  data['วันที่อัพโหลด'] = new Date().toLocaleDateString('th-TH');
  const row = headers.map(h => data[h] !== undefined ? data[h] : '');
  sheet.appendRow(row);
  return { id: newId };
}

function updateRow(sheetName, id, data) {
  const sheet = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const allData = sheet.getDataRange().getValues();
  const rowIndex = allData.findIndex((r, i) => i > 0 && String(r[0]) === String(id));
  if (rowIndex === -1) throw new Error('ไม่พบข้อมูล ID: ' + id);
  const existingRow = allData[rowIndex];
  headers.forEach((h, j) => {
    if (data[h] !== undefined) existingRow[j] = data[h];
  });
  sheet.getRange(rowIndex + 1, 1, 1, headers.length).setValues([existingRow]);
  return { updated: true };
}

function deleteRow(sheetName, id) {
  const sheet = getSheet(sheetName);
  const allData = sheet.getDataRange().getValues();
  const rowIndex = allData.findIndex((r, i) => i > 0 && String(r[0]) === String(id));
  if (rowIndex === -1) throw new Error('ไม่พบข้อมูล ID: ' + id);
  sheet.deleteRow(rowIndex + 1);
  return { deleted: true };
}
