const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVITY_CHECK_INTERVAL_MS = 60 * 1000;
const SESSION_WARNING_THRESHOLD_MS = 5 * 60 * 1000;

let lastActivityTime = Date.now();
let timeoutTimer: NodeJS.Timeout | null = null;
let warningCallback: ((timeRemaining: number) => void) | null = null;
let expireCallback: (() => void) | null = null;

export interface SessionManager {
  recordActivity: () => void;
  getTimeRemaining: () => number;
  getIsWarning: () => boolean;
  onWarning: (callback: (timeRemaining: number) => void) => void;
  onExpire: (callback: () => void) => void;
  clearCallbacks: () => void;
  clearSession: () => void;
  initializeSessionMonitor: () => void;
  stopSessionMonitor: () => void;
}

function updateLastActivity() {
  lastActivityTime = Date.now();
}

function getTimeRemaining(): number {
  const elapsed = Date.now() - lastActivityTime;
  const remaining = Math.max(0, SESSION_TIMEOUT_MS - elapsed);
  return remaining;
}

function getIsWarning(): boolean {
  return getTimeRemaining() <= SESSION_WARNING_THRESHOLD_MS && getTimeRemaining() > 0;
}

function checkSessionTimeout() {
  const timeRemaining = getTimeRemaining();

  if (timeRemaining <= 0) {
    if (expireCallback) {
      expireCallback();
    }
    clearSession();
    stopSessionMonitor();
  } else if (getIsWarning() && warningCallback) {
    warningCallback(timeRemaining);
  }
}

function clearSession() {
  sessionStorage.clear();
}

function onWarning(callback: (timeRemaining: number) => void) {
  warningCallback = callback;
}

function onExpire(callback: () => void) {
  expireCallback = callback;
}

function clearCallbacks() {
  warningCallback = null;
  expireCallback = null;
}

function initializeSessionMonitor() {
  if (timeoutTimer) {
    clearInterval(timeoutTimer);
  }

  lastActivityTime = Date.now();

  timeoutTimer = setInterval(() => {
    checkSessionTimeout();
  }, ACTIVITY_CHECK_INTERVAL_MS);

  document.addEventListener('click', updateLastActivity);
  document.addEventListener('keydown', updateLastActivity);
  document.addEventListener('scroll', updateLastActivity);
  document.addEventListener('touchstart', updateLastActivity);
}

function stopSessionMonitor() {
  if (timeoutTimer) {
    clearInterval(timeoutTimer);
    timeoutTimer = null;
  }

  document.removeEventListener('click', updateLastActivity);
  document.removeEventListener('keydown', updateLastActivity);
  document.removeEventListener('scroll', updateLastActivity);
  document.removeEventListener('touchstart', updateLastActivity);
}

export const sessionManager: SessionManager = {
  recordActivity: updateLastActivity,
  getTimeRemaining,
  getIsWarning,
  onWarning,
  onExpire,
  clearCallbacks,
  clearSession,
  initializeSessionMonitor,
  stopSessionMonitor,
};
