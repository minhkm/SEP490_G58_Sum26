const mockModels = {
  Voyage: { findAll: jest.fn() },
  VoyageCrew: { findOne: jest.fn(), findAll: jest.fn() },
  Ship: {},
  Shift: { findAll: jest.fn(), findByPk: jest.fn() },
  ShiftLog: { create: jest.fn(), findByPk: jest.fn(), findAll: jest.fn() },
  DeckLog: { create: jest.fn() },
  DeckLogEntry: { bulkCreate: jest.fn(), destroy: jest.fn() },
  CrewProfile: { findOne: jest.fn() },
  LogEditHistory: { create: jest.fn(), findAll: jest.fn() },
  LogImage: {},
};

jest.mock('../../src/models', () => mockModels);

const controller = require('../../src/controllers/deckLogController');

const makeResponse = () => {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
};

const makeRequest = (overrides = {}) => ({
  user: { id: 18, profileId: 28 },
  params: {},
  query: {},
  body: {},
  ...overrides,
});

const validEntry = (overrides = {}) => ({
  hour: 1,
  courseTrue: 180,
  courseGyro: 181,
  courseSteer: 180,
  gyroError: 1,
  courseMagnetic: 178,
  speed: 12,
  rpm: 90,
  windDirection: 'NE',
  windForce: 4,
  weather: 'bc',
  barometer: 1012,
  seaState: 3,
  visibility: 8,
  airTemp: 29,
  seaTemp: 27,
  ...overrides,
});

