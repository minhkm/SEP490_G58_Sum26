export const ENGINE_STATUS = Object.freeze({
  OPERATIONAL: 'Hoạt động',
  STANDBY: 'Dự phòng',
  MAINTENANCE: 'Đang bảo dưỡng',
});

export const ENGINE_TYPE = Object.freeze({
  MAIN: 'Máy chính',
  AUXILIARY: 'Máy phụ',
});

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const STATUS_ALIASES = new Map([
  ['operational', ENGINE_STATUS.OPERATIONAL],
  ['active', ENGINE_STATUS.OPERATIONAL],
  ['hoạt động', ENGINE_STATUS.OPERATIONAL],
  ['standby', ENGINE_STATUS.STANDBY],
  ['inactive', ENGINE_STATUS.STANDBY],
  ['dự phòng', ENGINE_STATUS.STANDBY],
  ['tạm ngưng', ENGINE_STATUS.STANDBY],
  ['under maintenance', ENGINE_STATUS.MAINTENANCE],
  ['maintenance', ENGINE_STATUS.MAINTENANCE],
  ['đang bảo dưỡng', ENGINE_STATUS.MAINTENANCE],
  ['bảo trì', ENGINE_STATUS.MAINTENANCE],
]);

export const normalizeEngineStatus = (status) => (
  STATUS_ALIASES.get(normalizeText(status)) || status || ENGINE_STATUS.OPERATIONAL
);

export const isOperationalEngineStatus = (status) => (
  normalizeEngineStatus(status) === ENGINE_STATUS.OPERATIONAL
);

export const isMainEngine = (engine = {}) => {
  const name = normalizeText(engine.engineName);
  const type = normalizeText(engine.engineType);

  return name.includes('máy chính')
    || name.includes('main engine')
    || type === normalizeText(ENGINE_TYPE.MAIN)
    || type.includes('main engine')
    || type.includes('diesel 2-kỳ')
    || type.includes('diesel 2 kỳ')
    || type.includes('2-stroke');
};

export const engineTypeLabel = (engine) => (
  isMainEngine(engine) ? ENGINE_TYPE.MAIN : ENGINE_TYPE.AUXILIARY
);

export const engineNameLabel = (name) => String(name || '')
  .replace(/^Main Engine\b/i, 'Máy chính')
  .replace(/^Auxiliary Engine\b/i, 'Máy phụ')
  .replace(/^Generator Engine\s*(?:No\.?\s*)?/i, 'Máy phụ số ')
  .trim();

export const engineIdentityKey = (engine) => engineNameLabel(engine?.engineName ?? engine)
  .normalize('NFKC')
  .replace(/\s+/g, ' ')
  .trim()
  .toLocaleLowerCase('vi-VN');

export const findDuplicateEngine = (engines) => {
  const seen = new Set();
  for (const engine of engines || []) {
    const key = engineIdentityKey(engine);
    if (!key) continue;
    if (seen.has(key)) return engine;
    seen.add(key);
  }
  return null;
};

export const ENGINE_STATUS_OPTIONS = [
  { value: ENGINE_STATUS.OPERATIONAL, label: ENGINE_STATUS.OPERATIONAL, color: '#22c55e', textColor: '#16a34a' },
  { value: ENGINE_STATUS.STANDBY, label: ENGINE_STATUS.STANDBY, color: '#3b82f6', textColor: '#2563eb' },
  { value: ENGINE_STATUS.MAINTENANCE, label: ENGINE_STATUS.MAINTENANCE, color: '#f59e0b', textColor: '#b45309' },
];

