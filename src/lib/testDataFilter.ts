export function shouldShowTestData(): boolean {
  return import.meta.env.MODE === 'test' || import.meta.env.VITE_TEST_MODE === 'true';
}

export function getTestDataFilter() {
  return shouldShowTestData() ? undefined : false;
}
