import { test } from './fixtures/test';

test.describe('Record flow smoke', () => {
  test('create public match and enter record screen', async ({ landingPage, createMatchFlow, recordPage }) => {
    await landingPage.goto();
    await createMatchFlow({
      name: 'E2E Smoke Match',
      umpirePasscode: '1234',
    });

    await recordPage.expectLoaded();
    await recordPage.expectVoiceControlVisible();
  });
});

