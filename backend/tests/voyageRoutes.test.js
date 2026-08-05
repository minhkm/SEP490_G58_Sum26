const express = require('express');
const request = require('supertest');

const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
const model = () => ({
  findOne: jest.fn(), findAll: jest.fn(), findByPk: jest.fn(),
  create: jest.fn(), update: jest.fn(), bulkCreate: jest.fn(), count: jest.fn(),
});
const mockModels = {
  sequelize: { transaction: jest.fn() },
  Voyage: model(), User: model(), CrewProfile: model(), VoyageCrew: model(), Ship: model(),
  Attendance: model(), Cargo: model(), CargoItem: model(), CargoOperation: model(),
  ShipCapacity: model(), CargoHold: model(), CargoAllocation: model(), Equipment: model(),
};

jest.mock('../src/models', () => mockModels);
jest.mock('../src/middlewares/authMiddleware', () => (req, _res, next) => {
  req.user = { role: req.get('x-test-role') || 'Admin', id: 1, profileId: 10 };
  next();
});
jest.mock('../src/services/emailService', () => ({
  sendCrewCredentialsEmail: jest.fn(),
  sendRouteApprovalEmail: jest.fn(),
}));
jest.mock('../src/services/notificationService', () => ({
  notifyCrewAssignedToVoyage: jest.fn(),
  notifyAttendanceUpdated: jest.fn(),
  notifyVoyageUpdated: jest.fn(),
}));

const voyageRoutes = require('../src/routes/voyageRoutes');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/', voyageRoutes);
  return app;
}

