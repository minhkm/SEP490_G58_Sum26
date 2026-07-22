/**
 * Script TẠM để dựng file Excel MẪU báo cáo ca trực (boong & máy) từ data thật.
 * Chạy trong thư mục backend: `node report-sample.js`
 * Xuất ra: backend/report-samples/*.xlsx
 * (File này chỉ để xem mẫu, không phải tính năng chính thức.)
 */
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const sequelize = require('./src/configs/database');
const {
  Voyage, Ship, Shift, CrewProfile,
  ShiftLog, DeckLog, DeckLogEntry,
  EngineLog, EngineLogValue, EngineParameter, Engine,
} = require('./src/models');

// 15 cột thông số hàng hải của nhật ký boong
const DECK_FIELDS = [
  ['courseTrue', 'HĐ Thật'], ['courseGyro', 'LBCQ'], ['courseSteer', 'LB Lái'],
  ['gyroError', 'SS LBCQ'], ['courseMagnetic', 'LB Từ'], ['speed', 'Tốc độ'],
  ['rpm', 'RPM'], ['windDirection', 'H.Gió'], ['windForce', 'S.Gió(Bf)'],
  ['weather', 'T.Tiết'], ['barometer', 'Khí áp'], ['seaState', 'Biển'],
  ['visibility', 'Tầm nhìn'], ['airTemp', 'T°KK'], ['seaTemp', 'T°Biển'],
];

const dpart = (v) => (v ? String(v).slice(0, 10) : '');
const tpart = (v) => (v ? String(v).slice(11, 16) : '');
const slotLabel = (s) => `${tpart(s.startTime)}–${tpart(s.endTime)}`;

function styleHeaderRow(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });
}
function border(row) {
  row.eachCell((cell) => {
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    if (!cell.alignment) cell.alignment = { vertical: 'middle' };
  });
}

function titleBlock(ws, voyage, ship, deptLabel, span) {
  ws.mergeCells(1, 1, 1, span);
  ws.getCell('A1').value = `BÁO CÁO NHẬT KÝ TRỰC CA — BỘ PHẬN ${deptLabel.toUpperCase()}`;
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.getCell('A1').alignment = { horizontal: 'center' };
  ws.mergeCells(2, 1, 2, span);
  ws.getCell('A2').value = `Tàu: ${ship?.shipName || '—'}   |   Hải trình: ${voyage.departurePort} → ${voyage.destinationPort}   |   Trạng thái: ${voyage.status}`;
  ws.getCell('A2').alignment = { horizontal: 'center' };
  ws.mergeCells(3, 1, 3, span);
  ws.getCell('A3').value = `Ngày xuất báo cáo: ${new Date().toLocaleString('vi-VN')}`;
  ws.getCell('A3').alignment = { horizontal: 'center' };
  ws.getCell('A3').font = { italic: true, color: { argb: 'FF666666' } };
}

async function buildDeck(wb, voyage, ship, deckShifts) {
  const ws = wb.addWorksheet('Nhật ký trực Boong');
  const header = ['Ngày', 'Khung giờ', 'Vị trí', 'Người trực', 'Giờ', ...DECK_FIELDS.map((f) => f[1]), 'Ghi chú ca'];
  titleBlock(ws, voyage, ship, 'Boong', header.length);
  ws.addRow([]);
  const hRow = ws.addRow(header);
  styleHeaderRow(hRow);

  for (const s of deckShifts) {
    const logs = (s.ShiftLogs || []).filter((l) => l.DeckLog);
    const entries = [];
    logs.forEach((l) => (l.DeckLog.DeckLogEntries || []).forEach((e) => entries.push({ e, note: l.DeckLog.note })));
    entries.sort((a, b) => a.e.hour - b.e.hour);

    if (entries.length === 0) {
      // Ca chưa có nhật ký -> vẫn hiện 1 dòng cho thấy có ca
      border(ws.addRow([dpart(s.startTime), slotLabel(s), s.position || '', s.CrewProfile?.fullName || '', '(chưa ghi nhật ký)']));
      continue;
    }
    entries.forEach((it, idx) => {
      const row = [
        idx === 0 ? dpart(s.startTime) : '',
        idx === 0 ? slotLabel(s) : '',
        idx === 0 ? (s.position || '') : '',
        idx === 0 ? (s.CrewProfile?.fullName || '') : '',
        it.e.hour,
        ...DECK_FIELDS.map((f) => it.e[f[0]] ?? ''),
        idx === 0 ? (it.note || '') : '',
      ];
      border(ws.addRow(row));
    });
  }

  ws.columns.forEach((c, i) => { c.width = i < 4 ? 14 : (i === header.length - 1 ? 30 : 8); });
}

