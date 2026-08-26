const mockModels = {
  Shift: { findByPk: jest.fn() },
  ShiftLog: { findByPk: jest.fn() },
  Voyage: { findByPk: jest.fn() },
  VoyageCrew: { findOne: jest.fn() },
  Engine: { findByPk: jest.fn() },
  EngineLog: { findOne: jest.fn() },
  EngineParameter: { findAll: jest.fn() },
};

jest.mock('../../src/models', () => mockModels);

const {
  requireOwnedShift,
  requireOwnedShiftLog,
  requireVoyageAssignment,
  validateEngineValues,
} = require('../../src/middlewares/logOwnershipMiddleware');

const makeResponse = () => {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
};

const makeRequest = (overrides = {}) => ({
  user: { id: 21, profileId: 31 },
  params: {},
  body: {},
  ...overrides,
});

const validValues = () => [
  { parameterId: 1, value: 5 },
  { parameterId: 2, value: 400 },
  { parameterId: 3, value: 70 },
];

describe('Log Ownership and Engine Value Middleware', () => {
  let consoleError;
  let shift;
  let voyage;
  let engine;

  beforeAll(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-22T02:00:00.000Z'));
  });

  afterAll(() => {
    consoleError.mockRestore();
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    shift = {
      id: 1,
      crewId: 31,
      voyageId: 2,
      status: 'Active',
      startTime: new Date('2026-08-22T01:00:00.000Z'),
      endTime: new Date('2026-08-22T05:00:00.000Z'),
    };
    voyage = { id: 2, shipId: 9, status: 'Underway' };
    engine = { id: 7, shipId: 9, status: 'Hoạt động' };
    mockModels.Shift.findByPk.mockResolvedValue(shift);
    mockModels.ShiftLog.findByPk.mockResolvedValue({ id: 8, shiftId: 1, logType: 'Engine' });
    mockModels.Voyage.findByPk.mockResolvedValue(voyage);
    mockModels.VoyageCrew.findOne.mockResolvedValue({ voyageId: 2, crewId: 31, role: 'EngineCrew' });
    mockModels.Engine.findByPk.mockResolvedValue(engine);
    mockModels.EngineLog.findOne.mockResolvedValue({ id: 9, engineId: 7 });
    mockModels.EngineParameter.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  describe('requireOwnedShift', () => {
    test('từ chối tài khoản chưa có hồ sơ thuyền viên', async () => {
      const req = makeRequest({ user: { id: 21 }, body: { shiftId: 1 } });
      const res = makeResponse();
      await requireOwnedShift({ duty: 'Engine' })(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('từ chối khi thiếu mã ca trực', async () => {
      const res = makeResponse();
      await requireOwnedShift({ duty: 'Engine' })(makeRequest(), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('trả 404 khi ca trực không tồn tại', async () => {
      mockModels.Shift.findByPk.mockResolvedValue(null);
      const res = makeResponse();
      await requireOwnedShift({ duty: 'Engine' })(makeRequest({ body: { shiftId: 1 } }), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('từ chối thao tác trên ca của người khác', async () => {
      shift.crewId = 99;
      const res = makeResponse();
      await requireOwnedShift({ duty: 'Engine' })(makeRequest({ body: { shiftId: 1 } }), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Bạn không được phép thao tác trên ca trực của người khác.' });
    });

    test('từ chối chức danh không đúng nhiệm vụ nhật ký', async () => {
      mockModels.VoyageCrew.findOne.mockResolvedValue({ role: 'Sailor' });
      const res = makeResponse();
      await requireOwnedShift({ duty: 'Engine' })(makeRequest({ body: { shiftId: 1 } }), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test.each([
      [new Date('2026-08-22T03:00:00.000Z'), new Date('2026-08-22T07:00:00.000Z'), 'Ca trực chưa bắt đầu, chưa thể ghi nhật ký.'],
      [new Date('2026-08-21T20:00:00.000Z'), new Date('2026-08-22T01:00:00.000Z'), 'Ca trực đã kết thúc, không thể tạo nhật ký mới.'],
    ])('kiểm tra cửa sổ hoạt động của ca trực', async (startTime, endTime, message) => {
      shift.startTime = startTime;
      shift.endTime = endTime;
      const res = makeResponse();
      await requireOwnedShift({ duty: 'Engine', activeWindow: true })(
        makeRequest({ body: { shiftId: 1 } }), res, jest.fn(),
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message });
    });

    test.each(['Completed'])('từ chối ca đã đóng: %s', async (status) => {
      shift.status = status;
      const res = makeResponse();
      await requireOwnedShift({ duty: 'Engine', activeWindow: true })(
        makeRequest({ body: { shiftId: 1 } }), res, jest.fn(),
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Ca trực đã đóng, không thể tạo nhật ký mới.' });
    });

    test('trả 404 khi hải trình của ca không tồn tại', async () => {
      mockModels.Voyage.findByPk.mockResolvedValue(null);
      const res = makeResponse();
      await requireOwnedShift({ duty: 'Engine', activeWindow: true })(
        makeRequest({ body: { shiftId: 1 } }), res, jest.fn(),
      );
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test.each(['Completed'])('từ chối hải trình đã kết thúc: %s', async (status) => {
      voyage.status = status;
      const res = makeResponse();
      await requireOwnedShift({ duty: 'Engine', activeWindow: true })(
        makeRequest({ body: { shiftId: 1 } }), res, jest.fn(),
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Hải trình đã kết thúc, không thể tạo nhật ký mới.' });
    });

    test('cho phép chủ ca đúng chức danh trong cửa sổ hoạt động', async () => {
      const req = makeRequest({ body: { shiftId: 1 } });
      const res = makeResponse();
      const next = jest.fn();
      await requireOwnedShift({ duty: 'Engine', activeWindow: true })(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.authorizedShift).toBe(shift);
      expect(req.authorizedVoyage).toBe(voyage);
    });

    test('trả 500 khi xác minh ca trực lỗi', async () => {
      mockModels.Shift.findByPk.mockRejectedValue(new Error('lookup failed'));
      const res = makeResponse();
      await requireOwnedShift({ duty: 'Engine' })(makeRequest({ body: { shiftId: 1 } }), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('requireOwnedShiftLog', () => {
    test('trả 404 khi nhật ký sai loại', async () => {
      mockModels.ShiftLog.findByPk.mockResolvedValue({ id: 8, shiftId: 1, logType: 'Deck' });
      const res = makeResponse();
      await requireOwnedShiftLog('Engine')(makeRequest({ params: { shiftLogId: '8' } }), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy nhật ký máy.' });
    });

    test('từ chối nhật ký của người khác', async () => {
      shift.crewId = 99;
      const res = makeResponse();
      await requireOwnedShiftLog('Engine')(makeRequest({ params: { shiftLogId: '8' } }), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Bạn không được phép thao tác trên nhật ký của người khác.' });
    });

    test('cho phép chủ nhật ký đúng chức danh', async () => {
      const req = makeRequest({ params: { shiftLogId: '8' } });
      const res = makeResponse();
      const next = jest.fn();
      await requireOwnedShiftLog('Engine')(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.authorizedShift).toBe(shift);
    });
  });

  describe('requireVoyageAssignment', () => {
    test('từ chối người không thuộc hải trình', async () => {
      mockModels.VoyageCrew.findOne.mockResolvedValue(null);
      const res = makeResponse();
      await requireVoyageAssignment('Engine')(makeRequest({ params: { voyageId: '2' } }), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('từ chối chức danh không có quyền xem nhật ký máy', async () => {
      mockModels.VoyageCrew.findOne.mockResolvedValue({ role: 'Sailor' });
      const res = makeResponse();
      await requireVoyageAssignment('Engine')(makeRequest({ params: { voyageId: '2' } }), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('cho phép đúng phân công EngineCrew', async () => {
      const next = jest.fn();
      await requireVoyageAssignment('Engine')(
        makeRequest({ params: { voyageId: '2' } }), makeResponse(), next,
      );
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateEngineValues', () => {
    test.each([validValues().slice(0, 2)])('từ chối dưới ba thông số: %p', async (values) => {
      const res = makeResponse();
      await validateEngineValues()(makeRequest({ body: { shiftId: 1, engineId: 7, values } }), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('từ chối nhập trùng thông số', async () => {
      const values = validValues();
      values[2].parameterId = 2;
      const res = makeResponse();
      await validateEngineValues()(makeRequest({ body: { engineId: 7, values } }), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Không được nhập trùng một thông số máy.' });
    });

    test.each([0, 'abc'])('từ chối mã máy không hợp lệ: %p', async (engineId) => {
      const res = makeResponse();
      await validateEngineValues()(makeRequest({ body: { engineId, values: validValues() } }), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('trả 404 khi máy không tồn tại', async () => {
      mockModels.Engine.findByPk.mockResolvedValue(null);
      const res = makeResponse();
      await validateEngineValues()(makeRequest({ body: { engineId: 7, values: validValues() } }), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('từ chối tạo nhật ký cho máy dự phòng', async () => {
      engine.status = 'Dự phòng';
      const res = makeResponse();
      await validateEngineValues()(makeRequest({ body: { engineId: 7, values: validValues() } }), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('từ chối máy không thuộc tàu của hải trình', async () => {
      engine.shipId = 99;
      const res = makeResponse();
      await validateEngineValues()(makeRequest({
        body: { engineId: 7, values: validValues() }, authorizedVoyage: voyage,
      }), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Máy được chọn không thuộc tàu của hải trình này.' });
    });

    test('từ chối thông số không thuộc máy', async () => {
      mockModels.EngineParameter.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const res = makeResponse();
      await validateEngineValues()(makeRequest({
        body: { engineId: 7, values: validValues() }, authorizedVoyage: voyage,
      }), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Có thông số không thuộc máy được chọn.' });
    });

    test('cho phép ba thông số hợp lệ thuộc máy của hải trình', async () => {
      const next = jest.fn();
      await validateEngineValues()(makeRequest({
        body: { engineId: 7, values: validValues() }, authorizedVoyage: voyage,
      }), makeResponse(), next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    test('khi cập nhật, bỏ qua nếu không thay đổi values', async () => {
      const next = jest.fn();
      await validateEngineValues({ update: true })(makeRequest({ body: {} }), makeResponse(), next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(mockModels.EngineLog.findOne).not.toHaveBeenCalled();
    });

    test('khi cập nhật, lấy máy từ nhật ký hiện tại', async () => {
      const next = jest.fn();
      await validateEngineValues({ update: true })(makeRequest({
        params: { shiftLogId: '8' }, body: { values: validValues() },
        authorizedShift: shift,
      }), makeResponse(), next);
      expect(mockModels.EngineLog.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { shiftLogId: '8' } }));
      expect(next).toHaveBeenCalledTimes(1);
    });

    test('trả 500 khi kiểm tra thông số lỗi', async () => {
      mockModels.Engine.findByPk.mockRejectedValue(new Error('lookup failed'));
      const res = makeResponse();
      await validateEngineValues()(makeRequest({ body: { engineId: 7, values: validValues() } }), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
