const mockModel = () => ({
  findOne: jest.fn(), findAll: jest.fn(), findByPk: jest.fn(),
  create: jest.fn(), bulkCreate: jest.fn(), destroy: jest.fn(),
});
const mockModels = {
  Voyage: mockModel(), VoyageCrew: mockModel(), Ship: mockModel(), Engine: mockModel(),
  EngineParameter: mockModel(), Shift: mockModel(), ShiftLog: mockModel(),
  EngineLog: mockModel(), EngineLogValue: mockModel(), CrewProfile: mockModel(),
  LogEditHistory: mockModel(), LogImage: mockModel(), Equipment: mockModel(),
  ShiftLogEquipment: mockModel(),
};
const mockNotificationService = { notifyEngineParameterExceeded: jest.fn() };

jest.mock('../src/models', () => mockModels);
jest.mock('../src/services/notificationService', () => mockNotificationService);

const controller = require('../src/controllers/engineLogController');
const { createMockResponse } = require('./helpers/mockResponse');

describe('engineLogController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyVoyages', () => {
    test('returns 401 when user id is missing', async () => {
      const res = createMockResponse();
      await controller.getMyVoyages({ user: {} }, res);
      expect(res.statusCode).toBe(401);
    });

    test('returns 403 when user has no crew profile', async () => {
      mockModels.CrewProfile.findOne.mockResolvedValue(null);
      const res = createMockResponse();
      await controller.getMyVoyages({ user: { id: 1 } }, res);
      expect(res.statusCode).toBe(403);
    });

    test('returns voyages assigned to current crew profile', async () => {
      mockModels.CrewProfile.findOne.mockResolvedValue({ id: 20 });
      mockModels.VoyageCrew.findAll.mockResolvedValue([{ voyageId: 3 }, { voyageId: 4 }]);
      const voyages = [{ id: 3 }, { id: 4 }];
      mockModels.Voyage.findAll.mockResolvedValue(voyages);
      const res = createMockResponse();

      await controller.getMyVoyages({ user: { id: 1 } }, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(voyages);
      expect(mockModels.Voyage.findAll).toHaveBeenCalledWith(expect.objectContaining({
        order: [['departureDate', 'DESC']],
      }));
    });

    test('returns 404 when crew has no voyage assignments', async () => {
      mockModels.CrewProfile.findOne.mockResolvedValue({ id: 20 });
      mockModels.VoyageCrew.findAll.mockResolvedValue([]);
      const res = createMockResponse();

      await controller.getMyVoyages({ user: { id: 1 } }, res);

      expect(res.statusCode).toBe(404);
      expect(mockModels.Voyage.findAll).not.toHaveBeenCalled();
    });

    test('returns 404 when assigned voyage records are unavailable', async () => {
      mockModels.CrewProfile.findOne.mockResolvedValue({ id: 20 });
      mockModels.VoyageCrew.findAll.mockResolvedValue([{ voyageId: 3 }]);
      mockModels.Voyage.findAll.mockResolvedValue([]);
      const res = createMockResponse();

      await controller.getMyVoyages({ user: { id: 1 } }, res);

      expect(res.statusCode).toBe(404);
    });

    test('returns 500 when voyage lookup throws an error', async () => {
      mockModels.CrewProfile.findOne.mockRejectedValue(new Error('lookup failed'));
      const res = createMockResponse();

      await controller.getMyVoyages({ user: { id: 1 } }, res);

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('lookup failed');
    });
  });

  describe('getShiftsForCurrentUser', () => {
    test('returns 401 when profile id is missing', async () => {
      const res = createMockResponse();
      await controller.getShiftsForCurrentUser({ params: { voyageId: '2' }, query: {}, user: {} }, res);
      expect(res.statusCode).toBe(401);
    });

    test('filters shifts by the full requested day', async () => {
      mockModels.Shift.findAll.mockResolvedValue([{ id: 1 }]);
      const res = createMockResponse();

      await controller.getShiftsForCurrentUser({
        params: { voyageId: '2' },
        query: { date: '2026-08-05' },
        user: { profileId: 7 },
      }, res);

      expect(res.statusCode).toBe(200);
      const where = mockModels.Shift.findAll.mock.calls[0][0].where;
      expect(where.voyageId).toBe('2');
      expect(where.crewId).toBe(7);
      expect(where.startTime).toBeDefined();
    });

    test('returns all voyage shifts when date is omitted', async () => {
      mockModels.Shift.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const res = createMockResponse();

      await controller.getShiftsForCurrentUser({
        params: { voyageId: '2' }, query: {}, user: { profileId: 7 },
      }, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([{ id: 1 }, { id: 2 }]);
      const where = mockModels.Shift.findAll.mock.calls[0][0].where;
      expect(where).toEqual({ voyageId: '2', crewId: 7 });
    });

    test('returns 500 when shift lookup throws an error', async () => {
      mockModels.Shift.findAll.mockRejectedValue(new Error('shift lookup failed'));
      const res = createMockResponse();

      await controller.getShiftsForCurrentUser({
        params: { voyageId: '2' }, query: {}, user: { profileId: 7 },
      }, res);

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('shift lookup failed');
    });
  });

  describe('createEngineLog', () => {
    test.each([
      { reason: 'missing shiftId', body: { engineId: 2 } },
      { reason: 'missing engineId', body: { shiftId: 1 } },
    ])('rejects $reason', async ({ body }) => {
      const res = createMockResponse();
      await controller.createEngineLog({ body, user: { id: 1 } }, res);
      expect(res.statusCode).toBe(400);
      expect(mockModels.ShiftLog.create).not.toHaveBeenCalled();
    });

    test('returns 404 when selected engine does not exist', async () => {
      mockModels.Engine.findByPk.mockResolvedValue(null);
      const res = createMockResponse();

      await controller.createEngineLog({
        body: { shiftId: 1, engineId: 999, values: [{}, {}, {}] },
        user: { id: 99, profileId: 10 },
      }, res);

      expect(res.statusCode).toBe(404);
      expect(mockModels.ShiftLog.create).not.toHaveBeenCalled();
    });

    test('creates log values without linking legacy equipmentIds and sends an exceeded-value notification', async () => {
      const shiftLog = { id: 11 };
      const engineLog = { id: 22 };
      mockModels.ShiftLog.create.mockResolvedValue(shiftLog);
      mockModels.EngineLog.create.mockResolvedValue(engineLog);
      mockModels.EngineLogValue.bulkCreate.mockResolvedValue([]);
      mockModels.Shift.findByPk.mockResolvedValue({ voyageId: 30 });
      mockModels.Engine.findByPk.mockResolvedValue({ id: 5, engineName: 'Main Engine', status: 'Operational' });
      mockModels.EngineParameter.findAll.mockResolvedValue([
        { id: 101, name: 'Fuel Oil Pressure', maxValue: 5 },
        { id: 102, name: 'Cooling Water Temp', maxValue: 90 },
      ]);
      const res = createMockResponse();

      await controller.createEngineLog({
        body: {
          shiftId: 1,
          engineId: 5,
          note: 'Routine check',
          values: [
            { parameterId: 101, value: 6 },
            { parameterId: 102, value: 85 },
            { parameterId: 103, value: 80 },
          ],
          equipmentIds: [7, 8],
        },
        user: { id: 99, profileId: 10 },
      }, res);

      expect(res.statusCode).toBe(201);
      expect(mockModels.EngineLogValue.bulkCreate).toHaveBeenCalledWith([
        { engineLogId: 22, parameterId: 101, value: 6 },
        { engineLogId: 22, parameterId: 102, value: 85 },
        { engineLogId: 22, parameterId: 103, value: 80 },
      ]);
      expect(mockNotificationService.notifyEngineParameterExceeded).toHaveBeenCalledWith(expect.objectContaining({
        voyageId: 30,
        engineLogId: 22,
        shiftLogId: 11,
        exceededValues: [{ parameterId: 101, parameterName: 'Fuel Oil Pressure', value: 6, maxValue: 5 }],
      }));
      expect(mockModels.ShiftLogEquipment.bulkCreate).not.toHaveBeenCalled();
    });

    test.each(['Standby', 'Under Maintenance'])(
      'rejects logs for a %s engine',
      async (status) => {
        mockModels.Engine.findByPk.mockResolvedValue({ id: 5, status });
        const res = createMockResponse();

        await controller.createEngineLog({
          body: { shiftId: 1, engineId: 5, values: [] },
          user: { id: 99, profileId: 10 },
        }, res);

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toMatch(/hoạt động/i);
        expect(mockModels.ShiftLog.create).not.toHaveBeenCalled();
      },
    );
    test('requires at least 3 engine parameter values', async () => {
      mockModels.Engine.findByPk.mockResolvedValue({ id: 5, status: 'Operational' });
      const res = createMockResponse();

      await controller.createEngineLog({
        body: {
          shiftId: 1,
          engineId: 5,
          values: [
            { parameterId: 101, value: 6 },
            { parameterId: 102, value: 85 },
          ],
        },
        user: { id: 99, profileId: 10 },
      }, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/ít nhất 3 thông số/i);
      expect(mockModels.ShiftLog.create).not.toHaveBeenCalled();
    });

    test('rejects a non-array parameter value payload', async () => {
      mockModels.Engine.findByPk.mockResolvedValue({ id: 5, status: 'Operational' });
      const res = createMockResponse();

      await controller.createEngineLog({
        body: { shiftId: 1, engineId: 5, values: null },
        user: { id: 99, profileId: 10 },
      }, res);

      expect(res.statusCode).toBe(400);
      expect(mockModels.ShiftLog.create).not.toHaveBeenCalled();
    });

    test('returns 500 when engine lookup throws an error', async () => {
      mockModels.Engine.findByPk.mockRejectedValue(new Error('engine lookup failed'));
      const res = createMockResponse();

      await controller.createEngineLog({
        body: { shiftId: 1, engineId: 5, values: [{}, {}, {}] },
        user: { id: 99, profileId: 10 },
      }, res);

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('engine lookup failed');
    });
  });

  describe('updateEngineLog', () => {
    test('requires a non-blank edit reason', async () => {
      const res = createMockResponse();
      await controller.updateEngineLog({
        params: { shiftLogId: '11' }, body: { editReason: '   ' }, user: { profileId: 3 },
      }, res);
      expect(res.statusCode).toBe(400);
    });

    test('returns 404 when log does not exist', async () => {
      mockModels.ShiftLog.findByPk.mockResolvedValue(null);
      const res = createMockResponse();
      await controller.updateEngineLog({
        params: { shiftLogId: '11' }, body: { editReason: 'Correct typo' }, user: { profileId: 3 },
      }, res);
      expect(res.statusCode).toBe(404);
    });

    test('stores old snapshot without equipmentIds before updating note', async () => {
      const engineLog = {
        id: 22,
        engineId: 5,
        note: 'Old note',
        EngineLogValues: [],
        update: jest.fn().mockResolvedValue(),
      };
      const shiftLog = {
        id: 11,
        shiftId: 1,
        createdAt: new Date(Date.now() - (60 * 60 * 1000)),
        content: 'Old note',
        EngineLog: engineLog,
        update: jest.fn().mockResolvedValue(),
      };
      mockModels.ShiftLog.findByPk.mockResolvedValue(shiftLog);
      mockModels.ShiftLogEquipment.findAll.mockResolvedValue([]);
      mockModels.LogEditHistory.create.mockResolvedValue({});
      const res = createMockResponse();

      await controller.updateEngineLog({
        params: { shiftLogId: '11' },
        body: { note: 'New note', editReason: 'Gauge was read incorrectly', equipmentIds: [7, 8] },
        user: { profileId: 3 },
      }, res);

      expect(res.statusCode).toBe(200);
      expect(mockModels.LogEditHistory.create).toHaveBeenCalledWith(expect.objectContaining({
        logType: 'Engine',
        shiftLogId: 11,
        editReason: 'Gauge was read incorrectly',
        editedBy: 3,
      }));
      const snapshot = JSON.parse(mockModels.LogEditHistory.create.mock.calls[0][0].previousContent);
      expect(snapshot).toEqual(expect.objectContaining({ note: 'Old note' }));
      expect(snapshot).not.toHaveProperty('equipmentIds');
      expect(engineLog.update).toHaveBeenCalledWith({ note: 'New note' });
      expect(mockModels.ShiftLogEquipment.findAll).not.toHaveBeenCalled();
      expect(mockModels.ShiftLogEquipment.destroy).not.toHaveBeenCalled();
      expect(mockModels.ShiftLogEquipment.bulkCreate).not.toHaveBeenCalled();
    });

    test('rejects edits made more than 24 hours after log creation', async () => {
      mockModels.ShiftLog.findByPk.mockResolvedValue({
        id: 11,
        createdAt: new Date(Date.now() - (25 * 60 * 60 * 1000)),
        EngineLog: { id: 22 },
      });
      const res = createMockResponse();

      await controller.updateEngineLog({
        params: { shiftLogId: '11' },
        body: { editReason: 'Late correction' },
        user: { profileId: 3 },
      }, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/quá 24 giờ/i);
      expect(mockModels.LogEditHistory.create).not.toHaveBeenCalled();
    });

    test('returns 500 when log lookup throws an error', async () => {
      mockModels.ShiftLog.findByPk.mockRejectedValue(new Error('log lookup failed'));
      const res = createMockResponse();

      await controller.updateEngineLog({
        params: { shiftLogId: '11' },
        body: { editReason: 'Correct reading' },
        user: { profileId: 3 },
      }, res);

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('log lookup failed');
    });
  });

  test('uploadLogImages rejects an empty upload', async () => {
    const res = createMockResponse();

    await controller.uploadLogImages({ params: { shiftLogId: '11' }, files: [], user: { profileId: 3 } }, res);

    expect(res.statusCode).toBe(400);
    expect(mockModels.ShiftLog.findByPk).not.toHaveBeenCalled();
  });

  test('uploadLogImages returns 404 when shift log does not exist', async () => {
    mockModels.ShiftLog.findByPk.mockResolvedValue(null);
    const res = createMockResponse();

    await controller.uploadLogImages({
      params: { shiftLogId: '999' }, files: [{ path: 'https://cloudinary/a.jpg' }], user: { profileId: 3 },
    }, res);

    expect(res.statusCode).toBe(404);
    expect(mockModels.LogImage.create).not.toHaveBeenCalled();
  });

  test('uploadLogImages stores Cloudinary URLs for valid files', async () => {
    mockModels.ShiftLog.findByPk.mockResolvedValue({ id: 11 });
    mockModels.LogImage.create
      .mockResolvedValueOnce({ id: 1, imageUrl: 'https://cloudinary/a.jpg' })
      .mockResolvedValueOnce({ id: 2, imageUrl: 'https://cloudinary/b.jpg' });
    const res = createMockResponse();
    await controller.uploadLogImages({
      params: { shiftLogId: '11' },
      files: [{ path: 'https://cloudinary/a.jpg' }, { path: 'https://cloudinary/b.jpg' }],
      user: { profileId: 3 },
    }, res);

    expect(res.statusCode).toBe(201);
    expect(mockModels.LogImage.create).toHaveBeenCalledTimes(2);
  });

  test('getEngineLogsByShift returns shift log history', async () => {
    mockModels.ShiftLog.findAll.mockResolvedValue([{ id: 11 }]);
    const res = createMockResponse();

    await controller.getEngineLogsByShift({ params: { shiftId: '1' } }, res);

    expect(res.body).toEqual([{ id: 11 }]);
    const shiftIncludes = mockModels.ShiftLog.findAll.mock.calls[0][0].include;
    expect(shiftIncludes).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ as: 'Equipments' }),
    ]));
  });

  test('getEngineLogsByShift returns 500 when history lookup throws an error', async () => {
    mockModels.ShiftLog.findAll.mockRejectedValue(new Error('shift history lookup failed'));
    const res = createMockResponse();

    await controller.getEngineLogsByShift({ params: { shiftId: '1' } }, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('shift history lookup failed');
  });

  test('getEngineLogsByVoyage returns voyage shift history', async () => {
    mockModels.Shift.findAll.mockResolvedValue([{ id: 1 }]);
    const res = createMockResponse();

    await controller.getEngineLogsByVoyage({ params: { voyageId: '2' } }, res);

    expect(res.body).toEqual([{ id: 1 }]);
  });

  test('getEngineLogsByVoyage returns 500 when voyage history lookup throws an error', async () => {
    mockModels.Shift.findAll.mockRejectedValue(new Error('voyage history lookup failed'));
    const res = createMockResponse();

    await controller.getEngineLogsByVoyage({ params: { voyageId: '2' } }, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('voyage history lookup failed');
  });

  test('getEditHistory returns engine log edit history', async () => {
    mockModels.LogEditHistory.findAll.mockResolvedValue([{ id: 5 }]);
    const res = createMockResponse();

    await controller.getEditHistory({ params: { shiftLogId: '11' } }, res);

    expect(res.body).toEqual([{ id: 5 }]);
  });

  test('getEditHistory returns 500 when edit history lookup throws an error', async () => {
    mockModels.LogEditHistory.findAll.mockRejectedValue(new Error('edit history lookup failed'));
    const res = createMockResponse();

    await controller.getEditHistory({ params: { shiftLogId: '11' } }, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('edit history lookup failed');
  });
});
