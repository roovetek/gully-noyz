import { expect, test } from './fixtures/test';

const runDbVisual = process.env.RUN_DB_E2E === 'true';

test.describe('Dark Studio visual baselines', () => {
  test('landing and create modal visuals', async ({ landingPage, page }) => {
    await landingPage.goto();
    await landingPage.expectLoaded();

    await expect(page).toHaveScreenshot('landing-dark-studio.png', {
      fullPage: true,
      animations: 'disabled',
    });

    await landingPage.openCreateMatchModal();
    await expect(page).toHaveScreenshot('create-modal-dark-studio.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('admin console login visual', async ({ appShellPage, adminPage, page }) => {
    await appShellPage.gotoAdminBackdoor();
    await adminPage.expectLoginVisible();
    await expect(page).toHaveScreenshot('admin-dark-studio.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('major match pages visuals', async ({
    landingPage,
    createMatchFlow,
    appShellPage,
    recordPage,
    page,
  }) => {
    test.skip(!runDbVisual, 'Requires DB-backed match creation; run with RUN_DB_E2E=true');

    await landingPage.goto();
    await createMatchFlow({
      name: 'Visual Baseline Match',
      umpirePasscode: '1234',
    });

    const dynamicMasks = [
      page.getByTestId('match-page-summary-strip'),
      page.getByTestId('record-over-ball-indicator'),
    ];

    await recordPage.expectLoaded();
    await expect(page).toHaveScreenshot('record-dark-studio.png', {
      fullPage: true,
      animations: 'disabled',
      mask: dynamicMasks,
    });

    await appShellPage.switchMainTab('Timeline');
    await expect(page).toHaveScreenshot('timeline-dark-studio.png', {
      fullPage: true,
      animations: 'disabled',
      mask: dynamicMasks,
    });

    await appShellPage.switchMainTab('Stats');
    await expect(page).toHaveScreenshot('stats-dark-studio.png', {
      fullPage: true,
      animations: 'disabled',
      mask: dynamicMasks,
    });

    await appShellPage.switchMainTab('Config');
    await expect(page).toHaveScreenshot('config-dark-studio.png', {
      fullPage: true,
      animations: 'disabled',
      mask: dynamicMasks,
    });
  });
});

