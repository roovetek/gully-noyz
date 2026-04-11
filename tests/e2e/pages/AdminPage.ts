import { expect, type Page } from '@playwright/test';

export class AdminPage {
  constructor(private readonly page: Page) {}

  async expectLoginVisible() {
    await expect(this.page.getByRole('heading', { name: 'Admin Console' })).toBeVisible();
    await expect(this.page.getByPlaceholder('Enter Admin Password')).toBeVisible();
  }
}

