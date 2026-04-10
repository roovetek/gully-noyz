import { expect, type Page } from '@playwright/test';

export class TimelinePage {
  constructor(private readonly page: Page) {}

  async expectNoClipsMessage() {
    await expect(this.page.getByText(/no clips yet/i)).toBeVisible();
  }

  async expectLoaded() {
    await expect(this.page.getByText('Navigate to Ball')).toBeVisible();
  }
}

