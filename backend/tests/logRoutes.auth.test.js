const express = require('express');
const request = require('supertest');

jest.mock('../src/middlewares/authMiddleware', () => (req, _res, next) => {
  req.user = { role: req.get('x-test-role'), id: 1, profileId: 10 };
  next();
});
jest.mock('../src/middleware/upload', () => ({
  array: () => (_req, _res, next) => next(),
}));
jest.mock('../src/controllers/engineLogController', () => ({
  getMyVoyages: (_req, res) => res.json({ ok: true }),
  getShiftsForCurrentUser: (_req, res) => res.json({ ok: true }),
  createEngineLog: (_req, res) => res.status(201).json({ ok: true }),
  updateEngineLog: (_req, res) => res.json({ ok: true }),
  getEngineLogsByShift: (_req, res) => res.json({ ok: true }),
  getEngineLogsByVoyage: (_req, res) => res.json({ ok: true }),
  uploadLogImages: (_req, res) => res.status(201).json({ ok: true }),
  getEditHistory: (_req, res) => res.json({ ok: true }),
}));
jest.mock('../src/controllers/deckLogController', () => ({
  getMyVoyages: (_req, res) => res.json({ ok: true }),
  getShiftsForCurrentUser: (_req, res) => res.json({ ok: true }),
  createDeckLog: (_req, res) => res.status(201).json({ ok: true }),
  updateDeckLog: (_req, res) => res.json({ ok: true }),
  getDeckLogsByShift: (_req, res) => res.json({ ok: true }),
  uploadLogImages: (_req, res) => res.status(201).json({ ok: true }),
  getEditHistory: (_req, res) => res.json({ ok: true }),
}));

const engineRoutes = require('../src/routes/engineLogRoutes');
const deckRoutes = require('../src/routes/deckLogRoutes');

function appFor(router) {
  const app = express();
  app.use(express.json());
  app.use('/', router);
  return app;
}

describe('log route role guards', () => {
  test('engine log routes allow EngineCrew', async () => {
    const response = await request(appFor(engineRoutes))
      .get('/my-voyages')
      .set('x-test-role', 'EngineCrew');

    expect(response.status).toBe(200);
  });

  test.each(['Admin', 'Agency', 'Master', 'ChiefOfficer', 'DeckOfficer', 'Sailor', 'EngineOfficer'])(
    'engine log routes reject role %s',
    async (role) => {
      const response = await request(appFor(engineRoutes))
        .get('/my-voyages')
        .set('x-test-role', role);

      expect(response.status).toBe(403);
    },
  );

  test('deck log routes allow Sailor', async () => {
    const response = await request(appFor(deckRoutes))
      .get('/my-voyages')
      .set('x-test-role', 'Sailor');

    expect(response.status).toBe(200);
  });

  test.each(['Admin', 'Agency', 'Master', 'ChiefOfficer', 'DeckOfficer', 'EngineOfficer', 'EngineCrew'])(
    'deck log routes reject role %s',
    async (role) => {
      const response = await request(appFor(deckRoutes))
        .get('/my-voyages')
        .set('x-test-role', role);

      expect(response.status).toBe(403);
    },
  );
});
