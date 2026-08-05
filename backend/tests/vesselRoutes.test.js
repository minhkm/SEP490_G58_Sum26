const express = require('express');
const request = require('supertest');

const mockModels = {
  Ship: { create: jest.fn(), findByPk: jest.fn(), findAll: jest.fn() },
  ShipCapacity: { create: jest.fn(), findOne: jest.fn(), destroy: jest.fn() },
  Engine: { create: jest.fn(), findByPk: jest.fn(), findAll: jest.fn() },
  EngineParameter: { bulkCreate: jest.fn(), destroy: jest.fn() },
  CargoHold: { bulkCreate: jest.fn(), create: jest.fn(), findAll: jest.fn(), findByPk: jest.fn(), destroy: jest.fn() },
  Equipment: { bulkCreate: jest.fn(), findAll: jest.fn(), findByPk: jest.fn() },
  Voyage: { findAll: jest.fn(), findOne: jest.fn(), findByPk: jest.fn() },
};

jest.mock('../src/models', () => mockModels);
jest.mock('../src/middlewares/authMiddleware', () => (req, _res, next) => {
  req.user = { role: req.get('x-test-role') || 'Admin', id: 1, profileId: 10 };
  next();
});
jest.mock('jsonwebtoken', () => ({ verify: jest.fn() }));

const jwt = require('jsonwebtoken');
const vesselRoutes = require('../src/routes/vesselRoutes');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/', vesselRoutes);
  return app;
}

