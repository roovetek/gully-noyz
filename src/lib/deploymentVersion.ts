export interface DeploymentInfo {
  version: string;
  buildDate: string;
  environment: string;
  supabaseUrl: string;
  features: {
    adminDashboard: boolean;
    videoCapture: boolean;
    matchTimeline: boolean;
    rulesEngine: boolean;
  };
}

export function getDeploymentInfo(): DeploymentInfo {
  return {
    version: import.meta.env.VITE_APP_VERSION || '0.0.0-dev',
    buildDate: import.meta.env.VITE_BUILD_DATE || new Date().toISOString(),
    environment: import.meta.env.MODE || 'development',
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'unknown',
    features: {
      adminDashboard: true,
      videoCapture: true,
      matchTimeline: true,
      rulesEngine: true,
    },
  };
}

export function validateDeploymentSync(): {
  isSynced: boolean;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    issues.push('VITE_SUPABASE_URL is not configured');
  }

  if (!supabaseKey) {
    issues.push('VITE_SUPABASE_ANON_KEY is not configured');
  }

  if (import.meta.env.MODE === 'production' && !import.meta.env.VITE_APP_VERSION) {
    warnings.push('Production deployment lacks version number for tracking');
  }

  return {
    isSynced: issues.length === 0,
    issues,
    warnings,
  };
}

export function logDeploymentInfo(): void {
  const info = getDeploymentInfo();
  const validation = validateDeploymentSync();

  console.log('%c=== Deployment Info ===', 'color: #4a9eff; font-weight: bold; font-size: 12px');
  console.log(`Version: ${info.version}`);
  console.log(`Build Date: ${info.buildDate}`);
  console.log(`Environment: ${info.environment}`);
  console.log(`Supabase: ${info.supabaseUrl.split('.')[0]}`);
  console.log(`Features: ${Object.values(info.features).filter(Boolean).length}/${Object.keys(info.features).length}`);

  if (validation.issues.length > 0) {
    console.error('%c⚠ Sync Issues:', 'color: #ff4444; font-weight: bold');
    validation.issues.forEach((issue) => console.error(`  - ${issue}`));
  }

  if (validation.warnings.length > 0) {
    console.warn('%c⚠ Warnings:', 'color: #ffaa00; font-weight: bold');
    validation.warnings.forEach((warning) => console.warn(`  - ${warning}`));
  }

  if (validation.isSynced) {
    console.log('%c✓ Deployment is properly synced', 'color: #44ff44; font-weight: bold');
  }
}
