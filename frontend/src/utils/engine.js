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
