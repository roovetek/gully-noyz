import { expect, type Page } from '@playwright/test';

export class ConfigPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page.getByText('Match Info')).toBeVisible();
  }

  async expectRuleLine(line: string | RegExp) {
    await expect(this.page.getByText(line)).toBeVisible();
  }
}

