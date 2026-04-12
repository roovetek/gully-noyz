import { test } from './fixtures/test';

test.describe('AI availability and bypass', () => {
  test('supports off/mock/live mode switching and manual bypass', async ({
    page,
    landingPage,
    createMatchFlow,
    recordPage,
  }) => {
    await landingPage.goto();
    await createMatchFlow({
      name: 'AI Harness Match',
      umpirePasscode: '1234',
      voiceModeEnabled: false,
    });

    await recordPage.setAiMode('mock');
    await recordPage.expectAiStatus(/mode updated/i);

    await recordPage.openManualOutcomeDrawer();
    await recordPage.expectAiSuggestionHeadingVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await recordPage.setAiMode('live');
    await recordPage.expectAiStatus(/mode updated/i);

    await recordPage.openManualOutcomeDrawer();
    await recordPage.expectAiStatus(/record audio to use live ai/i);
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Manual bypass controls remain available after AI-mode probing.
    await recordPage.setAiMode('off');
    await recordPage.expectAiStatus(/ai assist is off/i);
    await recordPage.openManualOutcomeDrawer();
    await recordPage.chooseOutcome('4');
    await recordPage.expectSaveClipVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await recordPage.expectLoaded();
  });
});

