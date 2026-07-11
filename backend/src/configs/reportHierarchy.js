/**
 * Cấu hình thang bậc & vòng đời cho module Báo cáo (FT-10).
 * Là nguồn quy tắc cho: định tuyến Escalate (báo cáo đang ở cấp nào) và
 * kiểm tra chuyển trạng thái hợp lệ (BR-21). Mirror bên FE: frontend/src/config/roles.js
 */

// Thang bậc từ THẤP -> CAO theo bộ phận. Mỗi "rung" là một cấp; một rung có thể gồm
// nhiều role cùng cấp (vd Engine: Thợ máy và Thủy thủ cùng ở cấp cơ sở).
// Role đại diện của rung (dùng để định tuyến khi escalate) là phần tử đầu tiên.
const LADDERS = {
  Deck: [["Sailor"], ["DeckOfficer"], ["ChiefOfficer"], ["Master"]],
  Engine: [["EngineCrew", "Sailor"], ["EngineOfficer"], ["Master"]], // Engine bỏ qua rung ChiefOfficer
};

// Vòng đời trạng thái (BR-21): Open -> InProgress -> Resolved -> Closed (+ Rejected).
// Resolved -> InProgress = mở lại/yêu cầu bổ sung có kiểm soát (không phải nhảy cóc).
const ALLOWED_TRANSITIONS = {
  Open: ["InProgress", "Rejected"],
  InProgress: ["Resolved", "Rejected"],
  Resolved: ["Closed", "InProgress"],
  Closed: [],
  Rejected: [],
};

// Chọn thang bậc theo department; nếu thiếu/không rõ thì suy từ role.
function resolveLadder(role, department) {
  if (department === "Engine") return LADDERS.Engine;
  if (department === "Deck") return LADDERS.Deck;
  if (role === "EngineOfficer" || role === "EngineCrew") return LADDERS.Engine;
  return LADDERS.Deck; // mặc định: Deck
}

// Chỉ số rung chứa role trong thang bậc (-1 nếu không có).
function findRung(ladder, role) {
  return ladder.findIndex((rung) => rung.includes(role));
}

// Cấp trên trực tiếp của người tạo — nơi báo cáo được chuyển tới đầu tiên.
function getInitialHandlerRole(creatorRole, department) {
  const ladder = resolveLadder(creatorRole, department);
  const idx = findRung(ladder, creatorRole);
  if (idx === -1) return ladder[1][0]; // role lạ: đẩy lên rung officer đầu tiên
  if (idx >= ladder.length - 1) return creatorRole; // đã ở đỉnh (Master): tự xử lý
  return ladder[idx + 1][0];
}

// Rung kế tiếp khi Escalate; null nếu đã ở đỉnh (không escalate được nữa).
function getNextHandlerRole(currentRole, department) {
  const ladder = resolveLadder(currentRole, department);
  const idx = findRung(ladder, currentRole);
  if (idx === -1 || idx >= ladder.length - 1) return null;
  return ladder[idx + 1][0];
}

// Có thể chuyển từ trạng thái `from` sang `to` không?
function canTransition(from, to) {
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
}

module.exports = {
  LADDERS,
  ALLOWED_TRANSITIONS,
  resolveLadder,
  findRung,
  getInitialHandlerRole,
  getNextHandlerRole,
  canTransition,
};
