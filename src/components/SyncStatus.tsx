import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { getDeploymentInfo, validateDeploymentSync } from '../lib/deploymentVersion';

export function SyncStatus() {
  const [isOpen, setIsOpen] = useState(false);
  const [deploymentInfo] = useState(() => getDeploymentInfo());
  const [syncStatus] = useState(() => validateDeploymentSync());

  useEffect(() => {
    const timer = setInterval(() => {
      const validation = validateDeploymentSync();
      if (validation.issues.length > 0) {
        console.warn('Deployment sync issues detected:', validation.issues);
      }
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const isSynced = syncStatus.isSynced;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-900 rounded-lg transition-colors"
        title="Deployment status"
      >
        {isSynced ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <AlertCircle className="w-5 h-5 text-yellow-500" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-950 border border-gray-800 rounded-lg shadow-lg z-50 p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Deployment Status
          </h3>

          <div className="space-y-3 text-xs">
            <div className="bg-gray-900 rounded p-2">
              <p className="text-gray-400">Version</p>
              <p className="text-white font-mono">{deploymentInfo.version}</p>
            </div>

            <div className="bg-gray-900 rounded p-2">
              <p className="text-gray-400">Build Date</p>
              <p className="text-white text-xs">
                {new Date(deploymentInfo.buildDate).toLocaleString()}
              </p>
            </div>

            <div className="bg-gray-900 rounded p-2">
              <p className="text-gray-400">Environment</p>
              <p className="text-white capitalize">{deploymentInfo.environment}</p>
            </div>

            <div className="bg-gray-900 rounded p-2">
              <p className="text-gray-400">Sync Status</p>
              <p className={isSynced ? 'text-green-400' : 'text-yellow-400'}>
                {isSynced ? '✓ Synchronized' : '⚠ Check configuration'}
              </p>
            </div>

            {syncStatus.issues.length > 0 && (
              <div className="bg-red-950 border border-red-700 rounded p-2">
                <p className="text-red-300 font-semibold mb-1">Issues:</p>
                <ul className="text-red-200 space-y-1">
                  {syncStatus.issues.map((issue, i) => (
                    <li key={i} className="flex gap-2">
                      <span>•</span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {syncStatus.warnings.length > 0 && (
              <div className="bg-yellow-950 border border-yellow-700 rounded p-2">
                <p className="text-yellow-300 font-semibold mb-1">Warnings:</p>
                <ul className="text-yellow-200 space-y-1">
                  {syncStatus.warnings.map((warning, i) => (
                    <li key={i} className="flex gap-2">
                      <span>•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="mt-3 w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
