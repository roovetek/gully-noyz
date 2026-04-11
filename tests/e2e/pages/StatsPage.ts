import { expect, type Page } from '@playwright/test';

export class StatsPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page.getByTestId('match-stats-heading')).toBeVisible();
  }
}

