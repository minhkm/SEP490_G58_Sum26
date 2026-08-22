const express = require('express');
const request = require('supertest');

const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
const mockModels = {
  sequelize: { transaction: jest.fn() },
  Voyage: { findOne: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
  VoyageCrew: { findAll: jest.fn(), findOne: jest.fn(), create: jest.fn() },
  Cargo: { findAll: jest.fn(), findByPk: jest.fn(), update: jest.fn() },
  ShipCapacity: { findOne: jest.fn() },
  CrewProfile: { findAll: jest.fn() },
  User: {},
  Equipment: { findAll: jest.fn(), findByPk: jest.fn(), bulkCreate: jest.fn() },
  Attendance: {},
  Port: {},
  Route: {},
  RouteWaypoint: {},
  SewageRequest: {},
};

jest.mock('../../src/models', () => mockModels);
jest.mock('../../src/middlewares/authMiddleware', () => (req, res, next) => {
  req.user = {
    id: 1,
    role: req.headers['x-test-role'] || 'Admin',
    profileId: Number(req.headers['x-test-profile'] || 10),
  };
  next();
});
jest.mock('../../src/services/notificationService', () => new Proxy({}, {
  get: () => jest.fn().mockResolvedValue(undefined),
}));

const voyageRoutes = require('../../src/routes/voyageRoutes');
const app = express();
app.use(express.json());
app.use('/api/voyages', voyageRoutes);

const validMedicalSupplies = () => [
  { name: 'Paracetamol', quantity: 10, expiryNote: '2099-12-31' },
  { name: 'Băng gạc', quantity: 20, expiryNote: 'Không có hạn sử dụng' },
  { name: 'Oxy già', quantity: 5, expiryNote: '2099-12-31' },
  { name: 'Nước muối', quantity: 12, expiryNote: '2099-12-31' },
  { name: 'Thuốc chống say', quantity: 8, expiryNote: '2099-12-31' },
];

const validVoyageBody = () => ({
  shipId: 9,
  routeInfo: {
    departurePort: 'Cảng Sài Gòn',
    destinationPort: 'Cảng Đà Nẵng',
    departureDate: '2026-09-01',
    arrivalDate: '2026-09-10',
  },
  cargoList: [],
  crewList: [],
  equipmentList: validMedicalSupplies(),
});

describe('Voyage Medical Supplies', () => {
  let consoleError;

  beforeAll(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterAll(() => consoleError.mockRestore());

  beforeEach(() => {
    jest.clearAllMocks();
    mockModels.sequelize.transaction.mockResolvedValue(mockTransaction);
    mockModels.Voyage.findOne.mockResolvedValue(null);
    mockModels.Cargo.findAll.mockResolvedValue([]);
    mockModels.ShipCapacity.findOne.mockResolvedValue(null);
    mockModels.VoyageCrew.findAll.mockResolvedValue([]);
    mockModels.CrewProfile.findAll.mockResolvedValue([]);
    mockModels.Voyage.create.mockResolvedValue({ id: 7, update: jest.fn().mockResolvedValue(undefined) });
    mockModels.Equipment.bulkCreate.mockResolvedValue([]);
    mockModels.Equipment.findAll.mockResolvedValue([]);
  });

  describe('Voyage.createVoyage - phạm vi vật tư y tế', () => {
    test('chỉ Admin được tạo hải trình', async () => {
      const response = await request(app).post('/api/voyages').set('x-test-role', 'Master').send(validVoyageBody());
      expect(response.status).toBe(403);
      expect(mockModels.Voyage.create).not.toHaveBeenCalled();
    });

    test('từ chối tàu đang có hải trình chưa hoàn thành', async () => {
      mockModels.Voyage.findOne.mockResolvedValue({ id: 1 });
      const response = await request(app).post('/api/voyages').send(validVoyageBody());
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Tàu này đang thực hiện một hải trình khác');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    test.each([
      ['ngày đến bằng ngày đi', (b) => { b.routeInfo.arrivalDate = b.routeInfo.departureDate; }, 'Ngày đến dự kiến phải sau ngày khởi hành'],
      ['chỉ có bốn loại vật tư', (b) => { b.equipmentList.pop(); }, 'ít nhất 5 loại vật tư y tế'],
      ['một vật tư có số lượng 0', (b) => { b.equipmentList[0].quantity = 0; }, 'ít nhất 5 loại vật tư y tế'],
      ['một vật tư có tên rỗng', (b) => { b.equipmentList[0].name = ' '; }, 'ít nhất 5 loại vật tư y tế'],
      ['trùng tên vật tư không phân biệt hoa thường', (b) => { b.equipmentList[1].name = ' paracetamol '; }, 'bị trùng tên'],
      ['hạn sử dụng không ở tương lai', (b) => { b.equipmentList[0].expiryNote = '2020-01-01'; }, 'phải sau ngày hiện tại'],
    ])('từ chối khi %s', async (_label, mutate, message) => {
      const body = validVoyageBody();
      mutate(body);
      const response = await request(app).post('/api/voyages').send(body);
      expect(response.status).toBe(400);
      expect(response.body.message).toContain(message);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    test('tạo đúng năm loại vật tư và lưu loại Vật tư y tế', async () => {
      const response = await request(app).post('/api/voyages').send(validVoyageBody());
      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Khởi tạo hải trình thành công');
      const records = mockModels.Equipment.bulkCreate.mock.calls[0][0];
      expect(records).toHaveLength(5);
      expect(records.every((item) => item.voyageId === 7 && item.shipId === null)).toBe(true);
      expect(records.every((item) => item.equipmentType === 'Vật tư y tế')).toBe(true);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

  });

  describe('Voyage.getVoyageEquipments', () => {
    test('trả vật tư của đúng hải trình', async () => {
      mockModels.Equipment.findAll.mockResolvedValue([{ id: 11, equipmentName: 'Paracetamol' }]);
      const response = await request(app).get('/api/voyages/7/equipments');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([{ id: 11, equipmentName: 'Paracetamol' }]);
      expect(mockModels.Equipment.findAll).toHaveBeenCalledWith({ where: { voyageId: '7' } });
    });

    test('trả danh sách rỗng nếu chưa có vật tư', async () => {
      const response = await request(app).get('/api/voyages/7/equipments');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

  });

  describe('Voyage.updateVoyageBrokenCount', () => {
    const endpoint = '/api/voyages/equipments/11/broken-count';
    let supply;
    let voyage;

    beforeEach(() => {
      supply = {
        id: 11,
        voyageId: 7,
        equipmentName: 'Paracetamol',
        quantity: 10,
        brokenCount: 3,
        expiryNote: '2099-12-31',
        update: jest.fn(async (data) => Object.assign(supply, data)),
      };
      voyage = { id: 7, status: 'Underway' };
      mockModels.Equipment.findByPk.mockResolvedValue(supply);
      mockModels.Voyage.findByPk.mockResolvedValue(voyage);
      mockModels.VoyageCrew.findOne.mockResolvedValue({ role: 'Master' });
    });

    test.each([0, 1.5, 'abc'])('từ chối số lượng dùng thêm không hợp lệ: %s', async (value) => {
      const response = await request(app).patch(endpoint).send({ brokenCount: value });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Số lượng sử dụng thêm phải là số nguyên dương');
    });

    test('trả 404 khi vật tư không tồn tại', async () => {
      mockModels.Equipment.findByPk.mockResolvedValue(null);
      const response = await request(app).patch(endpoint).send({ brokenCount: 1 });
      expect(response.status).toBe(404);
    });

    test('từ chối EngineOfficer không được phân công quản lý vật tư', async () => {
      mockModels.VoyageCrew.findOne.mockResolvedValue({ role: 'EngineOfficer' });
      const response = await request(app).patch(endpoint).send({ brokenCount: 1 });
      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Thuyền trưởng hoặc Đại phó');
    });

    test('trả 404 khi không tìm thấy hải trình của vật tư', async () => {
      mockModels.Voyage.findByPk.mockResolvedValue(null);
      const response = await request(app).patch(endpoint).send({ brokenCount: 1 });
      expect(response.status).toBe(404);
      expect(response.body.message).toContain('hải trình của vật tư y tế');
    });

    test('từ chối khi hải trình chưa di chuyển', async () => {
      voyage.status = 'Planning';
      const response = await request(app).patch(endpoint).send({ brokenCount: 1 });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('đang di chuyển, neo đậu hoặc quay về');
    });

    test('từ chối vật tư hết hạn nếu vẫn còn tồn', async () => {
      supply.expiryNote = '2020-01-01';
      const response = await request(app).patch(endpoint).send({ brokenCount: 1 });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('đã hết hạn sử dụng');
    });

    test('từ chối số dùng thêm vượt tồn kho còn lại', async () => {
      const response = await request(app).patch(endpoint).send({ brokenCount: 8 });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Chỉ còn 7 vật tư có thể ghi nhận đã sử dụng');
    });

    test('Master được cộng dồn số vật tư đã dùng', async () => {
      mockModels.VoyageCrew.findOne.mockResolvedValue({ role: 'Master' });
      const response = await request(app).patch(endpoint).send({ brokenCount: 2 });
      expect(response.status).toBe(200);
      expect(supply.update).toHaveBeenCalledWith({ brokenCount: 5 });
      expect(response.body.message).toBe('Ghi nhận số vật tư đã dùng thành công');
    });

  });
});