describe('Deck Log Controller', () => {
  let consoleError;
  let shift;
  let shiftLog;

  beforeAll(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 7, 22, 2, 30, 0));
  });

  afterAll(() => {
    consoleError.mockRestore();
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    shift = {
      id: 2,
      voyageId: 1,
      crewId: 28,
      startTime: new Date(2026, 7, 22, 0, 0, 0),
      endTime: new Date(2026, 7, 22, 4, 0, 0),
    };
    shiftLog = {
      id: 11,
      shiftId: 2,
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
      content: 'Ca trực bình thường',
      update: jest.fn(),
      DeckLog: {
        id: 12,
        note: 'Ca trực bình thường',
        update: jest.fn(),
        DeckLogEntries: [validEntry()],
      },
    };
    mockModels.VoyageCrew.findOne.mockResolvedValue({ role: 'Sailor' });
    mockModels.Shift.findAll.mockResolvedValue([shift]);
    mockModels.Shift.findByPk.mockResolvedValue(shift);
    mockModels.ShiftLog.create.mockResolvedValue({ id: 11, shiftId: 2 });
    mockModels.DeckLog.create.mockResolvedValue({ id: 12, shiftLogId: 11 });
    mockModels.DeckLogEntry.bulkCreate.mockResolvedValue([]);
    mockModels.DeckLogEntry.destroy.mockResolvedValue(1);
    mockModels.ShiftLog.findByPk.mockResolvedValue(shiftLog);
    mockModels.LogEditHistory.create.mockResolvedValue({ id: 1 });
    mockModels.LogEditHistory.findAll.mockResolvedValue([{ id: 1, editReason: 'Hiệu chỉnh' }]);
  });

  describe('Deck Log.getShiftsForCurrentUser', () => {
    test('từ chối khi không xác định được hồ sơ người dùng', async () => {
      const res = makeResponse();
      await controller.getShiftsForCurrentUser(makeRequest({ user: { id: 18 }, params: { voyageId: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test.each([null])('từ chối người không được phân công Thủy thủ: %p', async (assignment) => {
      mockModels.VoyageCrew.findOne.mockResolvedValue(assignment);
      const res = makeResponse();
      await controller.getShiftsForCurrentUser(makeRequest({ params: { voyageId: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Bạn không được phân công làm Thủy thủ trong hải trình này' });
    });

    test.each(['22/08/2026'])('từ chối ngày lọc không hợp lệ: %s', async (date) => {
      const res = makeResponse();
      await controller.getShiftsForCurrentUser(makeRequest({ params: { voyageId: '1' }, query: { date } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('trả ca trực theo ngày hợp lệ', async () => {
      const res = makeResponse();
      await controller.getShiftsForCurrentUser(makeRequest({
        params: { voyageId: '1' }, query: { date: '2026-08-22' },
      }), res);
      expect(mockModels.Shift.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ voyageId: '1', crewId: 28, startTime: expect.any(Object) }),
      }));
      expect(res.json).toHaveBeenCalledWith([shift]);
    });

    test('trả 500 khi truy vấn ca trực lỗi', async () => {
      mockModels.Shift.findAll.mockRejectedValue(new Error('database unavailable'));
      const res = makeResponse();
      await controller.getShiftsForCurrentUser(makeRequest({ params: { voyageId: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Lỗi máy chủ khi lấy ca trực boong' });
    });
  });

  describe('Deck Log.createDeckLog', () => {
    test('từ chối khi thiếu ca trực', async () => {
      const res = makeResponse();
      await controller.createDeckLog(makeRequest({ body: { note: 'Ghi chú' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Thiếu thông tin ca trực' });
    });

    test.each([{ shiftId: 2, note: '', entries: [] }])('từ chối khi không có dòng dữ liệu hoặc ghi chú: %p', async (body) => {
      const res = makeResponse();
      await controller.createDeckLog(makeRequest({ body }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Vui lòng nhập ít nhất 1 dòng dữ liệu hoặc ghi chú' });
    });

    test('trả 404 khi ca trực không tồn tại', async () => {
      mockModels.Shift.findByPk.mockResolvedValue(null);
      const res = makeResponse();
      await controller.createDeckLog(makeRequest({ body: { shiftId: 2, note: 'Ghi chú' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test.each([-1, 1.5])('từ chối giờ không hợp lệ: %p', async (hour) => {
      const res = makeResponse();
      await controller.createDeckLog(makeRequest({ body: { shiftId: 2, entries: [validEntry({ hour })] } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Giờ ghi nhật ký không hợp lệ' });
    });

    test('từ chối hai dòng trùng giờ', async () => {
      const res = makeResponse();
      await controller.createDeckLog(makeRequest({ body: {
        shiftId: 2, entries: [validEntry({ hour: 1 }), validEntry({ hour: 1 })],
      } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Không được nhập trùng giờ trong cùng nhật ký' });
    });

    test('từ chối giờ ngoài ca đã chọn', async () => {
      const res = makeResponse();
      await controller.createDeckLog(makeRequest({ body: { shiftId: 2, entries: [validEntry({ hour: 5 })] } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Giờ ghi không thuộc ca trực đã chọn' });
    });

    test('từ chối giờ trong tương lai dù thuộc ca', async () => {
      const res = makeResponse();
      await controller.createDeckLog(makeRequest({ body: { shiftId: 2, entries: [validEntry({ hour: 3 })] } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Không thể ghi dữ liệu cho giờ trong tương lai' });
    });

    test.each([
      ['courseTrue', -1, 'Giá trị courseTrue nhỏ hơn giới hạn cho phép'],
      ['windForce', 13, 'Giá trị windForce vượt quá giới hạn cho phép'],
      ['seaState', 10, 'Giá trị seaState vượt quá giới hạn cho phép'],
      ['visibility', 10, 'Giá trị visibility vượt quá giới hạn cho phép'],
    ])('từ chối %s=%p', async (field, value, message) => {
      const res = makeResponse();
      await controller.createDeckLog(makeRequest({ body: {
        shiftId: 2, entries: [validEntry({ [field]: value })],
      } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message });
    });

    test.each([
      ['windDirection', 'North', 'Hướng gió không hợp lệ'],
      ['weather', 'sunny', 'Mã thời tiết không hợp lệ'],
    ])('từ chối mã %s không hợp lệ', async (field, value, message) => {
      const res = makeResponse();
      await controller.createDeckLog(makeRequest({ body: {
        shiftId: 2, entries: [validEntry({ [field]: value })],
      } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message });
    });

    test('tạo nhật ký chỉ có ghi chú thành công', async () => {
      const res = makeResponse();
      await controller.createDeckLog(makeRequest({ body: { shiftId: 2, note: 'Ca trực bình thường', entries: [] } }), res);
      expect(mockModels.DeckLogEntry.bulkCreate).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('tạo nhật ký có đầy đủ dòng dữ liệu thành công', async () => {
      const res = makeResponse();
      await controller.createDeckLog(makeRequest({ body: {
        shiftId: 2, note: 'Ca trực bình thường', entries: [validEntry()],
      } }), res);
      expect(mockModels.DeckLogEntry.bulkCreate).toHaveBeenCalledWith([
        expect.objectContaining({ deckLogId: 12, hour: 1, windForce: 4, visibility: 8 }),
      ]);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Ghi nhận nhật ký boong thành công' }));
    });

    test('trả 500 khi tạo nhật ký lỗi', async () => {
      mockModels.ShiftLog.create.mockRejectedValue(new Error('create failed'));
      const res = makeResponse();
      await controller.createDeckLog(makeRequest({ body: { shiftId: 2, entries: [validEntry()] } }), res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Lỗi máy chủ khi tạo nhật ký boong' });
    });
  });

  describe('Deck Log.updateDeckLog', () => {
    const validBody = () => ({
      note: 'Đã hiệu chỉnh', editReason: 'Đối chiếu thiết bị', entries: [validEntry()],
    });

    test.each([''])('từ chối lý do chỉnh sửa rỗng: %p', async (editReason) => {
      const res = makeResponse();
      await controller.updateDeckLog(makeRequest({
        params: { shiftLogId: '11' }, authorizedShift: shift, body: { ...validBody(), editReason },
      }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('từ chối entries không phải mảng', async () => {
      const res = makeResponse();
      await controller.updateDeckLog(makeRequest({
        params: { shiftLogId: '11' }, authorizedShift: shift,
        body: { editReason: 'Hiệu chỉnh', entries: {} },
      }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Danh sách dữ liệu boong không hợp lệ' });
    });

    test('trả 404 khi không tìm thấy nhật ký boong', async () => {
      mockModels.ShiftLog.findByPk.mockResolvedValue(null);
      const res = makeResponse();
      await controller.updateDeckLog(makeRequest({
        params: { shiftLogId: '11' }, authorizedShift: shift, body: validBody(),
      }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('từ chối dòng dữ liệu mới không hợp lệ', async () => {
      const res = makeResponse();
      await controller.updateDeckLog(makeRequest({
        params: { shiftLogId: '11' }, authorizedShift: shift,
        body: { ...validBody(), entries: [validEntry({ windForce: 5.5 })] },
      }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Giá trị windForce phải là số nguyên' });
    });

    test('từ chối xóa cả dữ liệu và ghi chú', async () => {
      const res = makeResponse();
      await controller.updateDeckLog(makeRequest({
        params: { shiftLogId: '11' }, authorizedShift: shift,
        body: { editReason: 'Xóa nhầm', note: '', entries: [] },
      }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Nhật ký phải có ít nhất một dòng dữ liệu hoặc ghi chú' });
    });

    test.each([new Date(2026, 7, 20, 0, 0, 0)])('từ chối nhật ký ngoài cửa sổ 24 giờ: %p', async (createdAt) => {
      shiftLog.createdAt = createdAt;
      const res = makeResponse();
      await controller.updateDeckLog(makeRequest({
        params: { shiftLogId: '11' }, authorizedShift: shift, body: validBody(),
      }), res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Nhật ký đã quá 24 giờ và không thể chỉnh sửa' });
    });

    test('lưu lịch sử rồi cập nhật nhật ký trong 24 giờ', async () => {
      const res = makeResponse();
      await controller.updateDeckLog(makeRequest({
        params: { shiftLogId: '11' }, authorizedShift: shift, body: validBody(),
      }), res);
      expect(mockModels.LogEditHistory.create).toHaveBeenCalledWith(expect.objectContaining({
        logType: 'Deck', shiftLogId: 11, editReason: 'Đối chiếu thiết bị', editedBy: 28,
      }));
      expect(shiftLog.DeckLog.update).toHaveBeenCalledWith({ note: 'Đã hiệu chỉnh' });
      expect(mockModels.DeckLogEntry.destroy).toHaveBeenCalledWith({ where: { deckLogId: 12 } });
      expect(res.json).toHaveBeenCalledWith({ message: 'Cập nhật nhật ký thành công' });
    });

    test('cho phép chỉ sửa ghi chú mà giữ nguyên entries', async () => {
      const res = makeResponse();
      await controller.updateDeckLog(makeRequest({
        params: { shiftLogId: '11' }, authorizedShift: shift,
        body: { note: 'Ghi chú mới', editReason: 'Bổ sung mô tả' },
      }), res);
      expect(mockModels.DeckLogEntry.destroy).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Cập nhật nhật ký thành công' });
    });

    test('trả 500 khi lưu lịch sử lỗi', async () => {
      mockModels.LogEditHistory.create.mockRejectedValue(new Error('history failed'));
      const res = makeResponse();
      await controller.updateDeckLog(makeRequest({
        params: { shiftLogId: '11' }, authorizedShift: shift, body: validBody(),
      }), res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Lỗi máy chủ khi cập nhật nhật ký boong' });
    });
  });

  describe('Deck Log.getEditHistory', () => {
    test.each([[[{ id: 1, editReason: 'Hiệu chỉnh' }]]])('trả danh sách lịch sử chỉnh sửa: %p', async (history) => {
      mockModels.LogEditHistory.findAll.mockResolvedValue(history);
      const res = makeResponse();
      await controller.getEditHistory(makeRequest({ params: { shiftLogId: '11' } }), res);
      expect(mockModels.LogEditHistory.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { shiftLogId: '11' } }));
      expect(res.json).toHaveBeenCalledWith(history);
    });

    test('trả 500 khi lấy lịch sử chỉnh sửa lỗi', async () => {
      mockModels.LogEditHistory.findAll.mockRejectedValue(new Error('lookup failed'));
      const res = makeResponse();
      await controller.getEditHistory(makeRequest({ params: { shiftLogId: '11' } }), res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Lỗi máy chủ khi lấy lịch sử chỉnh sửa nhật ký boong' });
    });
  });
});
