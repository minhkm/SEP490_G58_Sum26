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
