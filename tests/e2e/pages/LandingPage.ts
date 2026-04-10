import { expect, type Locator, type Page } from '@playwright/test';

export class LandingPage {
  readonly page: Page;
  readonly createMatchButton: Locator;
  readonly joinMatchButton: Locator;
  readonly matchIdInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createMatchButton = page.getByRole('button', { name: 'Create Match' }).first();
    this.joinMatchButton = page.getByRole('button', { name: 'Join Match', exact: true });
    this.matchIdInput = page.getByPlaceholder('Enter Match ID');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await this.page.goto('/');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.createMatchButton).toBeVisible();
    await expect(this.joinMatchButton).toBeVisible();
  }

  async openCreateMatchModal(): Promise<void> {
    await this.createMatchButton.click();
    await expect(this.page.getByTestId('create-match-modal')).toBeVisible();
  }

  async joinByMatchId(matchId: string): Promise<void> {
    await this.matchIdInput.fill(matchId);
    await this.joinMatchButton.click();
  }
}

