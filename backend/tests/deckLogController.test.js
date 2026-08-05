const mockModel = () => ({
  findOne: jest.fn(), findAll: jest.fn(), findByPk: jest.fn(),
  create: jest.fn(), bulkCreate: jest.fn(), destroy: jest.fn(),
});
const mockModels = {
  Voyage: mockModel(), VoyageCrew: mockModel(), Ship: mockModel(), Shift: mockModel(),
  ShiftLog: mockModel(), DeckLog: mockModel(), DeckLogEntry: mockModel(),
  CrewProfile: mockModel(), LogEditHistory: mockModel(), LogImage: mockModel(),
  Equipment: mockModel(), ShiftLogEquipment: mockModel(),
};

jest.mock('../src/models', () => mockModels);

const controller = require('../src/controllers/deckLogController');
const { createMockResponse } = require('./helpers/mockResponse');

describe('deckLogController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getMyVoyages returns assigned voyages', async () => {
    mockModels.CrewProfile.findOne.mockResolvedValue({ id: 20 });
    mockModels.VoyageCrew.findAll.mockResolvedValue([{ voyageId: 3 }]);
    mockModels.Voyage.findAll.mockResolvedValue([{ id: 3 }]);
    const res = createMockResponse();

    await controller.getMyVoyages({ user: { id: 1 } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ id: 3 }]);
  });

  test('getMyVoyages returns 401 when user id is missing', async () => {
    const res = createMockResponse();

    await controller.getMyVoyages({ user: {} }, res);

    expect(res.statusCode).toBe(401);
  });

  test('getMyVoyages returns 403 when user has no crew profile', async () => {
    mockModels.CrewProfile.findOne.mockResolvedValue(null);
    const res = createMockResponse();

    await controller.getMyVoyages({ user: { id: 1 } }, res);

    expect(res.statusCode).toBe(403);
  });

  test('getMyVoyages returns 404 when crew has no voyage assignments', async () => {
    mockModels.CrewProfile.findOne.mockResolvedValue({ id: 20 });
    mockModels.VoyageCrew.findAll.mockResolvedValue([]);
    const res = createMockResponse();

    await controller.getMyVoyages({ user: { id: 1 } }, res);

    expect(res.statusCode).toBe(404);
    expect(mockModels.Voyage.findAll).not.toHaveBeenCalled();
  });

  test('getMyVoyages returns 404 when assigned voyage records are unavailable', async () => {
    mockModels.CrewProfile.findOne.mockResolvedValue({ id: 20 });
    mockModels.VoyageCrew.findAll.mockResolvedValue([{ voyageId: 3 }]);
    mockModels.Voyage.findAll.mockResolvedValue([]);
    const res = createMockResponse();

    await controller.getMyVoyages({ user: { id: 1 } }, res);

    expect(res.statusCode).toBe(404);
  });

  test('getMyVoyages returns 500 when voyage lookup throws an error', async () => {
    mockModels.CrewProfile.findOne.mockRejectedValue(new Error('lookup failed'));
    const res = createMockResponse();

    await controller.getMyVoyages({ user: { id: 1 } }, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('lookup failed');
  });

  test('getShiftsForCurrentUser requires a crew profile id', async () => {
    const res = createMockResponse();
    await controller.getShiftsForCurrentUser({ params: { voyageId: '3' }, query: {}, user: {} }, res);
    expect(res.statusCode).toBe(401);
  });

  test('getShiftsForCurrentUser filters shifts by the requested day', async () => {
    mockModels.Shift.findAll.mockResolvedValue([{ id: 1 }]);
    const res = createMockResponse();

    await controller.getShiftsForCurrentUser({
      params: { voyageId: '3' }, query: { date: '2026-08-05' }, user: { profileId: 9 },
    }, res);

    expect(res.statusCode).toBe(200);
    const where = mockModels.Shift.findAll.mock.calls[0][0].where;
    expect(where.voyageId).toBe('3');
    expect(where.crewId).toBe(9);
    expect(where.startTime).toBeDefined();
  });

  test('getShiftsForCurrentUser returns all voyage shifts when date is omitted', async () => {
    mockModels.Shift.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const res = createMockResponse();

    await controller.getShiftsForCurrentUser({
      params: { voyageId: '3' }, query: {}, user: { profileId: 9 },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ id: 1 }, { id: 2 }]);
    expect(mockModels.Shift.findAll.mock.calls[0][0].where).toEqual({ voyageId: '3', crewId: 9 });
  });

  test('getShiftsForCurrentUser returns 500 when shift lookup fails', async () => {
    mockModels.Shift.findAll.mockRejectedValue(new Error('shift lookup failed'));
    const res = createMockResponse();

    await controller.getShiftsForCurrentUser({
      params: { voyageId: '3' }, query: {}, user: { profileId: 9 },
    }, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('shift lookup failed');
  });

  describe('createDeckLog', () => {
    test('rejects a missing shift id', async () => {
      const res = createMockResponse();

      await controller.createDeckLog({ body: {} }, res);

      expect(res.statusCode).toBe(400);
      expect(mockModels.Shift.findByPk).not.toHaveBeenCalled();
    });

    test('rejects empty entries and a blank note', async () => {
      const res = createMockResponse();

      await controller.createDeckLog({ body: { shiftId: 1, note: ' ', entries: [] } }, res);

      expect(res.statusCode).toBe(400);
      expect(mockModels.Shift.findByPk).not.toHaveBeenCalled();
    });

    test('returns 404 when shift does not exist', async () => {
      mockModels.Shift.findByPk.mockResolvedValue(null);
      const res = createMockResponse();
      await controller.createDeckLog({ body: { shiftId: 1, note: 'Watch started' } }, res);
      expect(res.statusCode).toBe(404);
    });

    test('creates a complete 15-field hourly entry without linking legacy equipmentIds', async () => {
      mockModels.Shift.findByPk.mockResolvedValue({ id: 1 });
      mockModels.ShiftLog.create.mockResolvedValue({ id: 11 });
      mockModels.DeckLog.create.mockResolvedValue({ id: 22 });
      mockModels.DeckLogEntry.bulkCreate.mockResolvedValue([]);
      const entry = {
        hour: 8,
        courseTrue: 90, courseGyro: 91, courseSteer: 90, gyroError: 1,
        courseMagnetic: 89, speed: 12, rpm: 80,
        windDirection: 'NE', windForce: 4, weather: 'bc', barometer: 1012,
        seaState: 3, visibility: 8, airTemp: 30, seaTemp: 27,
      };
      const res = createMockResponse();

      await controller.createDeckLog({
        body: { shiftId: 1, note: 'Normal watch', entries: [entry], equipmentIds: [7, 8] },
      }, res);

      expect(res.statusCode).toBe(201);
      expect(mockModels.DeckLogEntry.bulkCreate).toHaveBeenCalledWith([
        expect.objectContaining({ deckLogId: 22, ...entry }),
      ]);
      expect(mockModels.ShiftLogEquipment.bulkCreate).not.toHaveBeenCalled();
    });

    test('creates a note-only deck log without hourly entries', async () => {
      mockModels.Shift.findByPk.mockResolvedValue({ id: 1 });
      mockModels.ShiftLog.create.mockResolvedValue({ id: 11 });
      mockModels.DeckLog.create.mockResolvedValue({ id: 22 });
      const res = createMockResponse();

      await controller.createDeckLog({
        body: { shiftId: 1, note: 'Visibility reduced', entries: [] },
      }, res);

      expect(res.statusCode).toBe(201);
      expect(mockModels.DeckLogEntry.bulkCreate).not.toHaveBeenCalled();
    });

    test('returns 500 when shift lookup throws an error', async () => {
      mockModels.Shift.findByPk.mockRejectedValue(new Error('shift lookup failed'));
      const res = createMockResponse();

      await controller.createDeckLog({ body: { shiftId: 1, note: 'Watch started' } }, res);

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('shift lookup failed');
    });

  });

  describe('updateDeckLog', () => {
    test('requires edit reason', async () => {
      const res = createMockResponse();
      await controller.updateDeckLog({
        params: { shiftLogId: '11' }, body: { editReason: '' }, user: { profileId: 3 },
      }, res);
      expect(res.statusCode).toBe(400);
    });

    test('returns 404 for unknown log', async () => {
      mockModels.ShiftLog.findByPk.mockResolvedValue(null);
      const res = createMockResponse();
      await controller.updateDeckLog({
        params: { shiftLogId: '11' }, body: { editReason: 'Correction' }, user: { profileId: 3 },
      }, res);
      expect(res.statusCode).toBe(404);
    });

    test('stores previous snapshot without equipmentIds before replacing entries', async () => {
      const deckLog = {
        id: 22,
        note: 'Old note',
        DeckLogEntries: [{ hour: 8, speed: 10 }],
        update: jest.fn().mockResolvedValue(),
      };
      const shiftLog = {
        id: 11,
        createdAt: new Date(Date.now() - (60 * 60 * 1000)),
        content: 'Old note',
        DeckLog: deckLog,
        update: jest.fn().mockResolvedValue(),
      };
      mockModels.ShiftLog.findByPk.mockResolvedValue(shiftLog);
      mockModels.ShiftLogEquipment.findAll.mockResolvedValue([]);
      mockModels.LogEditHistory.create.mockResolvedValue({});
      mockModels.DeckLogEntry.destroy.mockResolvedValue(1);
      mockModels.DeckLogEntry.bulkCreate.mockResolvedValue([]);
      const res = createMockResponse();

      await controller.updateDeckLog({
        params: { shiftLogId: '11' },
        body: {
          note: 'Corrected', editReason: 'Correct speed',
          entries: [{ hour: 8, speed: 12 }],
          equipmentIds: [7, 8],
        },
        user: { profileId: 3 },
      }, res);

      expect(res.statusCode).toBe(200);
      const history = mockModels.LogEditHistory.create.mock.calls[0][0];
      expect(history).toEqual(expect.objectContaining({ logType: 'Deck', editReason: 'Correct speed', editedBy: 3 }));
      const snapshot = JSON.parse(history.previousContent);
      expect(snapshot).toEqual(expect.objectContaining({ note: 'Old note' }));
      expect(snapshot).not.toHaveProperty('equipmentIds');
      expect(mockModels.DeckLogEntry.destroy).toHaveBeenCalledWith({ where: { deckLogId: 22 } });
      expect(mockModels.ShiftLogEquipment.findAll).not.toHaveBeenCalled();
      expect(mockModels.ShiftLogEquipment.destroy).not.toHaveBeenCalled();
      expect(mockModels.ShiftLogEquipment.bulkCreate).not.toHaveBeenCalled();
    });

    test('rejects edits made more than 24 hours after log creation', async () => {
      mockModels.ShiftLog.findByPk.mockResolvedValue({
        id: 11,
        createdAt: new Date(Date.now() - (25 * 60 * 60 * 1000)),
        DeckLog: { id: 22 },
      });
      const res = createMockResponse();

      await controller.updateDeckLog({
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

      await controller.updateDeckLog({
        params: { shiftLogId: '11' }, body: { editReason: 'Correct speed' }, user: { profileId: 3 },
      }, res);

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('log lookup failed');
    });
  });

  test('getDeckLogsByShift returns deck log history', async () => {
    mockModels.ShiftLog.findAll.mockResolvedValue([{ id: 11 }]);
    const res = createMockResponse();

    await controller.getDeckLogsByShift({ params: { shiftId: '1' } }, res);

    expect(res.body).toEqual([{ id: 11 }]);
    const historyIncludes = mockModels.ShiftLog.findAll.mock.calls[0][0].include;
    expect(historyIncludes).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ as: 'Equipments' }),
    ]));
  });

  test('getDeckLogsByShift returns 500 when history lookup throws an error', async () => {
    mockModels.ShiftLog.findAll.mockRejectedValue(new Error('deck history lookup failed'));
    const res = createMockResponse();

    await controller.getDeckLogsByShift({ params: { shiftId: '1' } }, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('deck history lookup failed');
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
      params: { shiftLogId: '999' }, files: [{ path: 'https://cloudinary/deck.jpg' }], user: { profileId: 3 },
    }, res);

    expect(res.statusCode).toBe(404);
    expect(mockModels.LogImage.create).not.toHaveBeenCalled();
  });

  test('uploadLogImages stores a Cloudinary URL for a valid file', async () => {
    mockModels.ShiftLog.findByPk.mockResolvedValue({ id: 11 });
    mockModels.LogImage.create.mockResolvedValue({ id: 1, imageUrl: 'https://cloudinary/deck.jpg' });
    const res = createMockResponse();

    await controller.uploadLogImages({
      params: { shiftLogId: '11' }, files: [{ path: 'https://cloudinary/deck.jpg' }], user: { profileId: 3 },
    }, res);

    expect(res.statusCode).toBe(201);
    expect(mockModels.LogImage.create).toHaveBeenCalledWith(expect.objectContaining({
      logType: 'Deck', shiftLogId: 11, imageUrl: 'https://cloudinary/deck.jpg', uploadedBy: 3,
    }));
  });

  test('getEditHistory returns deck log edit history', async () => {
    mockModels.LogEditHistory.findAll.mockResolvedValue([{ id: 8 }]);
    const res = createMockResponse();

    await controller.getEditHistory({ params: { shiftLogId: '11' } }, res);

    expect(res.body).toEqual([{ id: 8 }]);
  });

  test('getEditHistory returns 500 when edit history lookup throws an error', async () => {
    mockModels.LogEditHistory.findAll.mockRejectedValue(new Error('deck edit history lookup failed'));
    const res = createMockResponse();

    await controller.getEditHistory({ params: { shiftLogId: '11' } }, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('deck edit history lookup failed');
  });
});
