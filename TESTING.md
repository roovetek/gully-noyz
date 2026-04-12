# Testing Infrastructure

This project includes comprehensive testing infrastructure to ensure code quality and reliability.

## Source of Truth

- Canonical test case inventory lives in `TEST_CASES.md`.
- Add or update entries there whenever new scenarios are implemented.

## Test Data Isolation

All test data is completely isolated from production data using the `is_test_data` flag in the database.

### How It Works

- Test matches and clips are automatically marked with `is_test_data = true`
- Production queries automatically filter out test data with `is_test_data = false`
- Test data is invisible in the production UI
- Indexes ensure filtering doesn't impact performance

### Database Schema

The following tables have test data isolation:
- `matches` - includes `is_test_data` boolean column
- `clips` - includes `is_test_data` boolean column

## Running Tests

All npm test scripts now route through `scripts/with-test-env.mjs`, which injects fallback Supabase test env values and test-mode flags (`VITE_TEST_MODE=true`, `TEST_MODE=true`) when they are not already set.

```bash
npm run test          # Run tests in watch mode
npm run test:ui       # Run tests with UI
npm run test:run      # Run offline-safe unit/component/engine tests once (CI default)
npm run test:coverage # Run tests with coverage report
RUN_INTEGRATION_TESTS=true npm run test:run # Include Supabase-backed integration suites
npm run test:e2e      # Playwright E2E (headless)
npm run test:e2e:headed # Playwright E2E with visible browser
npm run test:e2e:debug  # Playwright Inspector + step-through
npm run test:schema:local # Validate local schema columns/tables before E2E
npm run test:schema:remote # Validate linked remote schema columns/tables
npm run test:schema:both # Validate local + remote schema
npm run qa:harness # Run schema + vitest + e2e + screenshot gallery report
```

### Playwright setup (local)

Install browser binaries once:

```bash
npm run test:e2e:install
```

Playwright tests live in `tests/e2e/` and include:
- `smoke.spec.ts` - app landing smoke
- `record-flow.spec.ts` - create match and verify record HUD
- `private-match.spec.ts` - private match create/join secret flow
- `tab-navigation.spec.ts` - admin hash backdoor smoke
- `three-over-six-ball.spec.ts` - rerunnable 3-over x 6-ball deterministic scenario
- `match-config-combinations.spec.ts` - create-match rules/validation scenario matrix
- `ai-modes-and-bypass.spec.ts` - AI mode transitions and manual fallback path
- `ui-alignment.spec.ts` - record page layout/alignment regression checks
- `ui-visual.spec.ts` - Dark Studio visual baselines (`toHaveScreenshot`) for key states
- `test1-runthrough.spec.ts` - main tabs + manual outcome drawer runthrough (`2026-04-09-Test1`)

Core Playwright flows now use Page Object Model classes and shared fixtures in:
- `tests/e2e/pages/*`
- `tests/e2e/fixtures/test.ts`

### E2E selector policy

- Prefer `getByRole` with stable accessible names.
- Add or use `data-testid` when copy is dynamic or roles are ambiguous (create-match flows, `VideoCapture`, match headers).
- Avoid `locator.nth()` and broad `getByText` in new tests; encapsulate locators in page objects.

### Suggested rerun sequence

```bash
npx supabase start
npm run test:schema:local
npm run test:run
npm run test:e2e -- --project=chrome-system-lite
```

## Hidden QA Gallery (`/#/qa`)

- Route: `/#/qa` (hidden; not linked in normal navigation). Enabled in dev (`import.meta.env.DEV`); for production builds set `VITE_ENABLE_QA_REPORT=true` (see `.env.example`).
- Data source:
  - latest compatibility: `public/qa/latest/report.json`
  - multi-run index: `public/qa/manifest.json`
  - per-run artifacts: `public/qa/runs/<qa-harness-run-id>/...`
- Includes:
  - command-level status (schema check, Vitest, Playwright),
  - per-command logs,
  - screenshot sequence with exact action text for each captured page.
- Full static HTML export is also generated at:
  - `public/qa/latest/report.html`
  - `public/qa/runs/<qa-harness-run-id>/report.html`
  - `runs/<qa-harness-run-id>/report.html`
- Harness retains a rolling public run window (default 20). Override with `QA_MAX_PUBLIC_RUNS=<n> npm run qa:harness`.

### Playwright Human Observation Controls

- Real-time visual watch:
  - `npm run test:e2e:headed`
- Interactive inspector and step-through:
  - `npm run test:e2e:debug`
  - `PWDEBUG=1 npm run test:e2e:smoke`
- Optional local-only observation helper controls (wired into selected headed specs):
  - `E2E_OBSERVE=true npm run test:e2e:headed` (adds bounded sleep points)
  - `E2E_OBSERVE=true E2E_OBSERVE_DELAY_MS=2500 npm run test:e2e:headed`
  - `E2E_OBSERVE=true E2E_OBSERVE_PAUSE=true npm run test:e2e:headed` (uses `page.pause()` checkpoints)
- CI safety: observation helpers are no-ops when `CI=true`, preventing accidental pipeline hangs.

## Test Structure

### Unit Tests (`tests/lib/`)
Tests for core cricket logic:
- `ballCounter.test.ts` - Ball counting and over calculations
- `match.test.ts` - Match-level overs and stats calculations
- `validation.test.ts` - Input and domain validation rules
- `aiScoringClient.test.ts` - Local AI mode and fetch fallback behavior
- `security.test.ts` - Secret hashing/verification, match id, session secure storage helpers
- `appUrl.test.ts` - Hash route generation and parsing
- `dismissalOptions.test.ts` - Dismissal option ordering and labels
- `deleteMatch.test.ts` - Delete flow validation and RPC behavior
- `requestTracker.test.ts` - Audit payload tracking behavior
- `userFriendlyError.test.ts` - Error to user-facing message mapping

