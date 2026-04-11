import { expect, type Page } from '@playwright/test';
import type { CreateMatchOptions } from './types';

export class CreateMatchModalPage {
  constructor(private readonly page: Page) {}

  async expectVisible() {
    await expect(this.page.getByTestId('create-match-modal')).toBeVisible();
  }

  async fillBasics(name: string, umpirePasscode: string) {
    await this.page.getByPlaceholder('e.g., India vs Pakistan Finals').fill(name);
    await this.page.getByPlaceholder('Set a passcode for the umpire').fill(umpirePasscode);
  }

  async setPrivateMatch(enabled: boolean) {
    const box = this.page.getByRole('checkbox', { name: 'Private match toggle' });
    if (enabled) await box.check();
    else await box.uncheck();
  }

  async submitCreate() {
    await this.page.getByTestId('create-match-submit').click();
  }

  async expectFormError(matcher: RegExp | string) {
    const alert = this.page.getByTestId('create-match-form-error');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(matcher);
  }

  async createMatch(options: CreateMatchOptions) {
    await this.expectVisible();
    await this.fillBasics(options.name, options.umpirePasscode);

    if (options.customizeRules) {
      await this.page.getByRole('button', { name: 'Toggle customize rules' }).click();
      if (options.customizeRules.oversPerInnings !== undefined) {
        await this.page
          .getByTestId('rules-overs-per-innings-input')
          .fill(String(options.customizeRules.oversPerInnings));
      }
      if (options.customizeRules.ballsPerOver !== undefined) {
        await this.page
          .getByTestId('rules-balls-per-over-input')
          .fill(String(options.customizeRules.ballsPerOver));
      }
      if (options.customizeRules.maxWickets !== undefined) {
        await this.page.getByTestId('rules-max-wickets-input').fill(String(options.customizeRules.maxWickets));
      }
      if (options.customizeRules.maxOversPerBowler !== undefined) {
        await this.page
          .getByTestId('rules-max-overs-per-bowler-input')
          .fill(String(options.customizeRules.maxOversPerBowler));
      }
    }

    if (options.isPrivate) {
      await this.setPrivateMatch(true);
      if (options.secret) {
        await this.page.getByPlaceholder('Enter a secret code').fill(options.secret);
      }
    }

    await this.submitCreate();
  }
}

