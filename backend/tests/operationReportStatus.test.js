const { validateExportStatus } = require('../src/controllers/operationReportController');
const { resolvePeriod } = require('../src/services/operationReportService');

describe('operation report export status validation', () => {
  test.each(['day', 'week', 'month'])(
    'blocks %s export while the voyage is still planning',
    (periodType) => {
      expect(validateExportStatus({ status: 'Planning' }, periodType)).toMatch(/đang diễn ra/);
    },
  );

  test.each(['day', 'week', 'month'])(
    'allows %s export while the voyage is underway',
    (periodType) => {
      expect(validateExportStatus({ status: 'Underway' }, periodType)).toBeNull();
    },
  );

  test.each(['day', 'week', 'month'])(
    'blocks %s export while cargo has only been loaded',
    (periodType) => {
      expect(validateExportStatus({ status: 'Loaded' }, periodType)).toMatch(/đang diễn ra/);
    },
  );

  test('blocks the full-voyage export until completion', () => {
    expect(validateExportStatus({ status: 'Underway' }, 'voyage')).toMatch(/hoàn thành/);
  });

  test('allows the full-voyage export after completion', () => {
    expect(validateExportStatus({ status: 'Completed' }, 'voyage')).toBeNull();
  });

  test.each(['day', 'week', 'month'])(
    'allows %s export after the voyage is completed',
    (periodType) => {
      expect(validateExportStatus({ status: 'Completed' }, periodType)).toBeNull();
    },
  );

  test('blocks a daily period before the voyage departure date', () => {
    expect(() => resolvePeriod('day', '2026-07-20', { departureDate: '2026-07-21' }))
      .toThrow(/trước ngày khởi hành/);
  });

  test('allows a period beginning on the voyage departure date', () => {
    expect(resolvePeriod('day', '2026-07-21', { departureDate: '2026-07-21' }).fromDate)
      .toBe('2026-07-21');
  });
});
