// #region agent log
fetch('http://127.0.0.1:7701/ingest/321b9d3b-108d-47b3-aacd-93cd4565022b', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'caa140' },
  body: JSON.stringify({
    sessionId: 'caa140',
    runId: 'pre-fix',
    hypothesisId: 'H0',
    location: 'debug-bootstrap.ts:1',
    message: 'bootstrap module evaluated before App/supabase tree',
    data: { href: typeof window !== 'undefined' ? window.location.href : 'ssr' },
    timestamp: Date.now(),
  }),
}).catch(() => {});
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    fetch('http://127.0.0.1:7701/ingest/321b9d3b-108d-47b3-aacd-93cd4565022b', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'caa140' },
      body: JSON.stringify({
        sessionId: 'caa140',
        runId: 'pre-fix',
        hypothesisId: 'H3',
        location: 'debug-bootstrap.ts:error',
        message: 'window error event',
        data: {
          msg: event.message,
          filename: event.filename,
          lineno: event.lineno,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  });
}
// #endregion
