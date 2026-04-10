import { test } from './fixtures/test';

test.describe('3-over x 6-ball deterministic run', () => {
  test('records outcomes across three overs with extras and wicket paths', async ({
    landingPage,
    createMatchFlow,
    recordPage,
    appShellPage,
    timelinePage,
    statsPage,
  }) => {
    test.setTimeout(120000);
    await landingPage.goto();
    await createMatchFlow({
      name: '3Over-6Ball-Harness',
      umpirePasscode: '1234',
      customizeRules: {
        oversPerInnings: 3,
        ballsPerOver: 6,
        maxWickets: 10,
        maxOversPerBowler: 3,
      },
    });

    const record = async (
      outcome: '4' | '6' | 'wide' | 'noball' | 'wicket' | 'other',
      options?: { dismissalType?: string; extraRuns?: number }
    ) => {
      await recordPage.recordManualOutcome(outcome, options);
    };

    // Over 1 (6 legal + 2 illegal deliveries)
    await record('4');
    await record('6');
    await record('wide', { extraRuns: 1 }); // illegal delivery in some rule sets
    await record('other');
    await record('noball', { extraRuns: 1 }); // illegal delivery
    await record('4');
    await record('wicket', { dismissalType: 'bowled' });
    await record('6');

    // Over 2 (6 legal)
    await record('4');
    await record('6');
    await record('other');
    await record('4');
    await record('6');
    await record('4');

    // Over 3 (6 legal)
    await record('4');
    await record('6');
    await record('wicket', { dismissalType: 'caught' });
    await record('4');
    await record('other');
    await record('6');

    await appShellPage.switchMainTab('Timeline');
    await timelinePage.expectLoaded();

    await appShellPage.switchMainTab('Stats');
    await statsPage.expectLoaded();
  });
});

