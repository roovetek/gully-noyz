import { expect, type Page } from '@playwright/test';

export class TimelinePage {
  constructor(private readonly page: Page) {}

  async expectNoClipsMessage() {
    await expect(this.page.getByTestId('timeline-empty-heading')).toBeVisible();
  }

  async expectLoaded() {
    await expect(this.page.getByTestId('timeline-navigate-label')).toBeVisible();
  }
}

