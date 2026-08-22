const express = require('express');
const request = require('supertest');

const mockTransaction = {
  commit: jest.fn(),
  rollback: jest.fn(),
  finished: false,
};

const mockModels = {
  sequelize: { transaction: jest.fn() },
  Ship: { findAll: jest.fn(), findByPk: jest.fn(), findOne: jest.fn(), create: jest.fn() },
  ShipCapacity: { create: jest.fn(), findOne: jest.fn() },
  Engine: { findByPk: jest.fn(), create: jest.fn(), findAll: jest.fn() },
  EngineParameter: { bulkCreate: jest.fn() },
  CargoHold: { bulkCreate: jest.fn() },
  Equipment: { findAll: jest.fn(), findByPk: jest.fn(), bulkCreate: jest.fn() },
  Voyage: { findAll: jest.fn(), findByPk: jest.fn(), findOne: jest.fn() },
  VoyageCrew: { findOne: jest.fn() },
  Attendance: { count: jest.fn() },
};

const mockJwt = { verify: jest.fn() };

jest.mock('../../src/models', () => mockModels);
jest.mock('jsonwebtoken', () => mockJwt);
jest.mock('../../src/middlewares/authMiddleware', () => (req, res, next) => {
  req.user = {
    id: 1,
    role: req.headers['x-test-role'] || 'Admin',
    profileId: Number(req.headers['x-test-profile'] || 10),
  };
  next();
});

const vesselRoutes = require('../../src/routes/vesselRoutes');

const requiredParameters = () => [
  { name: 'Áp suất dầu nhiên liệu (kg/cm²)', maxValue: 6 },
  { name: 'Nhiệt độ khí xả XL2 (°C)', maxValue: 420 },
  { name: 'Nhiệt độ nước làm mát (°C)', maxValue: 75 },
];

const validEquipment = () => [
  { equipmentName: 'Áo phao', equipmentType: 'Thiết bị cứu sinh', quantity: 2, expiryNote: 'Không có hạn sử dụng' },
  { equipmentName: 'Phao tròn', equipmentType: 'Thiết bị cứu sinh', quantity: 2, expiryNote: 'Không có hạn sử dụng' },
  { equipmentName: 'Bình chữa cháy', equipmentType: 'Thiết bị chữa cháy', quantity: 2, expiryNote: '2099-12-31' },
  { equipmentName: 'La bàn', equipmentType: 'Thiết bị hàng hải', quantity: 1, expiryNote: 'Không có hạn sử dụng' },
  { equipmentName: 'Ra-đa', equipmentType: 'Thiết bị hàng hải', quantity: 1, expiryNote: 'Không có hạn sử dụng' },
];

const validVesselBody = () => ({
  basicInfo: { shipName: 'Hải Đăng 01', imoNumber: '1234567', flag: 'Việt Nam', status: 'Operational' },
  capacity: { maxWeight: 1000, maxVolume: 2000, minCrew: 10, maxCrew: 25 },
  mainEngine: { engineName: 'Máy chính 01', status: 'Hoạt động', parameters: requiredParameters() },
  generatorEngines: [{ engineName: 'Máy phụ 01', status: 'Dự phòng', parameters: requiredParameters() }],
  holds: [{ name: 'Khoang số 1', capacity: 500 }],
  equipmentList: validEquipment(),
});

const app = express();
app.use(express.json());
app.use('/api/vessels', vesselRoutes);

