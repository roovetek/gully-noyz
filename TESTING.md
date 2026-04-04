# Testing Infrastructure

This project includes comprehensive testing infrastructure to ensure code quality and reliability.

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

```bash
npm run test          # Run tests in watch mode
npm run test:ui       # Run tests with UI
npm run test:run      # Run tests once (CI mode)
npm run test:coverage # Run tests with coverage report
```

## Test Structure

### Unit Tests (`tests/lib/`)
Tests for core cricket logic:
- `ballCounter.test.ts` - Ball counting and over calculations
- `rulesEngine.test.ts` - Rule application and overrides
- `bowlerValidator.test.ts` - Bowler validation rules

### Integration Tests (`tests/integration/`)
Tests for database operations:
- `matchCreation.test.ts` - Creating matches in database
- `clipStorage.test.ts` - Video clip storage and retrieval
- `matchDeletion.test.ts` - Test data management

### Component Tests (`tests/components/`)
Tests for React components:
- `MatchList.test.tsx` - Match list UI component

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
