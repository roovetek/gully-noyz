import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

beforeEach(() => {
  process.env.TEST_MODE = 'true';
  if (!process.env.VITE_SUPABASE_URL) {
    process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321';
  }
  if (!process.env.VITE_SUPABASE_ANON_KEY) {
    process.env.VITE_SUPABASE_ANON_KEY = 'vitest-test-anon-key';
  }
});

afterEach(() => {
  cleanup();
});