async function buildEngine(wb, voyage, ship, engineShifts) {
  const ws = wb.addWorksheet('Nhật ký trực Máy');
  const header = ['Ngày', 'Khung giờ', 'Người trực', 'Máy', 'Thông số', 'Giá trị', 'Ngưỡng Max', 'Ghi chú ca'];
  titleBlock(ws, voyage, ship, 'Máy', header.length);
  ws.addRow([]);
  const hRow = ws.addRow(header);
  styleHeaderRow(hRow);

  for (const s of engineShifts) {
    const logs = (s.ShiftLogs || []).filter((l) => l.EngineLog);
    if (logs.length === 0) {
      border(ws.addRow([dpart(s.startTime), slotLabel(s), s.CrewProfile?.fullName || '', '(chưa ghi nhật ký)']));
      continue;
    }
    let first = true;
    logs.forEach((l) => {
      const el = l.EngineLog;
      const vals = el.EngineLogValues || [];
      if (vals.length === 0) {
        border(ws.addRow([first ? dpart(s.startTime) : '', first ? slotLabel(s) : '', first ? (s.CrewProfile?.fullName || '') : '', el.Engine?.engineName || '', '(không có thông số)']));
        first = false;
        return;
      }
      vals.forEach((v, idx) => {
        const row = [
          first && idx === 0 ? dpart(s.startTime) : '',
          first && idx === 0 ? slotLabel(s) : '',
          first && idx === 0 ? (s.CrewProfile?.fullName || '') : '',
          idx === 0 ? (el.Engine?.engineName || '') : '',
          v.EngineParameter?.name || '',
          v.value,
          v.EngineParameter?.maxValue ?? '',
          first && idx === 0 ? (el.note || '') : '',
        ];
        border(ws.addRow(row));
      });
      first = false;
    });
  }

  ws.columns.forEach((c, i) => { c.width = [14, 14, 18, 16, 28, 10, 12, 30][i] || 12; });
}

(async () => {
  try {
    // Chọn hải trình có nhiều ShiftLog nhất để mẫu phong phú (không lọc status)
    const voyages = await Voyage.findAll({ include: [Ship] });
    if (voyages.length === 0) throw new Error('Không có hải trình nào.');

    let best = null, bestCount = -1;
    for (const v of voyages) {
      const c = await ShiftLog.count({ include: [{ model: Shift, where: { voyageId: v.id }, required: true }] });
      if (c > bestCount) { bestCount = c; best = v; }
    }
    const voyage = best;
    const ship = voyage.Ship;
    console.log(`Hải trình mẫu: #${voyage.id} ${voyage.departurePort}→${voyage.destinationPort} (${bestCount} shift-log)`);

    const shifts = await Shift.findAll({
      where: { voyageId: voyage.id },
      include: [
        { model: CrewProfile, attributes: ['fullName', 'department', 'position'] },
        {
          model: ShiftLog, required: false, include: [
            { model: DeckLog, include: [DeckLogEntry] },
            { model: EngineLog, include: [{ model: EngineLogValue, include: [EngineParameter] }, Engine] },
          ],
        },
      ],
      order: [['startTime', 'ASC']],
    });

    const deckShifts = shifts.filter((s) => s.CrewProfile?.department === 'Deck');
    const engineShifts = shifts.filter((s) => s.CrewProfile?.department === 'Engine');
    console.log(`Ca boong: ${deckShifts.length} | Ca máy: ${engineShifts.length}`);

    const outDir = path.join(__dirname, 'report-samples');
    fs.mkdirSync(outDir, { recursive: true });

    const wbDeck = new ExcelJS.Workbook();
    await buildDeck(wbDeck, voyage, ship, deckShifts);
    const deckPath = path.join(outDir, 'mau-bao-cao-truc-boong.xlsx');
    await wbDeck.xlsx.writeFile(deckPath);

    const wbEng = new ExcelJS.Workbook();
    await buildEngine(wbEng, voyage, ship, engineShifts);
    const engPath = path.join(outDir, 'mau-bao-cao-truc-may.xlsx');
    await wbEng.xlsx.writeFile(engPath);

    console.log('Đã xuất:');
    console.log(' -', deckPath);
    console.log(' -', engPath);
    process.exit(0);
  } catch (err) {
    console.error('LỖI:', err.message);
    process.exit(1);
  }
})();
