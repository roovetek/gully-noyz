import { getDeploymentInfo, validateDeploymentSync } from './deploymentVersion';

interface DiagnosticReport {
  timestamp: string;
  deployment: ReturnType<typeof getDeploymentInfo>;
  sync: ReturnType<typeof validateDeploymentSync>;
  environment: {
    userAgent: string;
    url: string;
    referrer: string;
    cachePolicy: string;
  };
  supabase: {
    configured: boolean;
    urlValid: boolean;
    keyValid: boolean;
  };
  network: {
    online: boolean;
    type?: string;
  };
}

export function generateDiagnosticReport(): DiagnosticReport {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const report: DiagnosticReport = {
    timestamp: new Date().toISOString(),
    deployment: getDeploymentInfo(),
    sync: validateDeploymentSync(),
    environment: {
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer || 'none',
      cachePolicy: document.head
        .querySelector('meta[http-equiv="Cache-Control"]')
        ?.getAttribute('content') || 'not-set',
    },
    supabase: {
      configured: !!supabaseUrl && !!supabaseKey,
      urlValid: supabaseUrl.includes('supabase.co'),
      keyValid: supabaseKey.length > 20,
    },
    network: {
      online: navigator.onLine,
    },
  };

  if ('connection' in navigator) {
    const connection = (navigator as unknown as { connection?: { effectiveType?: string } })
      .connection;
    if (connection?.effectiveType) {
      report.network.type = connection.effectiveType;
    }
  }

  return report;
}

export function printDiagnosticReport(): void {
  const report = generateDiagnosticReport();

  console.log('%c=== Sync Diagnostic Report ===', 'color: #4a9eff; font-weight: bold; font-size: 14px');
  console.log(`Timestamp: ${report.timestamp}`);

  console.log('%c\n--- Deployment Info ---', 'color: #4a9eff; font-weight: bold');
  console.log(`Version: ${report.deployment.version}`);
  console.log(`Build Date: ${report.deployment.buildDate}`);
  console.log(`Environment: ${report.deployment.environment}`);
  console.log(`Supabase: ${report.deployment.supabaseUrl}`);

  console.log('%c\n--- Sync Status ---', 'color: #4a9eff; font-weight: bold');
  if (report.sync.isSynced) {
    console.log('%c✓ Deployment is synced', 'color: #44ff44; font-weight: bold');
  } else {
    console.log('%c✗ Sync issues detected', 'color: #ff4444; font-weight: bold');
    report.sync.issues.forEach((issue) => console.error(`  - ${issue}`));
  }

  if (report.sync.warnings.length > 0) {
    console.log('%c\nWarnings:', 'color: #ffaa00; font-weight: bold');
    report.sync.warnings.forEach((warning) => console.warn(`  - ${warning}`));
  }

  console.log('%c\n--- Supabase Configuration ---', 'color: #4a9eff; font-weight: bold');
  console.log(`Configured: ${report.supabase.configured ? '✓' : '✗'}`);
  console.log(`URL Valid: ${report.supabase.urlValid ? '✓' : '✗'}`);
  console.log(`Key Valid: ${report.supabase.keyValid ? '✓' : '✗'}`);

  console.log('%c\n--- Network Status ---', 'color: #4a9eff; font-weight: bold');
  console.log(`Online: ${report.network.online ? '✓' : '✗'}`);
  if (report.network.type) {
    console.log(`Connection Type: ${report.network.type}`);
  }

  console.log('%c\n--- Environment ---', 'color: #4a9eff; font-weight: bold');
  console.log(`URL: ${report.environment.url}`);
  console.log(`Cache Policy: ${report.environment.cachePolicy}`);

  console.log('%c\n--- Full Report Object ---', 'color: #4a9eff; font-weight: bold');
  console.log(report);
}

export function exportDiagnosticReport(): string {
  const report = generateDiagnosticReport();
  return JSON.stringify(report, null, 2);
}

export function setupConsoleDiagnostics(): void {
  (window as unknown as Record<string, unknown>).syncDiagnostics = {
    report: () => generateDiagnosticReport(),
    print: () => printDiagnosticReport(),
    export: () => exportDiagnosticReport(),
    help: () => {
      console.log('%cSync Diagnostics Commands:', 'color: #4a9eff; font-weight: bold; font-size: 12px');
      console.log('  syncDiagnostics.print()   - Print formatted diagnostic report');
      console.log('  syncDiagnostics.report()  - Get diagnostic object');
      console.log('  syncDiagnostics.export()  - Get JSON export of report');
    },
  };
}
