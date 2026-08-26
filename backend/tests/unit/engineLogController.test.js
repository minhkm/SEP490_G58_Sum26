const mockModels = {
  Voyage: { findAll: jest.fn() },
  VoyageCrew: { findOne: jest.fn(), findAll: jest.fn() },
  Ship: {},
  Engine: { findByPk: jest.fn() },
  EngineParameter: { findAll: jest.fn() },
  Shift: { findAll: jest.fn(), findByPk: jest.fn() },
  ShiftLog: { create: jest.fn(), findByPk: jest.fn(), findAll: jest.fn() },
  EngineLog: { create: jest.fn() },
  EngineLogValue: { bulkCreate: jest.fn(), destroy: jest.fn() },
  CrewProfile: { findOne: jest.fn() },
  LogEditHistory: { create: jest.fn(), findAll: jest.fn() },
  LogImage: {},
};

const mockNotificationService = { notifyEngineParameterExceeded: jest.fn() };

jest.mock('../../src/models', () => mockModels);
jest.mock('../../src/services/notificationService', () => mockNotificationService);

const controller = require('../../src/controllers/engineLogController');

const makeResponse = () => {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
};

const makeRequest = (overrides = {}) => ({
  user: { id: 21, profileId: 31 },
  params: {},
  query: {},
  body: {},
  ...overrides,
});

const validValues = () => [
  { parameterId: 1, value: 5 },
  { parameterId: 2, value: 400 },
  { parameterId: 3, value: 70 },
];

