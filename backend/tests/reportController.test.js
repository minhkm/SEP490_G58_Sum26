// Module Báo cáo — kiểm thử phần validate của createReport (reportController).
// Các nhánh dưới đây trả về trước khi chạm DB nên chỉ cần mock models + services
// để nạp được controller. reportHierarchy vẫn dùng bản thật (thuần).
jest.mock('../src/models', () => ({
  sequelize: { transaction: jest.fn() },
  Report: { create: jest.fn(), findByPk: jest.fn() },
  ReportReply: { create: jest.fn(), findAll: jest.fn() },
  CrewProfile: { findByPk: jest.fn() },
  Ship: {},
  Voyage: {},
  VoyageCrew: { findAll: jest.fn(), findOne: jest.fn() },
  Shift: { findByPk: jest.fn() },
}));
jest.mock('../src/services/notificationService', () => ({
  notifyReportSubmitted: jest.fn(),
  notifyReportReplied: jest.fn(),
  notifyReportEscalated: jest.fn(),
  notifyReportStatusChanged: jest.fn(),
}));
jest.mock('../src/services/shiftSnapshotService', () => ({
  buildShiftSnapshot: jest.fn(),
}));

const { Report } = require('../src/models');
const controller = require('../src/controllers/reportController');

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

// Thuyền viên hợp lệ (không phải Master) để đi qua 2 chốt đầu và tới bước validate nội dung.
const crewUser = { id: 1, profileId: 9, role: 'Sailor' };

describe('reportController · createReport — chốt quyền tạo', () => {
  test('không có hồ sơ thuyền viên → 403', async () => {
    const res = mockRes();
    await controller.createReport({ user: { id: 1, profileId: null, role: 'Sailor' }, body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].message).toMatch(/Chỉ thuyền viên trên tàu/);
    expect(Report.create).not.toHaveBeenCalled();
  });

  test('Master không được tạo báo cáo (chỉ tiếp nhận xử lý) → 403', async () => {
    const res = mockRes();
    await controller.createReport({ user: { id: 2, profileId: 3, role: 'Master' }, body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].message).toMatch(/Thuyền trưởng không tạo báo cáo/);
    expect(Report.create).not.toHaveBeenCalled();
  });
});

describe('reportController · createReport — validate tiêu đề/nội dung', () => {
  test('tiêu đề < 5 ký tự → 400', async () => {
    const res = mockRes();
    await controller.createReport({ user: crewUser, body: { title: 'abc', content: 'Nội dung đủ dài mười ký tự' } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/tối thiểu 5 ký tự/);
    expect(Report.create).not.toHaveBeenCalled();
  });

  test('nội dung < 10 ký tự → 400', async () => {
    const res = mockRes();
    await controller.createReport({ user: crewUser, body: { title: 'Tiêu đề hợp lệ', content: 'ngắn' } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Report.create).not.toHaveBeenCalled();
  });

  test('tiêu đề > 100 ký tự → 400', async () => {
    const res = mockRes();
    await controller.createReport(
      { user: crewUser, body: { title: 'a'.repeat(101), content: 'Nội dung hợp lệ đủ dài' } },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/không quá 100 ký tự/);
  });

  test('nội dung > 1000 ký tự → 400', async () => {
    const res = mockRes();
    await controller.createReport(
      { user: crewUser, body: { title: 'Tiêu đề hợp lệ', content: 'a'.repeat(1001) } },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/không quá 100 ký tự và nội dung không quá 1000/);
  });
});