const PARAMETER_LABELS = {
  'Fuel Oil Pressure': 'Áp suất dầu nhiên liệu (kg/cm²)',
  'Fuel Oil Pressure (kg/cm²)': 'Áp suất dầu nhiên liệu (kg/cm²)',
  'Exhaust Gas Temp XL2 (°C)': 'Nhiệt độ khí xả XL2 (°C)',
  'Cooling Water Temp (°C)': 'Nhiệt độ nước làm mát (°C)',
  'RPM (Main Engine)': 'Vòng quay máy chính (vòng/phút)',
  'Vòng quay máy chính (RPM)': 'Vòng quay máy chính (vòng/phút)',
  'Scavenge Pressure (kg/cm²)': 'Áp suất khí quét (kg/cm²)',
  'Air Pressure (kg/cm²)': 'Áp suất khí nén (kg/cm²)',
  'Start Air Pressure (kg/cm²)': 'Áp suất khí khởi động (kg/cm²)',
  'Lube Oil Temperature (°C)': 'Nhiệt độ dầu bôi trơn (°C)',
  'Exhaust Gas Temp XL3 (°C)': 'Nhiệt độ khí xả XL3 (°C)',
  'Exhaust Gas Temp XL4 (°C)': 'Nhiệt độ khí xả XL4 (°C)',
  'Exhaust Gas Temp XL5 (°C)': 'Nhiệt độ khí xả XL5 (°C)',
  'Exhaust Gas Temp XL6 (°C)': 'Nhiệt độ khí xả XL6 (°C)',
};

export const engineParameterLabel = (name) => PARAMETER_LABELS[name] || name;

const PARAMETER_TYPICAL_MAX_VALUES = {
  'Áp suất dầu nhiên liệu (kg/cm²)': '6 kg/cm²',
  'Nhiệt độ khí xả XL2 (°C)': '420 °C',
  'Nhiệt độ nước làm mát (°C)': '75 °C',
  'Vòng quay máy chính (vòng/phút)': '750 vòng/phút',
  'Áp suất khí quét (kg/cm²)': '6,5 kg/cm²',
  'Áp suất khí nén (kg/cm²)': '2,5 kg/cm²',
  'Áp suất khí khởi động (kg/cm²)': '1,5 kg/cm²',
  'Nhiệt độ dầu bôi trơn (°C)': '80 °C',
  'Nhiệt độ khí xả XL3 (°C)': '420 °C',
  'Nhiệt độ khí xả XL4 (°C)': '420 °C',
  'Nhiệt độ khí xả XL5 (°C)': '420 °C',
  'Nhiệt độ khí xả XL6 (°C)': '420 °C',
};

export const engineParameterTypicalMax = (name) => (
  PARAMETER_TYPICAL_MAX_VALUES[engineParameterLabel(name)] || 'Theo tài liệu kỹ thuật của máy'
);

export const engineParameterDescription = (name) => {
  const label = engineParameterLabel(name);

  if (label === 'Áp suất dầu nhiên liệu (kg/cm²)') {
    return 'Áp suất nhiên liệu cấp vào động cơ; nhập số đọc thực tế trên đồng hồ theo kg/cm².';
  }
  if (/^Nhiệt độ khí xả XL\d+ \(°C\)$/.test(label)) {
    return 'Nhiệt độ khí xả tại xi-lanh tương ứng; giá trị tăng cao có thể phản ánh tải hoặc quá trình cháy bất thường.';
  }
  if (label === 'Nhiệt độ nước làm mát (°C)') {
    return 'Nhiệt độ nước làm mát động cơ; giá trị cao có thể cho thấy hệ thống làm mát không bảo đảm.';
  }
  if (label === 'Vòng quay máy chính (vòng/phút)') {
    return 'Tốc độ quay của trục động cơ trong một phút.';
  }
  if (label === 'Áp suất khí quét (kg/cm²)') {
    return 'Áp suất không khí quét cấp vào xi-lanh trong quá trình vận hành.';
  }
  if (label === 'Áp suất khí nén (kg/cm²)') {
    return 'Áp suất hiện tại của hệ thống khí nén trên tàu.';
  }
  if (label === 'Áp suất khí khởi động (kg/cm²)') {
    return 'Áp suất khí dùng để khởi động động cơ.';
  }
  if (label === 'Nhiệt độ dầu bôi trơn (°C)') {
    return 'Nhiệt độ dầu bôi trơn khi máy đang vận hành.';
  }

  return 'Nhập số đọc thực tế theo đúng đơn vị được ghi trong tên thông số.';
};
