// Module Báo cáo (FT-10) — kiểm thử thang bậc & vòng đời trạng thái.
// Đây là "nguồn quy tắc" thuần (không chạm DB) cho định tuyến Escalate và
// kiểm tra chuyển trạng thái hợp lệ (BR-21).
const {
  LADDERS,
  ALLOWED_TRANSITIONS,
  resolveLadder,
  findRung,
  getInitialHandlerRole,
  getNextHandlerRole,
  canTransition,
} = require('../src/configs/reportHierarchy');

describe('reportHierarchy · resolveLadder — chọn thang bậc theo department/role', () => {
  test('department Engine luôn dùng thang Engine', () => {
    expect(resolveLadder('Sailor', 'Engine')).toBe(LADDERS.Engine);
  });

  test('department Deck luôn dùng thang Deck', () => {
    expect(resolveLadder('EngineOfficer', 'Deck')).toBe(LADDERS.Deck);
  });

  test('thiếu department: suy từ role máy (EngineOfficer/EngineCrew) → Engine', () => {
    expect(resolveLadder('EngineOfficer')).toBe(LADDERS.Engine);
    expect(resolveLadder('EngineCrew')).toBe(LADDERS.Engine);
  });

  test('thiếu department và role không rõ → mặc định Deck', () => {
    expect(resolveLadder('Sailor')).toBe(LADDERS.Deck);
    expect(resolveLadder('KhongRo')).toBe(LADDERS.Deck);
  });
});

describe('reportHierarchy · findRung — vị trí rung của role trong thang', () => {
  test('trả về đúng chỉ số rung', () => {
    expect(findRung(LADDERS.Deck, 'Sailor')).toBe(0);
    expect(findRung(LADDERS.Deck, 'DeckOfficer')).toBe(1);
    expect(findRung(LADDERS.Deck, 'ChiefOfficer')).toBe(2);
    expect(findRung(LADDERS.Deck, 'Master')).toBe(3);
  });

  test("'Crew' là bí danh cũ của Sailor → cùng rung cơ sở", () => {
    expect(findRung(LADDERS.Deck, 'Crew')).toBe(0);
    expect(findRung(LADDERS.Engine, 'Sailor')).toBe(0);
  });

  test('role không thuộc thang → -1', () => {
    expect(findRung(LADDERS.Deck, 'KhongCo')).toBe(-1);
  });
});

describe('reportHierarchy · getInitialHandlerRole — cấp tiếp nhận đầu tiên', () => {
  test.each([
    ['Sailor', 'Deck', 'DeckOfficer'],
    ['DeckOfficer', 'Deck', 'ChiefOfficer'],
    ['ChiefOfficer', 'Deck', 'Master'],
    ['EngineCrew', 'Engine', 'EngineOfficer'],
    ['EngineOfficer', 'Engine', 'ChiefOfficer'],
  ])('người tạo %s (%s) → chuyển tới %s', (creator, dept, expected) => {
    expect(getInitialHandlerRole(creator, dept)).toBe(expected);
  });

  test('Master ở đỉnh thang → tự xử lý (không có cấp trên)', () => {
    expect(getInitialHandlerRole('Master', 'Deck')).toBe('Master');
  });

  test('role lạ → đẩy lên rung officer đầu tiên', () => {
    expect(getInitialHandlerRole('NguoiLa', 'Deck')).toBe('DeckOfficer');
    expect(getInitialHandlerRole('NguoiLa', 'Engine')).toBe('EngineOfficer');
  });
});

describe('reportHierarchy · getNextHandlerRole — rung kế tiếp khi Escalate', () => {
  test.each([
    ['Sailor', 'Deck', 'DeckOfficer'],
    ['DeckOfficer', 'Deck', 'ChiefOfficer'],
    ['ChiefOfficer', 'Deck', 'Master'],
    ['EngineOfficer', 'Engine', 'ChiefOfficer'],
  ])('%s (%s) đẩy lên %s', (role, dept, expected) => {
    expect(getNextHandlerRole(role, dept)).toBe(expected);
  });

  test('Master đã ở đỉnh → null (không đẩy lên nữa)', () => {
    expect(getNextHandlerRole('Master', 'Deck')).toBeNull();
  });

  test('role không thuộc thang → null', () => {
    expect(getNextHandlerRole('KhongCo', 'Deck')).toBeNull();
  });
});

describe('reportHierarchy · canTransition — vòng đời trạng thái BR-21', () => {
  test.each([
    ['Open', 'InProgress'],
    ['Open', 'Rejected'],
    ['InProgress', 'Resolved'],
    ['InProgress', 'Rejected'],
    ['Resolved', 'Closed'],
    ['Resolved', 'InProgress'], // mở lại có kiểm soát
  ])('cho phép %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  test.each([
    ['Open', 'Resolved'], // không nhảy cóc
    ['Open', 'Closed'],
    ['InProgress', 'Closed'],
    ['InProgress', 'Open'],
    ['Resolved', 'Rejected'],
    ['Closed', 'InProgress'], // trạng thái kết thúc
    ['Rejected', 'InProgress'],
  ])('chặn %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });

  test('trạng thái không xác định → chặn (không văng lỗi)', () => {
    expect(canTransition('KhongRo', 'Closed')).toBe(false);
  });

  test('Closed và Rejected là ngõ cụt trong bảng chuyển', () => {
    expect(ALLOWED_TRANSITIONS.Closed).toEqual([]);
    expect(ALLOWED_TRANSITIONS.Rejected).toEqual([]);
  });
});
