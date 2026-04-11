import { expect, type Page } from '@playwright/test';
import type { ManualOutcome } from './types';

export class RecordPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page.getByText('Start Delivery')).toBeVisible();
    await expect(this.page.getByText(/^AI Assist$/)).toBeVisible();
  }

  async expectVoiceControlVisible() {
    await expect(this.page.getByText('Hold to Speak')).toBeVisible();
  }

  async openManualOutcomeDrawer() {
    await this.confirmOverIfNeeded();
    const skipButton = this.page.getByTestId('skip-recording-button');
    await expect(skipButton).toBeVisible();
    await expect(skipButton).toBeEnabled();
    await skipButton.click();
    await expect(this.page.getByTestId('manual-outcome-drawer')).toBeVisible();
  }

  async chooseOutcome(outcome: ManualOutcome) {
    const label = outcome === 'dot' ? 'Outcome Dot' : `Outcome ${outcome}`;
    await this.page.getByRole('button', { name: label }).click({ force: true });
  }

  async setExtraRuns(extraRuns: number) {
    await this.page.getByTestId('extra-runs-input').selectOption(String(extraRuns));
  }

  async setDismissalType(value: string) {
    await this.page.getByTestId('dismissal-type-select').selectOption(value);
  }

  async saveClip() {
    const saveButton = this.page.getByRole('button', { name: 'Save Clip' });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(this.page.getByTestId('manual-outcome-drawer')).toBeHidden();
  }

  async expectSaveClipVisible() {
    await expect(this.page.getByRole('button', { name: 'Save Clip' })).toBeVisible();
  }

  async recordManualOutcome(
    outcome: ManualOutcome,
    options?: { dismissalType?: string; extraRuns?: number }
  ) {
    await this.openManualOutcomeDrawer();
    await this.chooseOutcome(outcome);
    if (options?.extraRuns !== undefined && (outcome === 'wide' || outcome === 'noball')) {
      await this.setExtraRuns(options.extraRuns);
    }
    if (outcome === 'wicket' && options?.dismissalType) {
      await this.setDismissalType(options.dismissalType);
    }
    await this.saveClip();
    await this.confirmOverIfNeeded();
  }

  async setAiMode(mode: 'off' | 'live' | 'mock') {
    await this.page.getByTestId('ai-assist-mode-select').selectOption(mode);
  }

  async expectAiStatus(text: RegExp | string) {
    await expect(this.page.getByTestId('ai-assist-status')).toContainText(text);
  }

  async expectAiSuggestionHeadingVisible() {
    await expect(this.page.getByTestId('ai-suggestion-heading')).toBeVisible();
  }

  async confirmOverIfNeeded() {
    const confirmButton = this.page.getByTestId('confirm-over-continue-button');
    if (await confirmButton.isVisible().catch(() => false)) {
      await confirmButton.click({ force: true });
      await expect(confirmButton).toBeHidden({ timeout: 10000 });
    }
  }
}

