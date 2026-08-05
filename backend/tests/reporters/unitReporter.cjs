const path = require('path');

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const MAGENTA = '\x1b[35m';
const DIM = '\x1b[90m';

const color = (code, value) => `${code}${value}${RESET}`;

function classify(title) {
  const value = title.toLowerCase();
  if (/boundary|\bequal\b|requested day|minimum|maximum|at least 3|exactly three|15-field|24 hour|255|\bzero\b/.test(value)) return 'B';
  if (/\b(400|401|403|404|500)\b|reject|require|missing|invalid|unauthor|forbid|not exist|unknown|empty|malformed|future|standby|under maintenance|no crew|fails|throws|error/.test(value)) return 'A';
  return 'N';
}

function sheetFor(testFilePath, assertion) {
  const file = path.basename(testFilePath);
  const title = assertion.title || '';
  const ancestors = assertion.ancestorTitles || [];
  const group = ancestors[ancestors.length - 1] || '';

  if (file === 'vesselRoutes.test.js') {
    if (title.startsWith('POST / ')) return 'Vessel.create';
    if (title.startsWith('GET /:id/equipments')) return 'Vessel.getEquip';
    if (title.startsWith('POST /:id/equipments')) return 'Vessel.createEquip';
    if (title.includes('broken-count')) return 'Vessel.brokenCount';
    return 'Vessel.engineStatus';
  }

  if (file === 'voyageRoutes.test.js') {
    if (title.startsWith('POST /')) return 'Voyage.create';
    if (title.startsWith('GET /:id/equipments')) return 'Voyage.getEquip';
    if (title.includes('equipment status')) return 'Voyage.equipStatus';
    return 'Voyage.brokenCount';
  }

  if (file === 'engineLogController.test.js') {
    if (group === 'getMyVoyages') return 'Engine.getMyVoyages';
    if (group === 'getShiftsForCurrentUser') return 'Engine.getShifts';
    if (group === 'createEngineLog') return 'Engine.createLog';
    if (group === 'updateEngineLog') return 'Engine.updateLog';
    if (title.toLowerCase().includes('upload')) return 'Engine.upload';
    return 'Engine.history';
  }

  if (file === 'deckLogController.test.js') {
    if (title.startsWith('getMyVoyages')) return 'Deck.getMyVoyages';
    if (title.startsWith('getShiftsForCurrentUser')) return 'Deck.getShifts';
    if (group === 'createDeckLog') return 'Deck.createLog';
    if (group === 'updateDeckLog') return 'Deck.updateLog';
    return 'Deck.historyUpload';
  }

  if (file === 'logRoutes.auth.test.js') {
    return title.startsWith('engine') ? 'Engine.roleGuard' : 'Deck.roleGuard';
  }

  return path.basename(file, path.extname(file));
}

function typeLabel(type) {
  if (type === 'A') return color(YELLOW, 'A');
  if (type === 'B') return color(MAGENTA, 'B');
  return color(CYAN, 'N');
}

class SheetEvidenceReporter {
  constructor() {
    this.sheetCounters = new Map();
  }

  onTestResult(test, testResult) {
    const relativeFile = path.relative(process.cwd(), testResult.testFilePath).replaceAll('\\', '/');
    const assertions = testResult.testResults || testResult.assertionResults || [];
    const groups = new Map();

    for (const assertion of assertions) {
      const sheet = sheetFor(testResult.testFilePath, assertion);
      if (!groups.has(sheet)) groups.set(sheet, []);
      groups.get(sheet).push(assertion);
    }

    const suitePassed = testResult.numFailingTests === 0;
    const suiteStatus = suitePassed ? color(GREEN, 'PASS') : color(RED, 'FAIL');
    process.stdout.write(`\n${suiteStatus} ${relativeFile}\n`);

    for (const [sheet, sheetAssertions] of groups) {
      process.stdout.write(`\n  ${color(CYAN, sheet)}\n`);

      let counter = this.sheetCounters.get(sheet) || 0;
      for (const assertion of sheetAssertions) {
        counter += 1;
        const testCaseId = `TC${String(counter).padStart(2, '0')}`;
        const type = classify(assertion.title);
        const passed = assertion.status === 'passed';
        const marker = passed ? color(GREEN, '✓') : color(RED, '✗');
        const duration = Number.isFinite(assertion.duration) ? color(DIM, ` (${assertion.duration} ms)`) : '';
        process.stdout.write(`    ${marker} ${testCaseId} [${typeLabel(type)}] ${assertion.title}${duration}\n`);
      }
      this.sheetCounters.set(sheet, counter);
    }

    if (!suitePassed && testResult.failureMessage) {
      process.stdout.write(`\n${color(RED, testResult.failureMessage)}\n`);
    }
  }

  onRunComplete(_contexts, results) {
    const suitesPassed = results.numPassedTestSuites;
    const suitesFailed = results.numFailedTestSuites;
    const testsPassed = results.numPassedTests;
    const testsFailed = results.numFailedTests;
    const totalSuites = results.numTotalTestSuites;
    const totalTests = results.numTotalTests;
    const elapsedSeconds = ((Date.now() - results.startTime) / 1000).toFixed(3);

    process.stdout.write('\n');
    process.stdout.write(`Test Suites: ${color(suitesFailed === 0 ? GREEN : RED, `${suitesPassed} passed`)}, ${suitesFailed} failed, ${totalSuites} total\n`);
    process.stdout.write(`Tests:       ${color(testsFailed === 0 ? GREEN : RED, `${testsPassed} passed`)}, ${testsFailed} failed, ${totalTests} total\n`);
    process.stdout.write(`Time:        ${elapsedSeconds} s\n`);
  }
}

module.exports = SheetEvidenceReporter;
