import { expect, test } from './fixtures/test';

test.describe('Private match journey', () => {
  test('create private match and require secret on rejoin', async ({
    page,
    landingPage,
    createMatchFlow,
    appShellPage,
    recordPage,
  }) => {
    await landingPage.goto();

    await createMatchFlow({
      name: 'Private E2E Match',
      umpirePasscode: '1234',
      isPrivate: true,
      secret: 'secret123',
    });

    await recordPage.expectLoaded();

    const createdHash = page.url().split('#')[1] ?? '';
    const matchId = createdHash.split('/')[2];
    expect(matchId).toMatch(/^[A-Z0-9]{6}$/);

    await page.evaluate(() => sessionStorage.clear());
    await appShellPage.goHome();

    await landingPage.joinByMatchId(matchId);
    await expect(page.getByRole('heading', { name: 'Private Match' })).toBeVisible();

    await page.getByPlaceholder('Enter the secret code').fill('wrong-secret');
    await page.getByRole('button', { name: 'Access Match' }).click();
    await expect(page.getByTestId('secret-prompt-error')).toContainText(/incorrect secret/i);

    await page.getByPlaceholder('Enter the secret code').fill('secret123');
    await page.getByRole('button', { name: 'Access Match' }).click();
    await recordPage.expectLoaded();
  });
});