describe('Engine Log Controller', () => {
  let consoleError;
  let engine;
  let shiftLog;

  beforeAll(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-22T10:00:00.000Z'));
  });

  afterAll(() => {
    consoleError.mockRestore();
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    engine = { id: 7, status: 'Hoạt động', engineName: 'Máy chính' };
    shiftLog = {
      id: 8,
      shiftId: 1,
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
      content: 'Kiểm tra định kỳ',
      update: jest.fn(),
      EngineLog: {
        id: 9,
        engineId: 7,
        note: 'Kiểm tra định kỳ',
        update: jest.fn(),
        EngineLogValues: [],
      },
    };
    mockModels.VoyageCrew.findOne.mockResolvedValue({ role: 'EngineCrew' });
    mockModels.Shift.findAll.mockResolvedValue([{ id: 1 }]);
    mockModels.Shift.findByPk.mockResolvedValue({ id: 1, voyageId: 2 });
    mockModels.Engine.findByPk.mockResolvedValue(engine);
    mockModels.EngineParameter.findAll.mockResolvedValue([]);
    mockModels.ShiftLog.create.mockResolvedValue({ id: 8, shiftId: 1 });
    mockModels.EngineLog.create.mockResolvedValue({ id: 9, engineId: 7 });
    mockModels.EngineLogValue.bulkCreate.mockResolvedValue([]);
    mockModels.EngineLogValue.destroy.mockResolvedValue(3);
    mockModels.ShiftLog.findByPk.mockResolvedValue(shiftLog);
    mockModels.LogEditHistory.create.mockResolvedValue({ id: 1 });
    mockModels.LogEditHistory.findAll.mockResolvedValue([{ id: 1, editReason: 'Hiệu chỉnh' }]);
  });

  describe('Engine Log.getShiftsForCurrentUser', () => {
    test('từ chối khi không xác định được hồ sơ người dùng', async () => {
      const req = makeRequest({ user: { id: 21 }, params: { voyageId: '2' } });
      const res = makeResponse();
      await controller.getShiftsForCurrentUser(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test.each([null])('từ chối khi không được phân công Thợ máy: %p', async (assignment) => {
      mockModels.VoyageCrew.findOne.mockResolvedValue(assignment);
      const req = makeRequest({ params: { voyageId: '2' } });
      const res = makeResponse();
      await controller.getShiftsForCurrentUser(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Bạn không được phân công làm Thợ máy trong hải trình này' });
    });

    test.each(['22-08-2026'])('từ chối ngày lọc không hợp lệ: %s', async (date) => {
      const req = makeRequest({ params: { voyageId: '2' }, query: { date } });
      const res = makeResponse();
      await controller.getShiftsForCurrentUser(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('trả ca trực của chính người dùng theo ngày hợp lệ', async () => {
      const req = makeRequest({ params: { voyageId: '2' }, query: { date: '2026-08-22' } });
      const res = makeResponse();
      await controller.getShiftsForCurrentUser(req, res);
      expect(mockModels.Shift.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ voyageId: '2', crewId: 31, startTime: expect.any(Object) }),
      }));
      expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
    });

    test('trả 500 khi truy vấn ca trực lỗi', async () => {
      mockModels.Shift.findAll.mockRejectedValue(new Error('database unavailable'));
      const req = makeRequest({ params: { voyageId: '2' } });
      const res = makeResponse();
      await controller.getShiftsForCurrentUser(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Lỗi máy chủ khi lấy ca trực máy' });
    });
  });

  describe('Engine Log.createEngineLog', () => {
    test.each([[{ engineId: 7, values: validValues() }]])('từ chối khi thiếu ca trực: %p', async (body) => {
      const res = makeResponse();
      await controller.createEngineLog(makeRequest({ body }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('trả 404 khi máy không tồn tại', async () => {
      mockModels.Engine.findByPk.mockResolvedValue(null);
      const res = makeResponse();
      await controller.createEngineLog(makeRequest({ body: { shiftId: 1, engineId: 7, values: validValues() } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test.each(['Dự phòng'])('từ chối máy không hoạt động: %s', async (status) => {
      engine.status = status;
      const res = makeResponse();
      await controller.createEngineLog(makeRequest({ body: { shiftId: 1, engineId: 7, values: validValues() } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Chỉ máy đang hoạt động mới được ghi nhật ký' });
    });

    test.each([validValues().slice(0, 2)])('từ chối khi có dưới ba thông số: %p', async (values) => {
      const res = makeResponse();
      await controller.createEngineLog(makeRequest({ body: { shiftId: 1, engineId: 7, values } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Vui lòng nhập ít nhất 3 thông số máy' });
    });

    test.each([[{ parameterId: 1, value: 'abc' }, ...validValues().slice(1)]])('từ chối thông số hoặc giá trị không hợp lệ', async (values) => {
      const res = makeResponse();
      await controller.createEngineLog(makeRequest({ body: { shiftId: 1, engineId: 7, values } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('tạo nhật ký và ba giá trị thành công', async () => {
      const res = makeResponse();
      await controller.createEngineLog(makeRequest({ body: {
        shiftId: 1, engineId: 7, note: 'Kiểm tra định kỳ', values: validValues(),
      } }), res);
      expect(mockModels.ShiftLog.create).toHaveBeenCalledWith(expect.objectContaining({ shiftId: 1, logType: 'Engine' }));
      expect(mockModels.EngineLogValue.bulkCreate).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ engineLogId: 9, parameterId: 1, value: 5 }),
      ]));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Ghi nhận kiểm tra máy thành công' }));
    });

    test('dùng nội dung mặc định khi không nhập ghi chú', async () => {
      const res = makeResponse();
      await controller.createEngineLog(makeRequest({ body: { shiftId: 1, engineId: 7, values: validValues() } }), res);
      expect(mockModels.ShiftLog.create).toHaveBeenCalledWith(expect.objectContaining({ content: 'Kiểm tra máy định kỳ' }));
    });

    test('trả 500 và không làm sập bộ chạy khi tạo dữ liệu lỗi', async () => {
      mockModels.ShiftLog.create.mockRejectedValue(new Error('create failed'));
      const res = makeResponse();
      await controller.createEngineLog(makeRequest({ body: { shiftId: 1, engineId: 7, values: validValues() } }), res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Lỗi máy chủ khi tạo nhật ký máy' });
    });
  });

  describe('Engine Log.updateEngineLog', () => {
    const validBody = () => ({ note: 'Đã hiệu chỉnh', editReason: 'Đối chiếu đồng hồ', values: validValues() });

    test.each([''])('từ chối lý do chỉnh sửa rỗng: %p', async (editReason) => {
      const res = makeResponse();
      await controller.updateEngineLog(makeRequest({ params: { shiftLogId: '8' }, body: { ...validBody(), editReason } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Vui lòng cung cấp lý do chỉnh sửa' });
    });

    test.each([validValues().slice(0, 2)])('từ chối danh sách dưới ba thông số: %p', async (values) => {
      const res = makeResponse();
      await controller.updateEngineLog(makeRequest({ params: { shiftLogId: '8' }, body: { ...validBody(), values } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('từ chối giá trị thông số không hợp lệ', async () => {
      const values = validValues();
      values[0].value = '';
      const res = makeResponse();
      await controller.updateEngineLog(makeRequest({ params: { shiftLogId: '8' }, body: { ...validBody(), values } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('trả 404 khi không tìm thấy nhật ký máy', async () => {
      mockModels.ShiftLog.findByPk.mockResolvedValue(null);
      const res = makeResponse();
      await controller.updateEngineLog(makeRequest({ params: { shiftLogId: '8' }, body: validBody() }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test.each([new Date('2026-08-20T00:00:00.000Z')])('từ chối nhật ký ngoài cửa sổ 24 giờ: %p', async (createdAt) => {
      shiftLog.createdAt = createdAt;
      const res = makeResponse();
      await controller.updateEngineLog(makeRequest({ params: { shiftLogId: '8' }, body: validBody() }), res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Nhật ký đã quá 24 giờ và không thể chỉnh sửa' });
    });

    test('lưu lịch sử rồi cập nhật ghi chú và giá trị trong 24 giờ', async () => {
      const res = makeResponse();
      await controller.updateEngineLog(makeRequest({ params: { shiftLogId: '8' }, body: validBody() }), res);
      expect(mockModels.LogEditHistory.create).toHaveBeenCalledWith(expect.objectContaining({
        logType: 'Engine', shiftLogId: 8, editReason: 'Đối chiếu đồng hồ', editedBy: 31,
      }));
      expect(shiftLog.EngineLog.update).toHaveBeenCalledWith({ note: 'Đã hiệu chỉnh' });
      expect(mockModels.EngineLogValue.destroy).toHaveBeenCalledWith({ where: { engineLogId: 9 } });
      expect(res.json).toHaveBeenCalledWith({ message: 'Cập nhật nhật ký thành công' });
    });

    test('cho phép chỉ sửa ghi chú mà giữ nguyên giá trị', async () => {
      const res = makeResponse();
      await controller.updateEngineLog(makeRequest({
        params: { shiftLogId: '8' }, body: { note: 'Ghi chú mới', editReason: 'Bổ sung mô tả' },
      }), res);
      expect(mockModels.EngineLogValue.destroy).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Cập nhật nhật ký thành công' });
    });

    test('trả 500 khi lưu lịch sử lỗi', async () => {
      mockModels.LogEditHistory.create.mockRejectedValue(new Error('history failed'));
      const res = makeResponse();
      await controller.updateEngineLog(makeRequest({ params: { shiftLogId: '8' }, body: validBody() }), res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Lỗi máy chủ khi cập nhật nhật ký máy' });
    });
  });

  describe('Engine Log.getEditHistory', () => {
    test.each([[[{ id: 1, editReason: 'Hiệu chỉnh' }]]])('trả danh sách lịch sử chỉnh sửa: %p', async (history) => {
      mockModels.LogEditHistory.findAll.mockResolvedValue(history);
      const res = makeResponse();
      await controller.getEditHistory(makeRequest({ params: { shiftLogId: '8' } }), res);
      expect(mockModels.LogEditHistory.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { shiftLogId: '8' } }));
      expect(res.json).toHaveBeenCalledWith(history);
    });

    test('trả 500 khi lấy lịch sử chỉnh sửa lỗi', async () => {
      mockModels.LogEditHistory.findAll.mockRejectedValue(new Error('lookup failed'));
      const res = makeResponse();
      await controller.getEditHistory(makeRequest({ params: { shiftLogId: '8' } }), res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Lỗi máy chủ khi lấy lịch sử chỉnh sửa nhật ký máy' });
    });
  });
});
