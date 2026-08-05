module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  clearMocks: true,
  collectCoverageFrom: [
    'src/controllers/engineLogController.js',
    'src/controllers/deckLogController.js',
    'src/routes/vesselRoutes.js',
    'src/routes/voyageRoutes.js',
  ],
  coverageDirectory: 'coverage',
};
