import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { logDeploymentInfo } from './lib/deploymentVersion';
import { setupConsoleDiagnostics } from './lib/syncDiagnostics';

logDeploymentInfo();
setupConsoleDiagnostics();

if (import.meta.env.MODE === 'development') {
  console.log('%cSync Diagnostics Ready!', 'color: #4a9eff; font-weight: bold');
  console.log('Type: syncDiagnostics.help() for available commands');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
