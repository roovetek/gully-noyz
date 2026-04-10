import { test } from './fixtures/test';

test.describe('Ball recording smoke', () => {
  test('opens manual outcome drawer and selects run outcome', async ({
    landingPage,
    createMatchFlow,
    recordPage,
  }) => {
    await landingPage.goto();
    await createMatchFlow({
      name: 'Ball Recording Match',
      umpirePasscode: '1234',
    });

    await recordPage.expectLoaded();
    await recordPage.openManualOutcomeDrawer();
    await recordPage.chooseOutcome('4');
    await recordPage.expectSaveClipVisible();
  });
});

