import './debug-bootstrap';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const rootEl = document.getElementById('root');
// #region agent log
fetch('http://127.0.0.1:7701/ingest/321b9d3b-108d-47b3-aacd-93cd4565022b', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'caa140' },
  body: JSON.stringify({
    sessionId: 'caa140',
    runId: 'pre-fix',
    hypothesisId: 'H4',
    location: 'main.tsx:root',
    message: 'main body after imports',
    data: { hasRootEl: Boolean(rootEl) },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

try {
  if (!rootEl) {
    throw new Error('Missing #root element');
  }
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} catch (e) {
  // #region agent log
  fetch('http://127.0.0.1:7701/ingest/321b9d3b-108d-47b3-aacd-93cd4565022b', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'caa140' },
    body: JSON.stringify({
      sessionId: 'caa140',
      runId: 'pre-fix',
      hypothesisId: 'H3',
      location: 'main.tsx:catch',
      message: 'createRoot/render threw',
      data: {
        err: e instanceof Error ? e.message : String(e),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  throw e;
}
