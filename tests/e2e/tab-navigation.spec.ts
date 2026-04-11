import { test } from './fixtures/test';

test.describe('Admin backdoor', () => {
  test('admin backdoor remains available via hash route', async ({ appShellPage, adminPage }) => {
    await appShellPage.gotoAdminBackdoor();
    await adminPage.expectLoginVisible();
  });
});
