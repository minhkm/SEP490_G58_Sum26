const normalizeRole = (role) => String(role || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const isEngineLogRole = (role) => {
  const normalized = normalizeRole(role);
  return normalized === 'enginecrew'
    || normalized.includes('engine crew')
    || normalized.includes('tho may');
};

const isDeckLogRole = (role) => {
  const normalized = normalizeRole(role);
  if (isEngineLogRole(role)) return false;

  return normalized === 'sailor'
    || normalized === 'crew'
    || normalized.includes('thuy thu')
    || normalized.includes('(crew)');
};

const canonicalVoyageRole = (role) => {
  const normalized = normalizeRole(role);

  if (normalized.includes('captain') || normalized.includes('master') || normalized.includes('thuyen truong')) {
    return 'Master';
  }
  if (normalized.includes('chief officer') || normalized.includes('dai pho')) {
    return 'ChiefOfficer';
  }
  if (normalized.includes('chief engineer') || normalized.includes('may truong')
      || normalized.includes('engine officer') || normalized.includes('si quan may')) {
    return 'EngineOfficer';
  }
  if (normalized.includes('deck officer') || normalized.includes('si quan boong')) {
    return 'DeckOfficer';
  }
  if (isEngineLogRole(role)) return 'EngineCrew';
  if (isDeckLogRole(role)) return 'Sailor';
  if (normalized === 'admin') return 'Admin';
  return role || '';
};

const isEngineOfficerRole = (role) => canonicalVoyageRole(role) === 'EngineOfficer';
const isShiftOfficerRole = (role) => ['DeckOfficer', 'EngineOfficer'].includes(canonicalVoyageRole(role));

const isLogRoleForDuty = (role, duty) => (
  duty === 'Engine' ? isEngineLogRole(role) : isDeckLogRole(role)
);

const voyageRoleDepartment = (role) => {
  const canonicalRole = canonicalVoyageRole(role);
  if (['EngineOfficer', 'EngineCrew'].includes(canonicalRole)) return 'Engine';
  if (['Master', 'ChiefOfficer', 'DeckOfficer', 'Sailor'].includes(canonicalRole)) return 'Deck';
  return null;
};

const voyageRoleLabel = (role) => {
  const normalized = normalizeRole(role);
  if (normalized.includes('captain') || normalized.includes('master') || normalized.includes('thuyen truong')) return 'Thuyền trưởng';
  if (normalized.includes('chief officer') || normalized.includes('dai pho')) return 'Đại phó';
  if (normalized.includes('deck officer') || normalized.includes('si quan boong')) return 'Sĩ quan boong';
  if (normalized.includes('chief engineer') || normalized.includes('may truong')) return 'Máy trưởng';
  if (isEngineLogRole(role)) return 'Thợ máy';
  if (isDeckLogRole(role)) return 'Thủy thủ';
  return role || '';
};

module.exports = {
  normalizeRole,
  isEngineLogRole,
  isDeckLogRole,
  isLogRoleForDuty,
  canonicalVoyageRole,
  isEngineOfficerRole,
  isShiftOfficerRole,
  voyageRoleDepartment,
  voyageRoleLabel,
};
