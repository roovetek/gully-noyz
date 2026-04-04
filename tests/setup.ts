import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

beforeEach(() => {
  process.env.TEST_MODE = 'true';
});

afterEach(() => {
  cleanup();
});
