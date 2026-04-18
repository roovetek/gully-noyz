import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const root = process.cwd();
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const runId = `qa-harness-${timestamp}`;
const runDir = path.join(root, 'runs', runId);
const logsDir = path.join(runDir, 'logs');
const shotsDir = path.join(runDir, 'screenshots');
const publicQaDir = path.join(root, 'public', 'qa');
const publicRunsDir = path.join(publicQaDir, 'runs');
const publicLatestDir = path.join(publicQaDir, 'latest');
const publicManifestPath = path.join(publicQaDir, 'manifest.json');
const maxPublicRuns = Math.max(1, Number.parseInt(process.env.QA_MAX_PUBLIC_RUNS || '20', 10) || 20);

fs.mkdirSync(logsDir, { recursive: true });
fs.mkdirSync(shotsDir, { recursive: true });

const env = {
  ...process.env,
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321',
  VITE_SUPABASE_ANON_KEY:
    process.env.VITE_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  VITE_TEST_MODE: process.env.VITE_TEST_MODE || 'true',
  TEST_MODE: 'true',
};

function runCommand(name, command, args, extraEnv = {}, timeoutMs = 300000) {
  const started = Date.now();
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...env, ...extraEnv },
    encoding: 'utf-8',
    maxBuffer: 20 * 1024 * 1024,
    timeout: timeoutMs,
  });
  const durationMs = Date.now() - started;
  const logFile = path.join(logsDir, `${name}.log`);
  const combined = [
    `# ${name}`,
    `# cmd: ${[command, ...args].join(' ')}`,
    `# exit: ${result.status ?? 1}`,
    `# duration_ms: ${durationMs}`,
    `# signal: ${result.signal ?? 'none'}`,
    '',
    result.stdout || '',
    result.stderr || '',
  ].join('\n');
  fs.writeFileSync(logFile, combined, 'utf-8');

  return {
    name,
    command: [command, ...args].join(' '),
    exitCode: result.status ?? 1,
    durationMs,
    logFile: path.relative(root, logFile),
    signal: result.signal ?? null,
  };
}

