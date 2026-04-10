import { expect, test } from './fixtures/test';

test.describe('Match configuration combinations', () => {
  test('validates private match requires secret', async ({
    landingPage,
    createMatchModalPage,
    page,
  }) => {
    await landingPage.goto();
    await landingPage.openCreateMatchModal();
    await createMatchModalPage.expectVisible();

    await page.getByPlaceholder('e.g., India vs Pakistan Finals').fill('Private Validation Match');
    await page.getByPlaceholder('Set a passcode for the umpire').fill('1234');
    await page.getByRole('checkbox', { name: 'Private match toggle' }).check();
    await page.getByTestId('create-match-submit').click();

    await expect(page.getByText(/please enter a secret/i)).toBeVisible();
  });

  test('creates match with customize on and verifies rules in match info', async ({
    landingPage,
    createMatchFlow,
    appShellPage,
    configPage,
  }) => {
    await landingPage.goto();
    await createMatchFlow({
      name: 'Custom Rules Match',
      umpirePasscode: '1234',
      customizeRules: {
        oversPerInnings: 3,
        ballsPerOver: 6,
        maxWickets: 5,
        maxOversPerBowler: 2,
      },
    });

    await appShellPage.switchMainTab('Config');
    await configPage.expectRuleLine('Overs per innings: 3');
    await configPage.expectRuleLine('Balls per over: 6');
    await configPage.expectRuleLine('Max wickets: 5');
    await configPage.expectRuleLine('Max overs per bowler: 2');
  });

  test('creates public match with defaults (customize off)', async ({
    landingPage,
    createMatchFlow,
    appShellPage,
    configPage,
  }) => {
    await landingPage.goto();
    await createMatchFlow({
      name: 'Default Rules Match',
      umpirePasscode: '1234',
    });

    await appShellPage.switchMainTab('Config');
    await configPage.expectRuleLine(/Overs per innings:/);
    await configPage.expectRuleLine(/Balls per over:/);
  });
});

