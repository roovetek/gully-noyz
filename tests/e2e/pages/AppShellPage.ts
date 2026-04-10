import { expect, type Page } from '@playwright/test';

export class AppShellPage {
  constructor(private readonly page: Page) {}

  async goHome() {
    await this.page.getByRole('button', { name: 'Home' }).click();
  }

  async gotoAdminBackdoor() {
    await this.page.goto('/#/admin');
  }

  async switchMainTab(tab: 'Record' | 'Timeline' | 'Stats' | 'Config') {
    await this.page.getByRole('button', { name: tab, exact: true }).click();
  }

  async expectMainTabsVisible() {
    await expect(this.page.getByRole('button', { name: 'Record', exact: true })).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Timeline', exact: true })).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Stats', exact: true })).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Config', exact: true })).toBeVisible();
  }
}