function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function updatePublicArtifacts(report, reportJsonPath, reportHtmlPath) {
  fs.mkdirSync(publicRunsDir, { recursive: true });

  const publicRunDir = path.join(publicRunsDir, runId);
  fs.rmSync(publicRunDir, { recursive: true, force: true });
  fs.mkdirSync(publicRunDir, { recursive: true });
  fs.cpSync(path.join(runDir, 'screenshots'), path.join(publicRunDir, 'screenshots'), { recursive: true });
  fs.copyFileSync(reportJsonPath, path.join(publicRunDir, 'report.json'));
  fs.copyFileSync(reportHtmlPath, path.join(publicRunDir, 'report.html'));

  // Keep backward compatibility for consumers that only read /qa/latest.
  fs.rmSync(publicLatestDir, { recursive: true, force: true });
  fs.mkdirSync(publicLatestDir, { recursive: true });
  fs.cpSync(path.join(publicRunDir, 'screenshots'), path.join(publicLatestDir, 'screenshots'), { recursive: true });
  fs.copyFileSync(path.join(publicRunDir, 'report.json'), path.join(publicLatestDir, 'report.json'));
  fs.copyFileSync(path.join(publicRunDir, 'report.html'), path.join(publicLatestDir, 'report.html'));

  const currentManifest = safeReadJson(publicManifestPath);
  const previousRuns = Array.isArray(currentManifest?.runs) ? currentManifest.runs : [];
  const nextRun = {
    runId,
    generatedAt: report.generatedAt,
    allPassed: Boolean(report.summary?.allPassed),
    commandCount: Array.isArray(report.commands) ? report.commands.length : 0,
    passedCount: Array.isArray(report.commands)
      ? report.commands.filter((cmd) => cmd.exitCode === 0).length
      : 0,
    durationMs: Array.isArray(report.commands)
      ? report.commands.reduce((sum, cmd) => sum + (Number(cmd.durationMs) || 0), 0)
      : 0,
    reportPath: `runs/${runId}/report.json`,
    htmlPath: `runs/${runId}/report.html`,
  };

  const dedupedRuns = [nextRun, ...previousRuns.filter((run) => run?.runId !== runId)];
  dedupedRuns.sort((a, b) => new Date(b.generatedAt || 0).getTime() - new Date(a.generatedAt || 0).getTime());
  const keptRuns = dedupedRuns.slice(0, maxPublicRuns);

  const keepSet = new Set(keptRuns.map((run) => run.runId));
  const existingRunDirs = fs.existsSync(publicRunsDir) ? fs.readdirSync(publicRunsDir, { withFileTypes: true }) : [];
  for (const dir of existingRunDirs) {
    if (!dir.isDirectory()) continue;
    if (!keepSet.has(dir.name)) {
      fs.rmSync(path.join(publicRunsDir, dir.name), { recursive: true, force: true });
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    latestRunId: runId,
    maxPublicRuns,
    runs: keptRuns,
  };
  fs.writeFileSync(publicManifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
}

async function waitForServer(url, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // server not ready yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function captureScreenshots(baseUrl) {
  const steps = [];
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const shot = async (file, title, action, checks = [], suggestion = '') => {
    const rel = path.join('screenshots', file);
    await page.screenshot({ path: path.join(runDir, rel), fullPage: true });
    const failedChecks = checks.filter((c) => !c.pass);
    const severity = failedChecks.length > 0 ? 'warn' : 'ok';
    const analysis =
      failedChecks.length > 0
        ? `Potential issue: ${failedChecks.map((c) => c.label).join(', ')}`
        : 'No obvious layout or usability issues detected for this step.';
    steps.push({ title, action, file: rel.replaceAll('\\', '/') });
    steps[steps.length - 1] = {
      ...steps[steps.length - 1],
      checks,
      severity,
      analysis,
      suggestion:
        suggestion ||
        (failedChecks.length > 0
          ? 'Review spacing, visibility and tap/click safety for highlighted controls.'
          : 'No immediate UI changes needed for this screen.'),
    };
  };

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await shot(
    '01-landing.png',
    'Landing Page',
    'Opened home route',
    [
      { label: 'Create Match CTA visible', pass: await page.getByRole('button', { name: 'Create Match' }).isVisible() },
      { label: 'Join Match CTA visible', pass: await page.getByRole('button', { name: 'Join Match' }).isVisible() },
      { label: 'Browse All Matches CTA visible', pass: await page.getByRole('button', { name: 'Browse All Matches' }).isVisible() },
    ],
    'Consider adding a tiny helper hint below Join Match input for expected match ID format.'
  );

  await page.locator('button:has-text("Create Match")').first().click();
  await page.waitForSelector('[data-testid="create-match-modal"]');
  await shot(
    '02-create-modal.png',
    'Create Match Modal',
    'Clicked Create Match on landing',
    [
      { label: 'Modal shell visible', pass: await page.getByTestId('create-match-modal').isVisible() },
      { label: 'Match name input visible', pass: await page.getByPlaceholder('e.g., India vs Pakistan Finals').isVisible() },
      { label: 'Create submit visible', pass: await page.getByTestId('create-match-submit').isVisible() },
    ],
    'If this grows further, split advanced rule options into a collapsed section to reduce cognitive load.'
  );

  await page.getByPlaceholder('e.g., India vs Pakistan Finals').fill('QA-Harness-Match');
  await page.getByPlaceholder('Set a passcode for the umpire').fill('1234');
  await page.getByTestId('create-match-submit').click();
  await page.getByText('Start Delivery').waitFor();
  await shot(
    '03-record.png',
    'Record Tab',
    'Created match and landed in record view',
    [
      { label: 'Start Delivery visible', pass: await page.getByRole('button', { name: 'Start Delivery' }).isVisible() },
      {
        label: 'AI assist mode control present',
        pass: (await page.getByTestId('ai-assist-mode-select').count()) > 0,
      },
      { label: 'Bottom nav visible', pass: await page.getByRole('button', { name: 'Timeline', exact: true }).isVisible() },
    ],
    'On shorter screens, ensure trim/AI info cards do not push critical controls below thumb-reachable area.'
  );

  await page.getByRole('button', { name: 'Timeline', exact: true }).click();
  await page.waitForTimeout(400);
  await shot(
    '04-timeline.png',
    'Timeline Tab',
    'Switched to Timeline from bottom nav',
    [
      { label: 'Timeline tab active', pass: await page.getByRole('button', { name: 'Timeline', exact: true }).isVisible() },
      { label: 'Empty-state message visible', pass: await page.getByText('No clips yet').isVisible() },
    ],
    'Optional: add a one-click shortcut in empty state to jump back to Record.'
  );

  await page.getByRole('button', { name: 'Stats', exact: true }).click();
  await page.waitForTimeout(400);
  await shot(
    '05-stats.png',
    'Stats Tab',
    'Switched to Stats from bottom nav',
    [
      { label: 'Stats heading visible', pass: await page.getByText('Match Stats').isVisible() },
    ],
    'When no data is available, consider showing example stat placeholders to explain what will appear.'
  );

  await page.getByRole('button', { name: 'Config', exact: true }).click();
  await page.waitForTimeout(400);
  await shot(
    '06-config.png',
    'Config Tab',
    'Switched to Config from bottom nav',
    [
      { label: 'Config heading visible', pass: await page.getByText('Match Info').isVisible() },
      { label: 'Rules cards visible', pass: await page.getByText('Overs and Balls').isVisible() },
    ],
    'Looks readable; adding subtle section dividers between rules groups may further improve scanability.'
  );

  await page.goto(`${baseUrl}/#/admin`, { waitUntil: 'networkidle' });
  await shot(
    '07-admin.png',
    'Admin Backdoor',
    'Navigated directly to hidden admin hash route',
    [
      { label: 'Admin login card visible', pass: await page.getByText('Admin Console').isVisible() },
      { label: 'Password input visible', pass: await page.getByPlaceholder('Enter Admin Password').isVisible() },
    ],
    'Visual style differs from the dark app shell; consider aligning admin auth theme with main app branding.'
  );

  await browser.close();
  return steps;
}

function buildHtml(report) {
  const rows = report.commands
    .map(
      (c) =>
        `<tr><td>${c.name}</td><td>${c.exitCode === 0 ? 'PASS' : 'FAIL'}</td><td>${(
          c.durationMs / 1000
        ).toFixed(1)}s</td><td><code>${c.command}</code></td><td><code>${c.logFile}</code></td></tr>`
    )
    .join('\n');
  const gallery = report.screenshots
    .map(
      (s, idx) => `
      <div class="card">
        <img src="./${s.file}" alt="${s.title}" />
        <div class="meta">
          <div class="title">${idx + 1}. ${s.title} <span class="badge ${s.severity}">${s.severity.toUpperCase()}</span></div>
          <div class="action"><strong>Action:</strong> ${s.action}</div>
          <div class="action"><strong>Analysis:</strong> ${s.analysis}</div>
          <div class="action"><strong>Suggestion:</strong> ${s.suggestion}</div>
          <ul class="checks">
            ${s.checks.map((c) => `<li>${c.pass ? 'PASS' : 'WARN'} - ${c.label}</li>`).join('')}
          </ul>
        </div>
      </div>`
    )
    .join('\n');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>QA Harness Report</title>
  <style>
    body{font-family:Inter,system-ui,sans-serif;background:#05070d;color:#e5e7eb;margin:0;padding:24px}
    h1,h2{margin:0 0 12px}
    .small{color:#9ca3af;font-size:12px}
    .block{background:#0f172a;border:1px solid #1f2937;border-radius:10px;padding:16px;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th,td{border-bottom:1px solid #1f2937;padding:8px;text-align:left;vertical-align:top}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:14px}
    .card{background:#111827;border:1px solid #1f2937;border-radius:10px;overflow:hidden}
    .card img{width:100%;display:block}
    .meta{padding:10px}
    .title{font-weight:600}
    .action{font-size:12px;color:#9ca3af;margin-top:6px;line-height:1.4}
    .checks{margin:8px 0 0;padding-left:18px;font-size:12px;color:#cbd5e1}
    .badge{font-size:11px;border-radius:999px;padding:2px 8px;margin-left:6px}
    .badge.ok{background:#064e3b;color:#6ee7b7}
    .badge.warn{background:#7c2d12;color:#fdba74}
    code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
  </style>
</head>
<body>
  <h1>QA Harness Report</h1>
  <div class="small">Run ID: ${report.runId} | Generated: ${report.generatedAt}</div>
  <div class="block">
    <h2>Command Results</h2>
    <table>
      <thead><tr><th>Name</th><th>Status</th><th>Duration</th><th>Command</th><th>Log</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div class="block">
    <h2>UI Screenshot Sequence</h2>
    <div class="grid">${gallery}</div>
  </div>
</body>
</html>`;
}

async function main() {
  const commands = [];
  commands.push(runCommand('schema-local', 'npm', ['run', 'test:schema:local'], {}, 120000));
  commands.push(runCommand('vitest', 'npm', ['run', 'test:run'], {}, 180000));
  commands.push(
    runCommand(
      'playwright',
      'npx',
      ['playwright', 'test', '--project=chrome-system-lite', '--workers=1', '--timeout=45000'],
      {
        VITE_SUPABASE_URL: env.VITE_SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY,
        TEST_MODE: env.TEST_MODE,
      },
      420000
    )
  );

  const devLogFile = path.join(logsDir, 'dev-server.log');
  const devServer = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4176'], {
    cwd: root,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const logParts = [];
  devServer.stdout.on('data', (chunk) => logParts.push(chunk.toString()));
  devServer.stderr.on('data', (chunk) => logParts.push(chunk.toString()));

  const baseUrl = 'http://127.0.0.1:4176';
  const ready = await waitForServer(baseUrl);
  if (!ready) {
    devServer.kill('SIGTERM');
    fs.writeFileSync(devLogFile, logParts.join(''), 'utf-8');
    throw new Error('Dev server failed to start for QA screenshot capture');
  }

  let screenshots = [];
  try {
    screenshots = await captureScreenshots(baseUrl);
  } finally {
    devServer.kill('SIGTERM');
    fs.writeFileSync(devLogFile, logParts.join(''), 'utf-8');
  }

  const report = {
    generatedAt: new Date().toISOString(),
    runId,
    baseUrl,
    summary: {
      allPassed: commands.every((c) => c.exitCode === 0),
    },
    commands,
    screenshots,
    findings: screenshots
      .filter((s) => s.severity === 'warn')
      .map((s) => ({
        title: s.title,
        analysis: s.analysis,
        suggestion: s.suggestion,
      })),
  };

  const reportJson = path.join(runDir, 'report.json');
  const reportHtml = path.join(runDir, 'report.html');
  fs.writeFileSync(reportJson, JSON.stringify(report, null, 2), 'utf-8');
  fs.writeFileSync(reportHtml, buildHtml(report), 'utf-8');

  updatePublicArtifacts(report, reportJson, reportHtml);

  // Keep a simple pointer to the latest run folder for local discovery.
  fs.writeFileSync(path.join(root, 'runs', 'qa-latest.txt'), `${runId}\n`, 'utf-8');

  console.log(`QA harness complete: ${path.relative(root, runDir)}`);
  console.log(`Hidden page: #/qa`);
  if (!report.summary.allPassed) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

