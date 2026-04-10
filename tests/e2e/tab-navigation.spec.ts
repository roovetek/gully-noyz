import { test } from './fixtures/test';

test.describe('Match tab navigation', () => {
  test('navigates across record/timeline/stats/config tabs', async ({
    landingPage,
    createMatchFlow,
    appShellPage,
    recordPage,
    timelinePage,
    statsPage,
    configPage,
  }) => {
    await landingPage.goto();
    await createMatchFlow({
      name: 'Tab Nav Match',
      umpirePasscode: '1234',
    });

    await recordPage.expectLoaded();
    await appShellPage.expectMainTabsVisible();

    await appShellPage.switchMainTab('Timeline');
    await timelinePage.expectNoClipsMessage();

    await appShellPage.switchMainTab('Stats');
    await statsPage.expectLoaded();

    await appShellPage.switchMainTab('Config');
    await configPage.expectLoaded();

    await appShellPage.switchMainTab('Record');
    await recordPage.expectLoaded();
  });

  test('admin backdoor remains available via hash route', async ({ appShellPage, adminPage }) => {
    await appShellPage.gotoAdminBackdoor();
    await adminPage.expectLoginVisible();
  });
});