### Integration Tests (`tests/integration/`)
Tests for database operations:
- `matchCreation.test.ts` - Creating matches in database
- `clipStorage.test.ts` - Video clip storage and retrieval
- `matchDeletion.test.ts` - Test data management
- `rulesEngine.integration.test.ts` - Effective/global rules + overrides against DB
- `bowlerValidator.integration.test.ts` - Bowler constraints from persisted clips

These tests are skipped unless `RUN_INTEGRATION_TESTS=true` is set.

### Component Tests (`tests/components/`)
Tests for React components:
- `MatchList.test.tsx` - Match list UI component
- `RecordLayout.test.tsx` - Record page non-overlapping flex layout
- `VideoCaptureSmoke.test.tsx` - Record HUD smoke + key outcome interaction checks
- `CreateMatchModal.test.tsx` - Match creation form validation and loading/error states
- `MatchSelector.test.tsx` - Create/join/browse interactions and private secret prompt path
- `Header.test.tsx` - Home/Gully Rulz navigation and active state styling

### E2E Tests (`tests/e2e/`)
Real browser interaction tests (Playwright):
- `smoke.spec.ts` - Landing page renders key actions
- `record-flow.spec.ts` - Create match and enter record flow
- `private-match.spec.ts` - Private match end-to-end join verification flow
- `tab-navigation.spec.ts` - Hidden admin route smoke
- `three-over-six-ball.spec.ts` - 3-over x 6-ball outcome matrix
- `match-config-combinations.spec.ts` - Public/private/customized rule combinations
- `ai-modes-and-bypass.spec.ts` - AI mode availability and bypass coverage
- `ui-alignment.spec.ts` - Non-overlap and placement checks for key controls
- `ui-visual.spec.ts` - Screenshot baselines for landing/match pages
- `test1-runthrough.spec.ts` - Tab navigation + manual recording runthrough (Test1 scenario)

### Engine Tests (`tests/engine/`)
Reducer/adapter/parity tests:
- `matchEngine.test.ts` - Deterministic scoring + edge cases
- `intentParser.test.ts` - STT-like intent mapping to reducer payloads
- `adapters.test.ts` - Mapping between clips and reducer payloads
- `clipManager.test.ts` - Highlight and trim window logic
- `parity.test.ts` - Legacy vs engine scoring parity checks

## Test Helpers

### Factories (`tests/helpers/factories.ts`)

Helper functions for creating test data:

```typescript
import { createTestMatch, createTestClip, setupTestMatch, cleanupTestData } from './helpers/factories';

// Create a test match
const match = await createTestMatch({
  name: 'Test Match',
  total_overs: 20,
  balls_per_over: 6,
});

// Create a test clip
const clip = await createTestClip({
  match_id: match.match_id,
  over_number: 1,
  ball_number: 1,
  outcome: '4',
});

// Setup complete match with clips
const { match, clips } = await setupTestMatch({
  matchOptions: { name: 'Test' },
  clips: [
    { over_number: 1, ball_number: 1, outcome: 'dot' },
    { over_number: 1, ball_number: 2, outcome: '4' },
  ],
});

// Cleanup all test data
await cleanupTestData();
```

### Mocks (`tests/helpers/mocks.ts`)

Mock objects for testing:
- `mockSupabaseClient()` - Mocked Supabase client
- `mockMediaRecorder()` - Mocked MediaRecorder API

## Test Data Best Practices

1. Always use `createTestMatch()` and `createTestClip()` to create test data
2. All test data is automatically marked with `is_test_data = true`
3. Use `cleanupTestData()` in `beforeEach` and `afterEach` hooks
4. Never create production data in tests
5. Test data is isolated and won't appear in production UI

## Environment Variables

Tests automatically set `TEST_MODE=true` in the test environment. This enables:
- Test data visibility in test environment
- Proper filtering in production environment
- Automatic test data isolation

Optional:
- `RUN_INTEGRATION_TESTS=true` to run Supabase-backed integration suites.

## Manual Hardware + Local AI Checklist

- Use `MANUAL_MEDIA_AI_CHECKLIST.md` for real camera/mic and local-AI verification.
- This hybrid checklist complements automated tests for browser/device-dependent behavior.

## Coverage

Run coverage reports with:
```bash
npm run test:coverage
```

Coverage reports are generated in:
- Console (text format)
- `coverage/index.html` (HTML format)
- `coverage/coverage-final.json` (JSON format)

## CI/CD Integration

Tests are designed to run in CI/CD pipelines:
- Use `npm run test:run` for one-time test execution
- CI default runs offline-safe tests only; integration tests require explicit env opt-in
- Playwright is configured for local use; CI E2E job can be added later when desired
- All tests clean up after themselves
- No manual cleanup required
- Test data is automatically isolated

## Troubleshooting

### Tests Failing Due to RLS Policies

If tests fail with permission errors, ensure:
1. RLS policies allow test data operations
2. Test data uses `is_test_data = true` flag
3. Queries properly filter test data

### Test Data Not Cleaning Up

If test data persists:
1. Ensure `cleanupTestData()` is called in `afterEach`
2. Check that test data has `is_test_data = true`
3. Verify Supabase connection is working

### Tests Running Slowly

If tests are slow:
1. Use `test:run` instead of watch mode
2. Reduce number of test data records
3. Mock external dependencies where appropriate
