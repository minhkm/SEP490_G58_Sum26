import path from 'node:path';

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

function sheetFor(moduleId) {
  const file = path.basename(moduleId);
  if (file === 'roles.test.js') return 'Roles.config';
  if (file === 'RequireRole.test.jsx') return 'RequireRole';
  if (file === 'Sidebar.test.jsx') return 'Sidebar';
  if (file === 'EngineLogPage.test.jsx') return 'EngineLogPage';
  return path.basename(file, path.extname(file));
}

function typeLabel(type) {
  if (type === 'A') return color(YELLOW, 'A');
  if (type === 'B') return color(MAGENTA, 'B');
  return color(CYAN, 'N');
}

export default class SheetEvidenceReporter {
  constructor() {
    this.startedAt = Date.now();
  }

  onTestRunStart() {
    this.startedAt = Date.now();
  }

  onTestModuleEnd(testModule) {
    const tests = [...testModule.children.allTests()];
    const sheet = sheetFor(testModule.moduleId);
    const relativeFile = path.relative(process.cwd(), testModule.moduleId).replaceAll('\\', '/');
    const passed = testModule.ok();

    process.stdout.write(`\n${color(passed ? GREEN : RED, passed ? 'PASS' : 'FAIL')} ${relativeFile}\n`);
    process.stdout.write(`\n  ${color(CYAN, sheet)}\n`);

    tests.forEach((testCase, index) => {
      const result = testCase.result();
      const type = classify(testCase.name);
      const testPassed = result.state === 'passed';
      const marker = color(testPassed ? GREEN : RED, testPassed ? '✓' : '✗');
      const testCaseId = `TC${String(index + 1).padStart(2, '0')}`;
      const durationValue = testCase.diagnostic()?.duration;
      const duration = Number.isFinite(durationValue) ? color(DIM, ` (${Math.round(durationValue)} ms)`) : '';
      process.stdout.write(`    ${marker} ${testCaseId} [${typeLabel(type)}] ${testCase.name}${duration}\n`);

      if (!testPassed && result.errors) {
        for (const error of result.errors) {
          process.stdout.write(`      ${color(RED, error.message || String(error))}\n`);
        }
      }
    });
  }

  onTestRunEnd(testModules, unhandledErrors, reason) {
    const modules = [...testModules];
    const tests = modules.flatMap((testModule) => [...testModule.children.allTests()]);
    const passedSuites = modules.filter((testModule) => testModule.ok()).length;
    const failedSuites = modules.length - passedSuites;
    const passedTests = tests.filter((testCase) => testCase.result().state === 'passed').length;
    const failedTests = tests.filter((testCase) => testCase.result().state === 'failed').length;
    const elapsedSeconds = ((Date.now() - this.startedAt) / 1000).toFixed(3);
    const successful = reason === 'passed' && failedSuites === 0 && failedTests === 0 && unhandledErrors.length === 0;

    process.stdout.write('\n');
    process.stdout.write(`Test Files:  ${color(successful ? GREEN : RED, `${passedSuites} passed`)}, ${failedSuites} failed, ${modules.length} total\n`);
    process.stdout.write(`Tests:       ${color(successful ? GREEN : RED, `${passedTests} passed`)}, ${failedTests} failed, ${tests.length} total\n`);
    process.stdout.write(`Time:        ${elapsedSeconds} s\n`);
  }
}
