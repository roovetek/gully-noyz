import { test as base, expect } from '@playwright/test';
import { LandingPage } from '../pages/LandingPage';
import { CreateMatchModalPage } from '../pages/CreateMatchModalPage';
import { AppShellPage } from '../pages/AppShellPage';
import { RecordPage } from '../pages/RecordPage';
import { TimelinePage } from '../pages/TimelinePage';
import { StatsPage } from '../pages/StatsPage';
import { ConfigPage } from '../pages/ConfigPage';
import { AdminPage } from '../pages/AdminPage';
import type { CreateMatchOptions } from '../pages/types';

type AppFixtures = {
  landingPage: LandingPage;
  createMatchModalPage: CreateMatchModalPage;
  appShellPage: AppShellPage;
  recordPage: RecordPage;
  timelinePage: TimelinePage;
  statsPage: StatsPage;
  configPage: ConfigPage;
  adminPage: AdminPage;
  createMatchFlow: (options: CreateMatchOptions) => Promise<void>;
};

export const test = base.extend<AppFixtures>({
  landingPage: async ({ page }, use) => {
    await use(new LandingPage(page));
  },
  createMatchModalPage: async ({ page }, use) => {
    await use(new CreateMatchModalPage(page));
  },
  appShellPage: async ({ page }, use) => {
    await use(new AppShellPage(page));
  },
  recordPage: async ({ page }, use) => {
    await use(new RecordPage(page));
  },
  timelinePage: async ({ page }, use) => {
    await use(new TimelinePage(page));
  },
  statsPage: async ({ page }, use) => {
    await use(new StatsPage(page));
  },
  configPage: async ({ page }, use) => {
    await use(new ConfigPage(page));
  },
  adminPage: async ({ page }, use) => {
    await use(new AdminPage(page));
  },
  createMatchFlow: async ({ landingPage, createMatchModalPage, recordPage }, use) => {
    await use(async (options: CreateMatchOptions) => {
      await landingPage.openCreateMatchModal();
      await createMatchModalPage.createMatch(options);
      await recordPage.expectLoaded();
    });
  },
});

export { expect };

