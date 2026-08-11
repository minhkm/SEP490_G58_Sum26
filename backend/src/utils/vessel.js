const SHIP_STATUS = Object.freeze({
  OPERATIONAL: 'Hoạt động',
  MAINTENANCE: 'Bảo trì',
  INACTIVE: 'Ngừng hoạt động',
  WORKING: 'Đang làm việc',
});

const STATUS_ALIASES = new Map([
  ['active', SHIP_STATUS.OPERATIONAL],
  ['hoạt động', SHIP_STATUS.OPERATIONAL],
  ['maintenance', SHIP_STATUS.MAINTENANCE],
  ['bảo trì', SHIP_STATUS.MAINTENANCE],
  ['inactive', SHIP_STATUS.INACTIVE],
  ['ngừng hoạt động', SHIP_STATUS.INACTIVE],
  ['working', SHIP_STATUS.WORKING],
  ['đang làm việc', SHIP_STATUS.WORKING],
]);

const normalizeShipStatus = (status, fallback = SHIP_STATUS.OPERATIONAL) => (
  STATUS_ALIASES.get(String(status || '').trim().toLowerCase()) || fallback
);

const normalizeCargoHoldName = (name) => String(name || '')
  .replace(/^Hold\s*(?:No\.?\s*)?/i, 'Khoang hàng số ')
  .trim();

const EQUIPMENT_NAMES = new Map([
  ['Fixed Foam Firefighting System', 'Hệ thống chữa cháy bằng bọt cố định'],
  ['Boiler', 'Nồi hơi'],
  ['Oil Purifier', 'Máy lọc dầu'],
  ['Marine Radar', 'Ra-đa hàng hải'],
  ['Gyro Compass', 'La bàn điện'],
  ['Anchor Windlass', 'Mỏ neo và máy tời neo'],
  ['Mooring Lines', 'Dây buộc tàu'],
  ['Hydraulic Hatch Covers', 'Nắp hầm hàng thủy lực'],
]);

const normalizeEquipmentName = (name) => {
  const value = String(name || '').trim();
  if (EQUIPMENT_NAMES.has(value)) return EQUIPMENT_NAMES.get(value);
  return value
    .replace(/^Radar hàng hải$/i, 'Ra-đa hàng hải')
    .replace(/\s*\((?:Foam|Boiler|Purifier|Gyro Compass|Windlass|Mooring lines|Hatch covers)\)\s*/gi, '')
    .replace(/\s*&\s*/g, ' và ')
    .trim();
};

const EQUIPMENT_TYPES = new Map([
  ['Life-saving Equipment', 'Thiết bị cứu sinh'],
  ['Firefighting Equipment', 'Thiết bị chữa cháy'],
  ['Repair Tools', 'Dụng cụ sửa chữa'],
  ['Navigation Equipment', 'Thiết bị hàng hải'],
  ['Communication Equipment', 'Thiết bị liên lạc'],
  ['Medical Supplies', 'Vật tư y tế'],
  ['Other', 'Khác'],
]);

const normalizeEquipmentType = (type, fallback = 'Khác') => EQUIPMENT_TYPES.get(type) || type || fallback;

const EQUIPMENT_LOCATIONS = new Map([
  ['Deck', 'Boong'],
  ['Engine Room', 'Buồng máy'],
  ['Bridge', 'Buồng lái'],
]);

const normalizeEquipmentLocation = (location) => EQUIPMENT_LOCATIONS.get(location) || location || '';

const normalizeEquipmentIdentityPart = (value) => String(value || '')
  .normalize('NFKC')
  .replace(/\s+/g, ' ')
  .trim()
  .toLocaleLowerCase('vi-VN');

const equipmentIdentityKey = (equipment, includeType = true) => {
  const name = normalizeEquipmentIdentityPart(
    normalizeEquipmentName(equipment?.equipmentName ?? equipment?.name),
  );
  const type = includeType
    ? normalizeEquipmentIdentityPart(normalizeEquipmentType(
      equipment?.equipmentType ?? equipment?.type,
    ))
    : '';
  return includeType ? `${name}::${type}` : name;
};

const findDuplicateEquipment = (equipmentList, includeType = true) => {
  const seen = new Set();
  for (const equipment of equipmentList || []) {
    const key = equipmentIdentityKey(equipment, includeType);
    if (!key || key === '::') continue;
    if (seen.has(key)) return equipment;
    seen.add(key);
  }
  return null;
};

const NO_EXPIRY_VALUES = new Set([
  '',
  'không có hạn',
  'khong co han',
  'không có hạn sử dụng',
  'khong co han su dung',
  'không hạn sử dụng',
  'khong han su dung',
]);

const isValidIsoDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
};

// Chuẩn hóa hạn sử dụng về YYYY-MM-DD. Giá trị null nghĩa là không có hạn;
// undefined nghĩa là dữ liệu đầu vào không hợp lệ.
const normalizeEquipmentExpiryDate = (value) => {
  if (value == null) return null;
  const text = String(value).trim();
  if (NO_EXPIRY_VALUES.has(text.toLocaleLowerCase('vi-VN'))) return null;
  if (isValidIsoDate(text)) return text;

  // Tương thích dữ liệu cũ MM/YYYY: quy về ngày cuối tháng.
  const legacy = /^(0[1-9]|1[0-2])\/(\d{4})$/.exec(text);
  if (legacy) {
    const month = Number(legacy[1]);
    const year = Number(legacy[2]);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }

  return undefined;
};

const currentDateKey = (now = new Date()) => [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, '0'),
  String(now.getDate()).padStart(2, '0'),
].join('-');

const isEquipmentExpired = (expiryNote, now = new Date()) => {
  const expiryDate = normalizeEquipmentExpiryDate(expiryNote);
  return Boolean(expiryDate && expiryDate <= currentDateKey(now));
};

const isEquipmentExpiryAllowed = (expiryNote, now = new Date()) => {
  const expiryDate = normalizeEquipmentExpiryDate(expiryNote);
  return expiryDate === null || Boolean(expiryDate && expiryDate > currentDateKey(now));
};

module.exports = {
  SHIP_STATUS,
  normalizeShipStatus,
  normalizeCargoHoldName,
  normalizeEquipmentName,
  normalizeEquipmentType,
  normalizeEquipmentLocation,
  equipmentIdentityKey,
  findDuplicateEquipment,
  normalizeEquipmentExpiryDate,
  isEquipmentExpired,
  isEquipmentExpiryAllowed,
};