describe('Vessel Routes', () => {
  let consoleError;

  beforeAll(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => consoleError.mockRestore());

  beforeEach(() => {
    jest.clearAllMocks();
    mockTransaction.finished = false;
    mockModels.sequelize.transaction.mockResolvedValue(mockTransaction);
    mockModels.Ship.findOne.mockResolvedValue(null);
    mockModels.Ship.create.mockResolvedValue({ id: 9, shipName: 'Hải Đăng 01' });
    mockModels.ShipCapacity.create.mockResolvedValue({});
    mockModels.Engine.create
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ id: 2 });
    mockModels.EngineParameter.bulkCreate.mockResolvedValue([]);
    mockModels.CargoHold.bulkCreate.mockResolvedValue([]);
    mockModels.Equipment.bulkCreate.mockResolvedValue([]);
    mockModels.Equipment.findAll.mockResolvedValue([]);
    mockModels.Voyage.findOne.mockResolvedValue(null);
    mockModels.VoyageCrew.findOne.mockResolvedValue(null);
    mockModels.Attendance.count.mockResolvedValue(0);
    mockJwt.verify.mockReturnValue({ id: 5, profileId: 10, role: 'EngineOfficer' });
  });

  describe('Vessel.createVessel', () => {
    test.each([
      ['tên tàu rỗng', (b) => { b.basicInfo.shipName = ' '; }, 400, 'Tên tàu và mã số IMO là bắt buộc.'],
      ['chỉ có bốn loại thiết bị', (b) => { b.equipmentList.pop(); }, 400, 'Vui lòng thêm ít nhất 5 loại thiết bị cho tàu.'],
      ['số lượng thiết bị bằng 0', (b) => { b.equipmentList[0].quantity = 0; }, 400, 'số lượng phải là số nguyên'],
      ['số lượng thiết bị là số thập phân', (b) => { b.equipmentList[0].quantity = 1.5; }, 400, 'số lượng phải là số nguyên'],
      ['thiết bị trùng tên và loại', (b) => { b.equipmentList[1] = { ...b.equipmentList[0] }; }, 400, 'bị trùng tên và loại thiết bị'],
      ['hạn sử dụng không ở tương lai', (b) => { b.equipmentList[0].expiryNote = '2020-01-01'; }, 400, 'phải sau ngày hiện tại'],
      ['tải trọng bằng 0', (b) => { b.capacity.maxWeight = 0; }, 400, 'Tải trọng tối đa và thể tích tối đa'],
      ['không có khoang hàng', (b) => { b.holds = []; }, 400, 'Tàu phải có ít nhất một khoang'],
      ['sức chứa khoang âm', (b) => { b.holds[0].capacity = -1; }, 400, 'sức chứa phải là số nguyên'],
      ['tổng khoang vượt thể tích tàu', (b) => { b.holds[0].capacity = 2500; }, 400, 'không được vượt quá thể tích'],
      ['máy chính thiếu thông số bắt buộc', (b) => { b.mainEngine.parameters.pop(); }, 400, 'hạn mức chỉ số an toàn'],
      ['máy chính ở trạng thái dự phòng', (b) => { b.mainEngine.status = 'Dự phòng'; }, 400, 'Máy chính mới bắt buộc'],
      ['tên máy chính và máy phụ trùng nhau', (b) => { b.generatorEngines[0].engineName = b.mainEngine.engineName; }, 400, 'bị trùng'],
    ])('từ chối khi %s', async (_label, mutate, status, message) => {
      const body = validVesselBody();
      mutate(body);
      const response = await request(app).post('/api/vessels').send(body);
      expect(response.status).toBe(status);
      expect(response.body.message).toContain(message);
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });

    test('từ chối IMO đã tồn tại', async () => {
      mockModels.Ship.findOne.mockResolvedValue({ id: 1 });
      const response = await request(app).post('/api/vessels').send(validVesselBody());
      expect(response.status).toBe(409);
      expect(response.body.message).toBe('Mã số IMO đã được sử dụng cho một tàu khác.');
    });

    test('chỉ Admin được tạo tàu', async () => {
      const response = await request(app)
        .post('/api/vessels')
        .set('x-test-role', 'Master')
        .send(validVesselBody());
      expect(response.status).toBe(403);
      expect(mockModels.Ship.create).not.toHaveBeenCalled();
    });

    test('tạo tàu và toàn bộ cấu hình trong một transaction', async () => {
      const response = await request(app).post('/api/vessels').send(validVesselBody());
      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Tạo tàu thành công');
      expect(mockModels.Ship.create).toHaveBeenCalled();
      expect(mockModels.Engine.create).toHaveBeenCalledTimes(2);
      expect(mockModels.EngineParameter.bulkCreate).toHaveBeenCalledTimes(2);
      expect(mockModels.CargoHold.bulkCreate).toHaveBeenCalledTimes(1);
      expect(mockModels.Equipment.bulkCreate).toHaveBeenCalledTimes(1);
      expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    });

  });

  describe('Vessel.createVesselEquipments', () => {
    const endpoint = '/api/vessels/9/equipments';

    beforeEach(() => {
      mockModels.Ship.findByPk.mockResolvedValue({ id: 9 });
      mockModels.Equipment.findAll.mockResolvedValue([]);
      mockModels.Equipment.bulkCreate.mockResolvedValue([{ id: 1, equipmentName: 'Ra-đa' }]);
    });

    test('từ chối role không phải Admin', async () => {
      const response = await request(app).post(endpoint).set('x-test-role', 'Master').send({ equipmentList: validEquipment() });
      expect(response.status).toBe(403);
    });

    test('trả 404 khi tàu không tồn tại', async () => {
      mockModels.Ship.findByPk.mockResolvedValue(null);
      const response = await request(app).post(endpoint).send({ equipmentList: validEquipment() });
      expect(response.status).toBe(404);
    });

    test.each([
      ['danh sách rỗng', [], 'Danh sách thiết bị không được để trống'],
      ['tên rỗng', [{ equipmentName: '', equipmentType: 'A', quantity: 1 }], 'Tên thiết bị tối đa'],
      ['số lượng 0', [{ equipmentName: 'Ra-đa', equipmentType: 'A', quantity: 0 }], 'số lượng phải là số nguyên'],
    ])('từ chối %s', async (_label, equipmentList, message) => {
      const response = await request(app).post(endpoint).send({ equipmentList });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain(message);
    });

    test('từ chối dữ liệu trùng trong cùng danh sách', async () => {
      const item = { equipmentName: 'Ra-đa', equipmentType: 'Thiết bị hàng hải', quantity: 1, expiryNote: 'Không có hạn sử dụng' };
      const response = await request(app).post(endpoint).send({ equipmentList: [item, { ...item }] });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('bị trùng tên và loại');
    });

    test('từ chối thiết bị đã tồn tại trên tàu', async () => {
      mockModels.Equipment.findAll.mockResolvedValue([{ equipmentName: 'Ra-đa', equipmentType: 'Thiết bị hàng hải' }]);
      const response = await request(app).post(endpoint).send({ equipmentList: [{ equipmentName: ' Ra-đa ', equipmentType: 'Thiết bị hàng hải', quantity: 1, expiryNote: 'Không có hạn sử dụng' }] });
      expect(response.status).toBe(409);
      expect(response.body.message).toContain('đã tồn tại trên tàu');
    });

    test('Admin tạo thiết bị hợp lệ', async () => {
      const response = await request(app).post(endpoint).send({ equipmentList: validEquipment() });
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Tạo thiết bị tàu thành công');
      expect(mockModels.Equipment.bulkCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Vessel.getVesselEquipments', () => {
    test('trả danh sách thiết bị của đúng tàu', async () => {
      mockModels.Equipment.findAll.mockResolvedValue([{ id: 1, equipmentName: 'Ra-đa' }]);
      const response = await request(app).get('/api/vessels/9/equipments');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([{ id: 1, equipmentName: 'Ra-đa' }]);
      expect(mockModels.Equipment.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { shipId: '9' } }));
    });

  });

  describe('Vessel.updateVesselBrokenCount', () => {
    const endpoint = '/api/vessels/equipments/3/broken-count';
    let equipment;
    let voyage;

    beforeEach(() => {
      equipment = {
        id: 3,
        shipId: 9,
        equipmentName: 'Bình chữa cháy',
        quantity: 5,
        brokenCount: 1,
        expiryNote: '2099-12-31',
        update: jest.fn(async (data) => Object.assign(equipment, data)),
      };
      voyage = { id: 1, shipId: 9, status: 'Underway' };
      mockModels.Equipment.findByPk.mockResolvedValue(equipment);
      mockModels.Voyage.findOne.mockResolvedValue(voyage);
      mockModels.VoyageCrew.findOne.mockResolvedValue({ role: 'Master' });
    });

    test.each([0, 1.5, 'abc'])('từ chối số lượng hỏng không hợp lệ: %s', async (value) => {
      const response = await request(app).patch(endpoint).send({ brokenCount: value });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Số lượng hỏng mới phải là số nguyên dương');
    });

    test('trả 404 khi thiết bị không tồn tại', async () => {
      mockModels.Equipment.findByPk.mockResolvedValue(null);
      const response = await request(app).patch(endpoint).send({ brokenCount: 1 });
      expect(response.status).toBe(404);
    });

    test('từ chối người không được phân công Master hoặc ChiefOfficer', async () => {
      mockModels.VoyageCrew.findOne.mockResolvedValue({ role: 'Sailor' });
      const response = await request(app).patch(endpoint).send({ brokenCount: 1 });
      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Thuyền trưởng hoặc Đại phó');
    });

    test('từ chối khi hải trình chưa di chuyển', async () => {
      voyage.status = 'Planning';
      const response = await request(app).patch(endpoint).send({ brokenCount: 1 });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('đang di chuyển, neo đậu hoặc quay về');
    });

    test('từ chối thiết bị đã hết hạn nhưng vẫn còn hàng tốt', async () => {
      equipment.expiryNote = '2020-01-01';
      const response = await request(app).patch(endpoint).send({ brokenCount: 1 });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('đã hết hạn sử dụng');
    });

    test('từ chối số phát sinh vượt số còn tốt', async () => {
      const response = await request(app).patch(endpoint).send({ brokenCount: 5 });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Chỉ còn 4 thiết bị tốt có thể ghi nhận hỏng');
    });

    test('Master được cộng dồn số lượng hỏng', async () => {
      mockModels.VoyageCrew.findOne.mockResolvedValue({ role: 'Master' });
      const response = await request(app).patch(endpoint).send({ brokenCount: 2 });
      expect(response.status).toBe(200);
      expect(equipment.update).toHaveBeenCalledWith({ brokenCount: 3 });
      expect(response.body.message).toBe('Ghi nhận số lượng hỏng mới thành công');
    });
  });

  describe('Vessel.updateEngineStatus', () => {
    const endpoint = '/api/vessels/engines/7/status';
    let engine;
    let voyage;

    beforeEach(() => {
      engine = {
        id: 7,
        shipId: 3,
        engineName: 'Máy phụ 01',
        engineType: 'Máy phụ',
        status: 'Hoạt động',
        update: jest.fn(async (data) => Object.assign(engine, data)),
      };
      voyage = {
        id: 1,
        shipId: 3,
        status: 'Underway',
        update: jest.fn(async (data) => Object.assign(voyage, data)),
      };
      mockModels.Engine.findByPk.mockResolvedValue(engine);
      mockModels.Voyage.findByPk.mockResolvedValue(voyage);
      mockModels.VoyageCrew.findOne.mockResolvedValue({ role: 'EngineOfficer' });
    });

    test('yêu cầu Authorization header', async () => {
      const response = await request(app).patch(endpoint).send({ status: 'Dự phòng', voyageId: 1 });
      expect(response.status).toBe(401);
    });

    test('từ chối trạng thái không hỗ trợ', async () => {
      const response = await request(app).patch(endpoint).set('Authorization', 'Bearer token').send({ status: 'Stopped', voyageId: 1 });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Trạng thái không hợp lệ');
    });

    test('trả 404 khi máy không tồn tại', async () => {
      mockModels.Engine.findByPk.mockResolvedValue(null);
      const response = await request(app).patch(endpoint).set('Authorization', 'Bearer token').send({ status: 'Dự phòng', voyageId: 1 });
      expect(response.status).toBe(404);
    });

    test('từ chối khi hải trình không ở trạng thái vận hành', async () => {
      voyage.status = 'Planning';
      const response = await request(app).patch(endpoint).set('Authorization', 'Bearer token').send({ status: 'Dự phòng', voyageId: 1 });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Chỉ được đổi trạng thái máy');
    });

    test('từ chối EngineOfficer không được phân công đúng hải trình', async () => {
      mockModels.VoyageCrew.findOne.mockResolvedValue(null);
      const response = await request(app).patch(endpoint).set('Authorization', 'Bearer token').send({ status: 'Dự phòng', voyageId: 1 });
      expect(response.status).toBe(403);
      expect(response.body.message).toContain('được phân công trong hải trình');
    });

    test('máy chính không được chuyển sang Dự phòng', async () => {
      engine.engineType = 'Máy chính';
      const response = await request(app).patch(endpoint).set('Authorization', 'Bearer token').send({ status: 'Dự phòng', voyageId: 1 });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Máy chính không có trạng thái Dự phòng');
    });

    test('đổi trạng thái máy phụ không làm đổi trạng thái hải trình', async () => {
      const response = await request(app).patch(endpoint).set('Authorization', 'Bearer token').send({ status: 'Dự phòng', voyageId: 1 });
      expect(response.status).toBe(200);
      expect(engine.update).toHaveBeenCalledWith({ status: 'Dự phòng' });
      expect(voyage.update).not.toHaveBeenCalled();
      expect(response.body.voyageUpdated).toBe(false);
    });

    test('máy chính bảo dưỡng tự động chuyển hải trình sang neo đậu', async () => {
      engine.engineType = 'Máy chính';
      const response = await request(app).patch(endpoint).set('Authorization', 'Bearer token').send({ status: 'Đang bảo dưỡng', voyageId: 1 });
      expect(response.status).toBe(200);
      expect(voyage.update).toHaveBeenCalledWith({ status: 'Anchored' });
      expect(response.body.newVoyageStatus).toBe('Anchored');
    });

    test('máy chính hoạt động lại khôi phục trạng thái hải trình', async () => {
      engine.engineType = 'Máy chính';
      engine.status = 'Đang bảo dưỡng';
      voyage.status = 'Anchored';
      mockModels.Attendance.count.mockResolvedValue(0);
      const response = await request(app).patch(endpoint).set('Authorization', 'Bearer token').send({ status: 'Hoạt động', voyageId: 1 });
      expect(response.status).toBe(200);
      expect(voyage.update).toHaveBeenCalledWith({ status: 'Underway' });
      expect(response.body.newVoyageStatus).toBe('Underway');
    });
  });
});
