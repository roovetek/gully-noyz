import { expect, test } from './fixtures/test';

type ResponsiveViewport = {
  name: string;
  width: number;
  height: number;
};

const responsiveViewports: ResponsiveViewport[] = [
  { name: 'mobile-320x568', width: 320, height: 568 },
  { name: 'mobile-390x844', width: 390, height: 844 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'desktop-1280x720', width: 1280, height: 720 },
];

test.describe('Responsive layout suite', () => {
  for (const viewport of responsiveViewports) {
    test(`landing controls render at ${viewport.name}`, async ({ page, landingPage }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await landingPage.goto();
      await landingPage.expectLoaded();

      const createMatchButton = page.getByRole('button', { name: 'Create Match' }).first();
      const joinMatchButton = page.getByRole('button', { name: 'Join Match', exact: true });

      await expect(createMatchButton).toBeVisible();
      await expect(joinMatchButton).toBeVisible();
    });

    test(`record layout remains usable at ${viewport.name}`, async ({
      page,
      openOrCreateReusableMatch,
      recordPage,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await openOrCreateReusableMatch({
        cacheKey: 'responsive-record-layout-manual',
        name: 'Responsive Layout Reuse Match',
        umpirePasscode: '1234',
        voiceModeEnabled: false,
      });

      await recordPage.expectLoaded();

      const docOverflow = await page.evaluate(() => {
        const el = document.documentElement;
        return el.scrollWidth <= el.clientWidth + 1;
      });
      expect(docOverflow).toBe(true);

      const summaryStrip = page.getByTestId('match-page-summary-strip');
      const captureModePicker = page.getByTestId('capture-mode-picker');
      const aiAssistModeSelect = page.getByTestId('ai-assist-mode-select');
      const startRecordingButton = page.getByRole('button', { name: 'Start Recording' }).first();
      const skipRecordingButton = page.getByTestId('skip-recording-button');

      await expect(summaryStrip).toBeVisible();
      await expect(captureModePicker).toBeVisible();
      await expect(aiAssistModeSelect).toBeVisible();
      await expect(startRecordingButton).toBeVisible();
      await expect(skipRecordingButton).toBeVisible();

      const summaryBox = await summaryStrip.boundingBox();
      const startBox = await startRecordingButton.boundingBox();

      expect(summaryBox).toBeTruthy();
      expect(startBox).toBeTruthy();

      if (summaryBox && startBox) {
        expect(startBox.y).toBeGreaterThan(0);
        expect(startBox.y + startBox.height).toBeLessThanOrEqual(viewport.height);
      }

      await recordPage.openManualOutcomeDrawer();
      const drawer = page.getByTestId('manual-outcome-drawer');
      const recordBallIndicator = page.getByTestId('record-over-ball-indicator');
      await expect(drawer).toBeVisible();
      await expect(recordBallIndicator).toBeVisible();
      await expect(page.getByRole('button', { name: 'Save Clip' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();

      const drawerBox = await drawer.boundingBox();
      const recordBallBox = await recordBallIndicator.boundingBox();
      expect(drawerBox).toBeTruthy();
      expect(recordBallBox).toBeTruthy();
      if (drawerBox && recordBallBox && summaryBox) {
        expect(recordBallBox.y).toBeGreaterThanOrEqual(summaryBox.y + summaryBox.height - 2);
        expect(drawerBox.y + drawerBox.height).toBeLessThanOrEqual(viewport.height + 2);
      }
    });
  }
});
