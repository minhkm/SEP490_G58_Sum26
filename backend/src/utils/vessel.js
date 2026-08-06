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

module.exports = {
  SHIP_STATUS,
  normalizeShipStatus,
  normalizeCargoHoldName,
  normalizeEquipmentName,
  normalizeEquipmentType,
  normalizeEquipmentLocation,
};
