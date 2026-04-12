import type { Page } from '@playwright/test';

function parseDelay(raw: string | undefined, fallbackMs: number): number {
  if (!raw) return fallbackMs;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallbackMs;
  return parsed;
}

function isCi(): boolean {
  return process.env.CI === 'true' || process.env.CI === '1';
}

function canObserve(): boolean {
  if (isCi()) return false;
  return process.env.E2E_OBSERVE === 'true' || Boolean(process.env.PWDEBUG);
}

export async function maybeSleepForObservation(
  page: Page,
  reason: string,
  defaultMs = 1200
): Promise<void> {
  if (!canObserve()) return;
  const delayMs = parseDelay(process.env.E2E_OBSERVE_DELAY_MS, defaultMs);
  if (delayMs <= 0) return;
  // Useful for visually confirming UI transitions during local debug runs.
  console.log(`[observe] sleeping ${delayMs}ms: ${reason}`);
  await page.waitForTimeout(delayMs);
}

export async function maybePauseForObservation(page: Page, reason: string): Promise<void> {
  if (!canObserve()) return;
  if (process.env.E2E_OBSERVE_PAUSE !== 'true') return;
  console.log(`[observe] paused for manual inspection: ${reason}`);
  await page.pause();
}
