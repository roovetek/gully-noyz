import { useState } from 'react';
import { Lock, X } from 'lucide-react';

interface SecretPromptProps {
  matchId: string;
  matchName: string;
  onVerify: (secret: string) => Promise<{ success: boolean; error?: string } | void>;
  onCancel: () => void;
}

export function SecretPrompt({ matchId, matchName, onVerify, onCancel }: SecretPromptProps) {
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) {
      setError('Please enter the match secret');
      return;
    }

    setLoading(true);
    setError('');
    const result = await onVerify(secret.trim());
    setLoading(false);

    if (result && !result.success) {
      setError(result.error || 'Incorrect secret');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Lock size={20} className="text-yellow-400" />
            <h2 className="text-xl font-bold text-white">Private Match</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <p className="text-gray-300 mb-4">
              <span className="text-yellow-400 font-bold">{matchName}</span> ({matchId}) is a private match.
            </p>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Enter Match Secret
            </label>
            <input
              type="password"
              value={secret}
              onChange={(e) => {
                setSecret(e.target.value);
                setError('');
              }}
              placeholder="Enter the secret code"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
              autoFocus
            />
          </div>

          {error && (
            <div
              data-testid="secret-prompt-error"
              className="bg-red-500/10 border border-red-500/50 rounded-lg p-3"
              role="alert"
            >
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg font-medium transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black py-3 rounded-lg font-bold transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Access Match'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
