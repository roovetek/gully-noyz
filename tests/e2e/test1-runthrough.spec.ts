import { test } from './fixtures/test';

test.describe('2026-04-09-Test1 runthrough', () => {
  test('creates 2026-04-09-Test1 and runs core workflow checks', async ({
    landingPage,
    createMatchFlow,
    recordPage,
    appShellPage,
    timelinePage,
    statsPage,
    configPage,
  }) => {
    await landingPage.goto();

    await createMatchFlow({
      name: '2026-04-09-Test1',
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

    await recordPage.openManualOutcomeDrawer();
    await recordPage.chooseOutcome('4');
    await recordPage.expectSaveClipVisible();
  });
});

