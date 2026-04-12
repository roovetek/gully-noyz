import { useEffect, useMemo, useState } from 'react';

type CommandResult = {
  name: string;
  command: string;
  exitCode: number;
  durationMs: number;
  logFile: string;
};

type ScreenshotEntry = {
  title: string;
  action: string;
  file: string;
  severity: 'ok' | 'warn';
  analysis: string;
  suggestion: string;
  checks: Array<{ label: string; pass: boolean }>;
};

type QARunManifestEntry = {
  runId: string;
  generatedAt: string;
  allPassed: boolean;
  commandCount: number;
  passedCount: number;
  durationMs: number;
  reportPath?: string;
};

type QAManifest = {
  generatedAt: string;
  latestRunId: string;
  maxPublicRuns: number;
  runs: QARunManifestEntry[];
};

type QAReportData = {
  generatedAt: string;
  runId: string;
  baseUrl: string;
  summary: {
    allPassed: boolean;
  };
  commands: CommandResult[];
  screenshots: ScreenshotEntry[];
  findings?: Array<{
    title: string;
    analysis: string;
    suggestion: string;
  }>;
};

export function QAReport() {
  const [report, setReport] = useState<QAReportData | null>(null);
  const [manifest, setManifest] = useState<QAManifest | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchReport = async (reportPath: string) => {
      const res = await fetch(reportPath, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('QA report not found. Run `npm run qa:harness` first.');
      }
      return (await res.json()) as QAReportData;
    };

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const manifestRes = await fetch('/qa/manifest.json', { cache: 'no-store' });
        if (manifestRes.ok) {
          const manifestData = (await manifestRes.json()) as QAManifest;
          if (Array.isArray(manifestData.runs) && manifestData.runs.length > 0) {
            const initialRunId = manifestData.latestRunId || manifestData.runs[0].runId;
            const selectedRun = manifestData.runs.find((run) => run.runId === initialRunId) || manifestData.runs[0];
            const reportPath = selectedRun.reportPath ? `/qa/${selectedRun.reportPath}` : `/qa/runs/${selectedRun.runId}/report.json`;
            const data = await fetchReport(reportPath);
            if (!cancelled) {
              setManifest(manifestData);
              setSelectedRunId(selectedRun.runId);
              setReport(data);
            }
            return;
          }
        }

        // Backward-compatible fallback if manifest is missing.
        const data = await fetchReport('/qa/latest/report.json');
        if (!cancelled) {
          setManifest(null);
          setSelectedRunId(data.runId);
          setReport(data);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load QA report';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadSelectedRun = async () => {
      if (!manifest || !selectedRunId) return;
      if (report?.runId === selectedRunId) return;
      const run = manifest.runs.find((item) => item.runId === selectedRunId);
      if (!run) return;

      setLoading(true);
      setError(null);
      try {
        const reportPath = run.reportPath ? `/qa/${run.reportPath}` : `/qa/runs/${run.runId}/report.json`;
        const res = await fetch(reportPath, { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`Selected run report unavailable: ${selectedRunId}`);
        }
        const data = (await res.json()) as QAReportData;
        if (!cancelled) {
          setReport(data);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load selected run';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSelectedRun();
    return () => {
      cancelled = true;
    };
  }, [manifest, report?.runId, selectedRunId]);

  const passedCount = useMemo(() => {
    if (!report) return 0;
    return report.commands.filter((c) => c.exitCode === 0).length;
  }, [report]);

  const screenshotBase = useMemo(() => {
    if (!report) return '/qa/latest/';
    if (manifest && selectedRunId) {
      return `/qa/runs/${selectedRunId}/`;
    }
    return '/qa/latest/';
  }, [manifest, report, selectedRunId]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-black text-white p-6 flex items-center justify-center">
        <p className="text-gray-400">Loading QA report...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-black text-white p-6">
        <div className="max-w-3xl mx-auto bg-red-500/10 border border-red-500/40 rounded-lg p-4">
          <h2 className="text-lg font-bold text-red-300 mb-2">QA Report Unavailable</h2>
          <p className="text-red-200 text-sm">{error ?? 'Unknown error'}</p>
          <p className="text-gray-400 text-xs mt-2">
            Hidden route: <code className="text-gray-300">/#/qa</code> (dev only unless{' '}
            <code className="text-gray-300">VITE_ENABLE_QA_REPORT=true</code>).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-black text-white p-4 md:p-6 pb-20">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h1 className="text-2xl font-bold text-cyan-300">QA Gallery</h1>
          <p className="text-sm text-gray-400 mt-1">Generated: {new Date(report.generatedAt).toLocaleString()}</p>
          <p className="text-sm text-gray-400">Run ID: {report.runId}</p>
          <p className="text-sm mt-2">
            Status:{' '}
            <span className={report.summary.allPassed ? 'text-green-400 font-semibold' : 'text-yellow-300 font-semibold'}>
              {report.summary.allPassed ? 'All automated checks passed' : 'Some checks failed'}
            </span>
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {passedCount}/{report.commands.length} command checks passed
          </p>
        </div>

        {manifest && manifest.runs.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-bold text-cyan-200 mb-3">Run History</h2>
            <p className="text-xs text-gray-400 mb-3">
              Showing {manifest.runs.length} recent runs (max {manifest.maxPublicRuns}).
            </p>
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
              {manifest.runs.map((run) => {
                const active = run.runId === selectedRunId;
                return (
                  <button
                    key={run.runId}
                    type="button"
                    onClick={() => setSelectedRunId(run.runId)}
                    className={`w-full text-left border rounded p-3 transition-colors ${
                      active
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-gray-700 bg-gray-800/70 hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-100">{run.runId}</span>
                      <span className={run.allPassed ? 'text-green-400 text-xs' : 'text-amber-300 text-xs'}>
                        {run.allPassed ? 'PASS' : 'WARN'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(run.generatedAt).toLocaleString()} | {(run.durationMs / 1000).toFixed(1)}s | {run.passedCount}/
                      {run.commandCount} commands
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-bold text-indigo-300 mb-3">Visual Analysis Summary</h2>
          {(report.findings?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-300">No critical visual issues detected in this run.</p>
          ) : (
            <div className="space-y-2">
              {report.findings?.map((f) => (
                <div key={f.title} className="bg-amber-500/10 border border-amber-500/30 rounded p-3">
                  <p className="text-sm font-semibold text-amber-200">{f.title}</p>
                  <p className="text-xs text-gray-300 mt-1">{f.analysis}</p>
                  <p className="text-xs text-gray-400 mt-1">Suggestion: {f.suggestion}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-bold text-yellow-300 mb-3">Test Results</h2>
          <div className="space-y-2">
            {report.commands.map((cmd) => (
              <div key={cmd.name} className="bg-gray-800/70 border border-gray-700 rounded p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-gray-100">{cmd.name}</span>
                  <span className={cmd.exitCode === 0 ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>
                    {cmd.exitCode === 0 ? 'PASS' : `FAIL (${cmd.exitCode})`}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1 font-mono">{cmd.command}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Duration: {(cmd.durationMs / 1000).toFixed(1)}s | Log: {cmd.logFile}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-bold text-green-300 mb-3">UI Screenshot Sequence</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {report.screenshots.map((shot, idx) => (
              <div key={shot.file} className="bg-gray-800/70 border border-gray-700 rounded-lg overflow-hidden">
                <img
                  src={`${screenshotBase}${shot.file}`}
                  alt={shot.title}
                  className="w-full h-auto bg-black"
                  loading="lazy"
                />
                <div className="p-3">
                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                    {idx + 1}. {shot.title}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        shot.severity === 'ok'
                          ? 'bg-green-900/50 text-green-300'
                          : 'bg-amber-900/50 text-amber-300'
                      }`}
                    >
                      {shot.severity === 'ok' ? 'OK' : 'ATTN'}
                    </span>
                  </p>
                  <p className="text-xs text-gray-300 mt-1">
                    <span className="text-gray-400">Action:</span> {shot.action}
                  </p>
                  <p className="text-xs text-gray-300 mt-1">
                    <span className="text-gray-400">Analysis:</span> {shot.analysis}
                  </p>
                  <p className="text-xs text-gray-300 mt-1">
                    <span className="text-gray-400">Suggestion:</span> {shot.suggestion}
                  </p>
                  <details className="mt-2">
                    <summary className="text-xs text-cyan-300 cursor-pointer select-none">Validation checks</summary>
                    <ul className="mt-2 space-y-1 text-xs text-gray-300">
                      {shot.checks.map((check) => (
                        <li key={check.label} className="flex items-start gap-2">
                          <span className={check.pass ? 'text-green-300' : 'text-amber-300'}>
                            {check.pass ? 'PASS' : 'WARN'}
                          </span>
                          <span>{check.label}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

