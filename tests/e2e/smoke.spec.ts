import { test } from './fixtures/test';

test.describe('App smoke', () => {
  test('loads landing and shows match entry controls', async ({ landingPage }) => {
    await landingPage.goto();
    await landingPage.expectLoaded();
  });
});

