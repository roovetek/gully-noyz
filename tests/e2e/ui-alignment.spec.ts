import { expect, test } from './fixtures/test';

test.describe('UI alignment regression', () => {
  test('record controls remain visible and non-overlapping', async ({
    openOrCreateReusableMatch,
    page,
  }) => {
    await openOrCreateReusableMatch({
      cacheKey: 'ui-alignment-shared-manual',
      name: 'UI Alignment Shared Match',
      umpirePasscode: '1234',
      voiceModeEnabled: false,
    });

    const inningsBadge = page.getByTestId('match-header-innings-1-label');
    const startDelivery = page.getByRole('button', { name: 'Start Recording' }).first();
    await expect(inningsBadge).toBeVisible();
    await expect(startDelivery).toBeVisible();

    const viewport = page.viewportSize();
    const badgeBox = await inningsBadge.boundingBox();
    const startBox = await startDelivery.boundingBox();
    expect(badgeBox).toBeTruthy();
    expect(startBox).toBeTruthy();
    if (viewport && badgeBox && startBox) {
      // Keep this robust across responsive layouts while still catching misplaced controls.
      expect(startBox.y).toBeGreaterThan(0);
      expect(startBox.y + startBox.height).toBeLessThanOrEqual(viewport.height);
      expect(startBox.y).toBeGreaterThanOrEqual(badgeBox.y);
    }
  });

  test('manual outcome drawer opens fully with actionable controls', async ({
    openOrCreateReusableMatch,
    recordPage,
    page,
  }) => {
    await openOrCreateReusableMatch({
      cacheKey: 'ui-alignment-shared-manual',
      name: 'UI Alignment Shared Match',
      umpirePasscode: '1234',
      voiceModeEnabled: false,
    });

    await recordPage.openManualOutcomeDrawer();
    const drawer = page.getByTestId('manual-outcome-drawer');
    const summaryStrip = page.getByTestId('match-page-summary-strip');
    await expect(drawer).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Clip' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();

    const stripBox = await summaryStrip.boundingBox();
    const drawerBox = await drawer.boundingBox();
    expect(stripBox).toBeTruthy();
    expect(drawerBox).toBeTruthy();
    if (stripBox && drawerBox) {
      expect(drawerBox.y).toBeGreaterThanOrEqual(stripBox.y + stripBox.height - 2);
    }
  });
});

