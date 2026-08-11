export const SHIP_STATUS = Object.freeze({
  OPERATIONAL: 'Hoạt động',
  MAINTENANCE: 'Bảo trì',
  INACTIVE: 'Ngừng hoạt động',
  ON_VOYAGE: 'Đang trên hải trình',
});

const SHIP_STATUS_LABELS = {
  Active: SHIP_STATUS.OPERATIONAL,
  Maintenance: SHIP_STATUS.MAINTENANCE,
  Inactive: SHIP_STATUS.INACTIVE,
  OnVoyage: SHIP_STATUS.ON_VOYAGE,
};

export const normalizeShipStatus = (status) => (
  SHIP_STATUS_LABELS[status] || status || SHIP_STATUS.OPERATIONAL
);

export const cargoHoldNameLabel = (name) => String(name || '')
  .replace(/^Hold\s*(?:No\.?\s*)?/i, 'Khoang hàng số ')
  .trim();

const EQUIPMENT_NAMES = {
  'Fixed Foam Firefighting System': 'Hệ thống chữa cháy bằng bọt cố định',
  Boiler: 'Nồi hơi',
  'Oil Purifier': 'Máy lọc dầu',
  'Marine Radar': 'Ra-đa hàng hải',
  'Gyro Compass': 'La bàn điện',
  'Anchor Windlass': 'Mỏ neo và máy tời neo',
  'Mooring Lines': 'Dây buộc tàu',
  'Hydraulic Hatch Covers': 'Nắp hầm hàng thủy lực',
};

export const equipmentNameLabel = (name) => {
  const value = String(name || '').trim();
  if (EQUIPMENT_NAMES[value]) return EQUIPMENT_NAMES[value];
  return value
    .replace(/^Radar hàng hải$/i, 'Ra-đa hàng hải')
    .replace(/\s*\((?:Foam|Boiler|Purifier|Gyro Compass|Windlass|Mooring lines|Hatch covers)\)\s*/gi, '')
    .replace(/\s*&\s*/g, ' và ')
    .trim();
};

const EQUIPMENT_TYPES = {
  'Life-saving Equipment': 'Thiết bị cứu sinh',
  'Firefighting Equipment': 'Thiết bị chữa cháy',
  'Repair Tools': 'Dụng cụ sửa chữa',
  'Navigation Equipment': 'Thiết bị hàng hải',
  'Communication Equipment': 'Thiết bị liên lạc',
  'Medical Supplies': 'Vật tư y tế',
  Other: 'Khác',
};

export const equipmentTypeLabel = (type) => EQUIPMENT_TYPES[type] || type || 'Khác';

const EQUIPMENT_LOCATIONS = {
  Deck: 'Boong',
  'Engine Room': 'Buồng máy',
  Bridge: 'Buồng lái',
};

export const equipmentLocationLabel = (location) => EQUIPMENT_LOCATIONS[location] || location || '';

export const normalizeEquipmentIdentityPart = (value) => String(value || '')
  .normalize('NFKC')
  .replace(/\s+/g, ' ')
  .trim()
  .toLocaleLowerCase('vi-VN');

export const equipmentIdentityKey = (equipment, includeType = true) => {
  const name = normalizeEquipmentIdentityPart(
    equipmentNameLabel(equipment?.equipmentName ?? equipment?.name),
  );
  const type = includeType
    ? normalizeEquipmentIdentityPart(equipmentTypeLabel(
      equipment?.equipmentType ?? equipment?.type,
    ))
    : '';
  return includeType ? `${name}::${type}` : name;
};

export const findDuplicateEquipment = (equipmentList, includeType = true) => {
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

export const normalizeEquipmentExpiryDate = (value) => {
  if (value == null) return null;
  const text = String(value).trim();
  if (NO_EXPIRY_VALUES.has(text.toLocaleLowerCase('vi-VN'))) return null;
  if (isValidIsoDate(text)) return text;

  // Hiển thị được dữ liệu MM/YYYY đã tạo ở các phiên bản trước.
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

export const isEquipmentExpired = (expiryNote, now = new Date()) => {
  const expiryDate = normalizeEquipmentExpiryDate(expiryNote);
  return Boolean(expiryDate && expiryDate <= currentDateKey(now));
};

export const isEquipmentExpiryAllowed = (expiryNote, now = new Date()) => {
  const expiryDate = normalizeEquipmentExpiryDate(expiryNote);
  return expiryDate === null || Boolean(expiryDate && expiryDate > currentDateKey(now));
};

export const formatEquipmentExpiryDate = (expiryNote) => {
  const expiryDate = normalizeEquipmentExpiryDate(expiryNote);
  if (expiryDate === undefined) return String(expiryNote || '');
  if (!expiryDate) return 'Không có hạn sử dụng';
  const [year, month, day] = expiryDate.split('-');
  return `${day}/${month}/${year}`;
};