describe('vesselRoutes', () => {
  let app;

  beforeEach(() => {
    app = makeApp();
    jest.clearAllMocks();
    jwt.verify.mockReturnValue({ role: 'EngineOfficer' });
  });

  test('POST / creates vessel, capacity, main/aux engines, parameters and holds', async () => {
    mockModels.Ship.create.mockResolvedValue({ id: 9, shipName: 'Ocean Star' });
    mockModels.Engine.create
      .mockResolvedValueOnce({ id: 101 })
      .mockResolvedValueOnce({ id: 102 });
    mockModels.ShipCapacity.create.mockResolvedValue({});
    mockModels.EngineParameter.bulkCreate.mockResolvedValue([]);
    mockModels.CargoHold.bulkCreate.mockResolvedValue([]);

    const response = await request(app).post('/').send({
      basicInfo: { shipName: 'Ocean Star', imoNumber: '1234567', flag: 'VN' },
      capacity: { maxWeight: 1000, maxVolume: 2000, minCrew: 10, maxCrew: 25 },
      mainEngine: {
        engineName: 'Main Engine',
        engineType: 'Diesel 2-kỳ',
        status: 'Operational',
        parameters: [
          { name: 'Fuel Oil Pressure', minValue: 2, maxValue: 5 },
          { name: '', minValue: 0, maxValue: 0 },
        ],
      },
      generatorEngines: [{
        engineName: 'Auxiliary Engine 1',
        status: 'Operational',
        parameters: [{ name: 'RPM', minValue: 600, maxValue: 900 }],
      }],
      holds: [{ name: 'Hold 1', capacity: 500 }],
    });

    expect(response.status).toBe(201);
    expect(mockModels.Ship.create).toHaveBeenCalledWith(expect.objectContaining({
      shipName: 'Ocean Star',
      imoNumber: '1234567',
    }));
    expect(mockModels.ShipCapacity.create).toHaveBeenCalledWith(expect.objectContaining({ shipId: 9 }));
    expect(mockModels.Engine.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ shipId: 9, engineName: 'Main Engine' }));
    expect(mockModels.Engine.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ shipId: 9, engineName: 'Auxiliary Engine 1' }));
    expect(mockModels.EngineParameter.bulkCreate).toHaveBeenNthCalledWith(1, [
      expect.objectContaining({ engineId: 101, name: 'Fuel Oil Pressure', minValue: 2, maxValue: 5 }),
    ]);
    expect(mockModels.CargoHold.bulkCreate).toHaveBeenCalledWith([
      expect.objectContaining({ shipId: 9, holdName: 'Hold 1', maxCapacity: 500 }),
    ]);
  });

  test('POST / returns 500 when vessel creation fails', async () => {
    mockModels.Ship.create.mockRejectedValue(new Error('database unavailable'));

    const response = await request(app).post('/').send({
      basicInfo: { shipName: 'Ocean Star', imoNumber: '1234567', flag: 'VN' },
    });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('database unavailable');
    expect(mockModels.Engine.create).not.toHaveBeenCalled();
  });

  test('GET /:id/equipments returns vessel equipment list', async () => {
    const equipments = [{ id: 1, equipmentName: 'Life raft' }];
    mockModels.Equipment.findAll.mockResolvedValue(equipments);

    const response = await request(app).get('/9/equipments');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(equipments);
    expect(mockModels.Equipment.findAll).toHaveBeenCalledWith({
      where: { shipId: '9' },
      order: [['equipmentType', 'ASC'], ['equipmentName', 'ASC']],
    });
  });

  test('GET /:id/equipments returns 500 when equipment lookup fails', async () => {
    mockModels.Equipment.findAll.mockRejectedValue(new Error('lookup failed'));

    const response = await request(app).get('/9/equipments');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('lookup failed');
  });

  test('POST /:id/equipments rejects roles other than Admin/Agency', async () => {
    const response = await request(app)
      .post('/9/equipments')
      .set('x-test-role', 'Master')
      .send({ equipmentList: [{ equipmentName: 'Radar', quantity: 1 }] });

    expect(response.status).toBe(403);
    expect(mockModels.Ship.findByPk).not.toHaveBeenCalled();
  });

  test('POST /:id/equipments rejects an empty list', async () => {
    mockModels.Ship.findByPk.mockResolvedValue({ id: 9 });

    const response = await request(app)
      .post('/9/equipments')
      .set('x-test-role', 'Agency')
      .send({ equipmentList: [] });

    expect(response.status).toBe(400);
    expect(mockModels.Equipment.bulkCreate).not.toHaveBeenCalled();
  });

  test('POST /:id/equipments returns 404 when vessel does not exist', async () => {
    mockModels.Ship.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .post('/999/equipments')
      .set('x-test-role', 'Agency')
      .send({ equipmentList: [{ equipmentName: 'Radar', quantity: 1 }] });

    expect(response.status).toBe(404);
    expect(mockModels.Equipment.bulkCreate).not.toHaveBeenCalled();
  });

  test.each([
    { reason: 'blank equipment name', equipmentList: [{ equipmentName: '', quantity: 1 }] },
    { reason: 'zero quantity', equipmentList: [{ equipmentName: 'Radar', quantity: 0 }] },
  ])('POST /:id/equipments rejects $reason', async ({ equipmentList }) => {
    mockModels.Ship.findByPk.mockResolvedValue({ id: 9 });

    const response = await request(app)
      .post('/9/equipments')
      .set('x-test-role', 'Admin')
      .send({ equipmentList });

    expect(response.status).toBe(400);
    expect(mockModels.Equipment.bulkCreate).not.toHaveBeenCalled();
  });

  test('POST /:id/equipments creates normalized equipment records', async () => {
    mockModels.Ship.findByPk.mockResolvedValue({ id: 9 });
    mockModels.Equipment.bulkCreate.mockResolvedValue([{ id: 1 }]);

    const response = await request(app)
      .post('/9/equipments')
      .set('x-test-role', 'Admin')
      .send({ equipmentList: [{ equipmentName: 'Radar', quantity: 2 }] });

    expect(response.status).toBe(200);
    expect(mockModels.Equipment.bulkCreate).toHaveBeenCalledWith([
      expect.objectContaining({
        shipId: 9,
        voyageId: null,
        equipmentName: 'Radar',
        equipmentType: 'Khác',
        quantity: 2,
        brokenCount: 0,
        status: 'Operational',
      }),
    ]);
  });

  test.each(['Sailor', 'Agency'])('PATCH broken-count rejects unauthorized role %s', async (role) => {
    const response = await request(app)
      .patch('/equipments/3/broken-count')
      .set('x-test-role', role)
      .send({ brokenCount: 1 });

    expect(response.status).toBe(403);
  });

  test.each([undefined, null, -1])('PATCH broken-count rejects invalid value %s', async (brokenCount) => {
    const response = await request(app)
      .patch('/equipments/3/broken-count')
      .set('x-test-role', 'Master')
      .send({ brokenCount });

    expect(response.status).toBe(400);
  });

  test('PATCH broken-count rejects a value greater than total quantity', async () => {
    mockModels.Equipment.findByPk.mockResolvedValue({ quantity: 2, update: jest.fn() });

    const response = await request(app)
      .patch('/equipments/3/broken-count')
      .set('x-test-role', 'ChiefOfficer')
      .send({ brokenCount: 3 });

    expect(response.status).toBe(400);
  });

  test('PATCH broken-count updates a normal value below total quantity', async () => {
    const equipment = { quantity: 3, update: jest.fn().mockResolvedValue() };
    mockModels.Equipment.findByPk.mockResolvedValue(equipment);

    const response = await request(app)
      .patch('/equipments/3/broken-count')
      .set('x-test-role', 'Master')
      .send({ brokenCount: 1 });

    expect(response.status).toBe(200);
    expect(equipment.update).toHaveBeenCalledWith({ brokenCount: 1 });
  });

  test('PATCH broken-count accepts boundary value equal to total quantity', async () => {
    const equipment = { quantity: 2, update: jest.fn().mockResolvedValue() };
    mockModels.Equipment.findByPk.mockResolvedValue(equipment);

    const response = await request(app)
      .patch('/equipments/3/broken-count')
      .set('x-test-role', 'EngineOfficer')
      .send({ brokenCount: 2 });

    expect(response.status).toBe(200);
    expect(equipment.update).toHaveBeenCalledWith({ brokenCount: 2 });
  });

  test('PATCH broken-count accepts zero as the lower boundary', async () => {
    const equipment = { quantity: 2, update: jest.fn().mockResolvedValue() };
    mockModels.Equipment.findByPk.mockResolvedValue(equipment);

    const response = await request(app)
      .patch('/equipments/3/broken-count')
      .set('x-test-role', 'Master')
      .send({ brokenCount: 0 });

    expect(response.status).toBe(200);
    expect(equipment.update).toHaveBeenCalledWith({ brokenCount: 0 });
  });

  test('PATCH broken-count returns 404 when equipment does not exist', async () => {
    mockModels.Equipment.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .patch('/equipments/999/broken-count')
      .set('x-test-role', 'ChiefOfficer')
      .send({ brokenCount: 0 });

    expect(response.status).toBe(404);
  });

  test('PATCH engine status requires an Authorization header', async () => {
    const response = await request(app)
      .patch('/engines/5/status')
      .send({ status: 'Operational' });

    expect(response.status).toBe(401);
  });

  test('PATCH engine status rejects an invalid token', async () => {
    jwt.verify.mockImplementationOnce(() => { throw new Error('invalid token'); });

    const response = await request(app)
      .patch('/engines/5/status')
      .set('Authorization', 'Bearer invalid')
      .send({ status: 'Operational' });

    expect(response.status).toBe(403);
    expect(mockModels.Engine.findByPk).not.toHaveBeenCalled();
  });

  test('PATCH engine status rejects unauthorized role Master', async () => {
    jwt.verify.mockReturnValue({ role: 'Master' });
    const response = await request(app)
      .patch('/engines/5/status')
      .set('Authorization', 'Bearer valid')
      .send({ status: 'Operational' });

    expect(response.status).toBe(403);
    expect(mockModels.Engine.findByPk).not.toHaveBeenCalled();
  });

  test('PATCH engine status rejects status outside the accepted list', async () => {
    jwt.verify.mockReturnValue({ role: 'ChiefEngineer' });
    const response = await request(app)
      .patch('/engines/5/status')
      .set('Authorization', 'Bearer valid')
      .send({ status: 'Broken' });

    expect(response.status).toBe(400);
    expect(mockModels.Engine.findByPk).not.toHaveBeenCalled();
  });

  test('PATCH main engine to maintenance automatically anchors active voyage', async () => {
    const engine = {
      engineName: 'Main Engine',
      engineType: 'Diesel',
      update: jest.fn().mockResolvedValue(),
    };
    const voyage = { status: 'Underway', update: jest.fn().mockResolvedValue() };
    mockModels.Engine.findByPk.mockResolvedValue(engine);
    mockModels.Voyage.findByPk.mockResolvedValue(voyage);

    const response = await request(app)
      .patch('/engines/5/status')
      .set('Authorization', 'Bearer valid')
      .send({ status: 'Under Maintenance', voyageId: 8 });

    expect(response.status).toBe(200);
    expect(engine.update).toHaveBeenCalledWith({ status: 'Under Maintenance' });
    expect(voyage.update).toHaveBeenCalledWith({ status: 'Anchored' });
    expect(response.body).toEqual(expect.objectContaining({ voyageUpdated: true, newVoyageStatus: 'Anchored' }));
  });

  test('PATCH engine status returns 404 when engine does not exist', async () => {
    mockModels.Engine.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .patch('/engines/999/status')
      .set('Authorization', 'Bearer valid')
      .send({ status: 'Standby' });

    expect(response.status).toBe(404);
  });

  test('PATCH auxiliary engine to standby does not change voyage status', async () => {
    const engine = {
      engineName: 'Auxiliary Engine 1',
      engineType: 'Diesel 4-stroke',
      update: jest.fn().mockResolvedValue(),
    };
    mockModels.Engine.findByPk.mockResolvedValue(engine);

    const response = await request(app)
      .patch('/engines/5/status')
      .set('Authorization', 'Bearer valid')
      .send({ status: 'Standby', voyageId: 8 });

    expect(response.status).toBe(200);
    expect(engine.update).toHaveBeenCalledWith({ status: 'Standby' });
    expect(mockModels.Voyage.findByPk).not.toHaveBeenCalled();
    expect(response.body.voyageUpdated).toBe(false);
  });

  test('PATCH main engine back to operational automatically resumes anchored voyage', async () => {
    const engine = {
      engineName: 'Máy chính số 1',
      engineType: 'Diesel',
      update: jest.fn().mockResolvedValue(),
    };
    const voyage = { status: 'Anchored', update: jest.fn().mockResolvedValue() };
    mockModels.Engine.findByPk.mockResolvedValue(engine);
    mockModels.Voyage.findByPk.mockResolvedValue(voyage);

    const response = await request(app)
      .patch('/engines/5/status')
      .set('Authorization', 'Bearer valid')
      .send({ status: 'Operational', voyageId: 8 });

    expect(response.status).toBe(200);
    expect(voyage.update).toHaveBeenCalledWith({ status: 'Underway' });
    expect(response.body.newVoyageStatus).toBe('Underway');
  });
});
