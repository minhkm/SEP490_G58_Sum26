const baseConfig = require('./jest.config.cjs');

module.exports = {
  ...baseConfig,
  silent: true,
  reporters: ['<rootDir>/tests/reporters/unitReporter.cjs'],
};
