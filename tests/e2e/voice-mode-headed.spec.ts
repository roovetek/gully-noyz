import { expect, test } from './fixtures/test';
import { maybePauseForObservation, maybeSleepForObservation } from './helpers/observation';

test.describe('Voice mode UI flow', () => {
  test('creates match with voice mode enabled by default', async ({
    page,
    landingPage,
    createMatchFlow,
    recordPage,
  }) => {
    await landingPage.goto();
    await maybeSleepForObservation(page, 'Landing loaded before match creation');
    await createMatchFlow({
      name: 'Voice Mode Default On',
      umpirePasscode: '1234',
    });
    await maybePauseForObservation(page, 'Created match and entered record tab');

    await recordPage.expectLoaded();
    await expect(page.getByTestId('capture-mode-picker')).toBeVisible();

    await expect
      .poll(async () => page.evaluate(() => sessionStorage.getItem('capture_mode')))
      .toBe('voice');
  });

  test('supports explicit-off create path and in-page re-enable', async ({
    page,
    landingPage,
    createMatchFlow,
  }) => {
    await landingPage.goto();
    await maybeSleepForObservation(page, 'Landing loaded for explicit-off flow');
    await createMatchFlow({
      name: 'Voice Mode Explicit Off',
      umpirePasscode: '1234',
      voiceModeEnabled: false,
    });

    await expect
      .poll(async () => page.evaluate(() => sessionStorage.getItem('capture_mode')))
      .toBe('manual');

    await expect(page.getByTestId('ai-assist-mode-select')).toBeVisible();
    await expect(page.getByTestId('capture-mode-picker')).toBeVisible();

    // CaptureModePicker is always visible — switch back to voice
    const voiceChip = page.getByTestId('capture-mode-voice');
    await voiceChip.click();
    await expect
      .poll(async () => page.evaluate(() => sessionStorage.getItem('capture_mode')))
      .toBe('voice');

    const bothChip = page.getByTestId('capture-mode-video+voice');
    await bothChip.click();
    await expect
      .poll(async () => page.evaluate(() => sessionStorage.getItem('capture_mode')))
      .toBe('video+voice');
  });
});