describe('voyageRoutes', () => {
  let app;

  beforeEach(() => {
    app = makeApp();
    jest.clearAllMocks();
    mockModels.sequelize.transaction.mockResolvedValue(mockTransaction);
    mockModels.Voyage.findOne.mockResolvedValue(null);
    mockModels.Cargo.findAll.mockResolvedValue([]);
  });

  test('POST / rejects arrival date equal to departure date and rolls back', async () => {
    const response = await request(app).post('/').send({
      shipId: 2,
      routeInfo: {
        departurePort: 'Hai Phong', destinationPort: 'Da Nang',
        departureDate: '2026-08-10', arrivalDate: '2026-08-10',
      },
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Ngày đến dự kiến phải sau');
    expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
    expect(mockModels.Voyage.create).not.toHaveBeenCalled();
  });

  test('POST / rejects ship that already has an unfinished voyage', async () => {
    mockModels.Voyage.findOne.mockResolvedValue({ id: 77, status: 'Underway' });

    const response = await request(app).post('/').send({
      shipId: 2,
      routeInfo: {
        departurePort: 'Hai Phong', destinationPort: 'Da Nang',
        departureDate: '2026-08-10', arrivalDate: '2026-08-12',
      },
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('hải trình khác chưa hoàn thành');
    expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
  });

  test('POST / creates voyage and medical supplies in one transaction', async () => {
    const voyage = { id: 50, status: 'Planning' };
    mockModels.Voyage.create.mockResolvedValue(voyage);
    mockModels.Equipment.bulkCreate.mockResolvedValue([]);

    const equipmentList = Array.from({ length: 5 }, (_, index) => ({
      name: `Medical supply ${index + 1}`,
      quantity: index + 1,
      expiryNote: '12/2027',
    }));
    const response = await request(app).post('/').send({
      shipId: 2,
      routeInfo: {
        departurePort: 'Hai Phong', destinationPort: 'Da Nang',
        departureDate: '2026-08-10', arrivalDate: '2026-08-12',
      },
      equipmentList,
    });

    expect(response.status).toBe(201);
    expect(mockModels.Voyage.create).toHaveBeenCalledWith(expect.objectContaining({
      shipId: 2,
      status: 'Planning',
    }), { transaction: mockTransaction });
    expect(mockModels.Equipment.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ voyageId: 50, equipmentType: 'Vật tư y tế', shipId: null }),
      ]),
      { transaction: mockTransaction },
    );
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
  });

  test('POST / rolls back and returns 500 when voyage creation fails', async () => {
    mockModels.Voyage.create.mockRejectedValue(new Error('create failed'));

    const response = await request(app).post('/').send({
      shipId: 2,
      routeInfo: {
        departurePort: 'Hai Phong', destinationPort: 'Da Nang',
        departureDate: '2026-08-10', arrivalDate: '2026-08-12',
      },
      equipmentList: [],
    });

    expect(response.status).toBe(500);
    expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
  });


  test('GET /:id/equipments returns supplies assigned to voyage', async () => {
    const equipments = [{ id: 1, voyageId: 5, equipmentName: 'Bandage' }];
    mockModels.Equipment.findAll.mockResolvedValue(equipments);

    const response = await request(app).get('/5/equipments');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(equipments);
    expect(mockModels.Equipment.findAll).toHaveBeenCalledWith({ where: { voyageId: '5' } });
  });

  test('GET /:id/equipments returns 500 when supply lookup fails', async () => {
    mockModels.Equipment.findAll.mockRejectedValue(new Error('lookup failed'));

    const response = await request(app).get('/5/equipments');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('lookup failed');
  });

  test('PATCH equipment status rejects an unauthorized role', async () => {
    const response = await request(app)
      .patch('/equipments/4/status')
      .set('x-test-role', 'Master')
      .send({ status: 'Broken' });

    expect(response.status).toBe(403);
    expect(mockModels.Equipment.findByPk).not.toHaveBeenCalled();
  });

  test('PATCH equipment status rejects a status outside the accepted list', async () => {
    const response = await request(app)
      .patch('/equipments/4/status')
      .set('x-test-role', 'EngineOfficer')
      .send({ status: 'Standby' });

    expect(response.status).toBe(400);
    expect(mockModels.Equipment.findByPk).not.toHaveBeenCalled();
  });

  test('PATCH equipment status updates existing supply', async () => {
    const equipment = { update: jest.fn().mockResolvedValue() };
    mockModels.Equipment.findByPk.mockResolvedValue(equipment);

    const response = await request(app)
      .patch('/equipments/4/status')
      .set('x-test-role', 'EngineOfficer')
      .send({ status: 'Lost' });

    expect(response.status).toBe(200);
    expect(equipment.update).toHaveBeenCalledWith({ status: 'Lost' });
  });

  test('PATCH equipment status returns 404 when supply does not exist', async () => {
    mockModels.Equipment.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .patch('/equipments/999/status')
      .set('x-test-role', 'EngineOfficer')
      .send({ status: 'Operational' });

    expect(response.status).toBe(404);
  });

  test('PATCH broken-count rejects an unauthorized role', async () => {
    const response = await request(app)
      .patch('/equipments/4/broken-count')
      .set('x-test-role', 'Sailor')
      .send({ brokenCount: 1 });

    expect(response.status).toBe(403);
    expect(mockModels.Equipment.findByPk).not.toHaveBeenCalled();
  });

  test('PATCH broken-count rejects a negative value', async () => {
    const response = await request(app)
      .patch('/equipments/4/broken-count')
      .set('x-test-role', 'Master')
      .send({ brokenCount: -1 });

    expect(response.status).toBe(400);
    expect(mockModels.Equipment.findByPk).not.toHaveBeenCalled();
  });

  test('PATCH broken-count rejects a value greater than total quantity', async () => {
    mockModels.Equipment.findByPk.mockResolvedValue({ quantity: 3, update: jest.fn() });
    const response = await request(app)
      .patch('/equipments/4/broken-count')
      .set('x-test-role', 'ChiefOfficer')
      .send({ brokenCount: 4 });

    expect(response.status).toBe(400);
  });

  test('PATCH broken-count returns 404 when supply does not exist', async () => {
    mockModels.Equipment.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .patch('/equipments/999/broken-count')
      .set('x-test-role', 'Master')
      .send({ brokenCount: 0 });

    expect(response.status).toBe(404);
  });

  test('PATCH broken-count updates a normal value below total quantity', async () => {
    const equipment = { quantity: 3, update: jest.fn().mockResolvedValue() };
    mockModels.Equipment.findByPk.mockResolvedValue(equipment);

    const response = await request(app)
      .patch('/equipments/4/broken-count')
      .set('x-test-role', 'Master')
      .send({ brokenCount: 1 });

    expect(response.status).toBe(200);
    expect(equipment.update).toHaveBeenCalledWith({ brokenCount: 1 });
  });

  test('PATCH broken-count updates boundary value equal to total', async () => {
    const equipment = { quantity: 3, update: jest.fn().mockResolvedValue() };
    mockModels.Equipment.findByPk.mockResolvedValue(equipment);

    const response = await request(app)
      .patch('/equipments/4/broken-count')
      .set('x-test-role', 'EngineOfficer')
      .send({ brokenCount: 3 });

    expect(response.status).toBe(200);
    expect(equipment.update).toHaveBeenCalledWith({ brokenCount: 3 });
  });

  test('PATCH broken-count updates lower boundary value zero', async () => {
    const equipment = { quantity: 3, update: jest.fn().mockResolvedValue() };
    mockModels.Equipment.findByPk.mockResolvedValue(equipment);

    const response = await request(app)
      .patch('/equipments/4/broken-count')
      .set('x-test-role', 'Master')
      .send({ brokenCount: 0 });

    expect(response.status).toBe(200);
    expect(equipment.update).toHaveBeenCalledWith({ brokenCount: 0 });
  });
});
