import { expect, test } from './fixtures/test';

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
    });

    await recordPage.setAiMode('mock');
    await recordPage.expectAiStatus(/mode updated/i);

    await recordPage.openManualOutcomeDrawer();
    await expect(page.getByText('AI Suggestion')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await recordPage.setAiMode('live');
    await recordPage.expectAiStatus(/mode updated/i);

    await recordPage.openManualOutcomeDrawer();
    await expect(page.getByText(/record audio to use live ai/i)).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Manual bypass should always work even when live AI has no audio/service.
    await recordPage.recordManualOutcome('4');
    await recordPage.expectLoaded();
  });
});

