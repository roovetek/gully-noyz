import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { configDefaults } from 'vitest/config';

function readPackageVersion(): string {
  try {
    const packageJsonPath = resolve(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version?: string };
    return packageJson.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function getCommitSha(): string {
  const envSha =
    process.env.BOLT_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NETLIFY_COMMIT_REF ||
    process.env.CI_COMMIT_SHA;

  if (envSha) {
    return envSha.slice(0, 7);
  }

  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
}

function getTimestampSuffix(buildDate: string): string {
  return buildDate.replace(/[-:TZ.]/g, '').slice(0, 14);
}

const baseVersion = readPackageVersion();
const buildDate = new Date().toISOString();
const commitSha = getCommitSha();
const versionSuffix = commitSha || getTimestampSuffix(buildDate);
const appVersion = `${baseVersion}+${versionSuffix}`;

const e2eSupabaseUrl = 'http://127.0.0.1:54321';
const e2eSupabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    'import.meta.env.VITE_BUILD_DATE': JSON.stringify(buildDate),
    ...(mode === 'e2e'
      ? {
          'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
            process.env.VITE_SUPABASE_URL?.trim() || e2eSupabaseUrl
          ),
          'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
            process.env.VITE_SUPABASE_ANON_KEY?.trim() || e2eSupabaseAnonKey
          ),
        }
      : {}),
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    minify: true,
    sourcemap: true,
    assetsDir: 'assets',
  },
  server: {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './tests/setup.ts',
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.js',
        '*.config.ts',
        'dist/',
      ],
    },
  },
}));
