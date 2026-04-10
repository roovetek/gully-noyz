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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/qa/latest/report.json', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error('QA report not found. Run `npm run qa:harness` first.');
        }
        const data = (await res.json()) as QAReportData;
        if (!cancelled) {
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

  const passedCount = useMemo(() => {
    if (!report) return 0;
    return report.commands.filter((c) => c.exitCode === 0).length;
  }, [report]);

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
          <p className="text-gray-400 text-xs mt-2">Hidden route: `/#/qa`</p>
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
                  src={`/qa/latest/${shot.file}`}
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

