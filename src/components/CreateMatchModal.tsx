import { useState } from 'react';
import { X, Lock, LockKeyhole } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { hashSecret } from '../lib/security';
import { generateMatchId } from '../lib/match';
import { validateMatchName, validateMatchSecret, validateOversConfig } from '../lib/validation';
import { CRICKET_CONSTANTS, ERROR_MESSAGES } from '../lib/constants';

interface CreateMatchModalProps {
  onClose: () => void;
  onMatchCreated: (matchId: string, matchSecret?: string, name?: string) => void;
}

export function CreateMatchModal({ onClose, onMatchCreated }: CreateMatchModalProps) {
  const [matchName, setMatchName] = useState('');
  const [matchSecret, setMatchSecret] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [totalOvers, setTotalOvers] = useState(CRICKET_CONSTANTS.DEFAULT_TOTAL_OVERS);
  const [ballsPerOver, setBallsPerOver] = useState(CRICKET_CONSTANTS.DEFAULT_BALLS_PER_OVER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    const nameValidation = validateMatchName(matchName);
    if (!nameValidation.isValid) {
      setError(nameValidation.error || ERROR_MESSAGES.MATCH_NAME_REQUIRED);
      return;
    }

    const secretValidation = validateMatchSecret(matchSecret, isPrivate);
    if (!secretValidation.isValid) {
      setError(secretValidation.error || ERROR_MESSAGES.SECRET_REQUIRED);
      return;
    }

    const oversValidation = validateOversConfig(totalOvers, ballsPerOver);
    if (!oversValidation.isValid) {
      setError(oversValidation.error || 'Invalid match configuration');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const newMatchId = generateMatchId();

      const matchData: {
        match_id: string;
        name: string;
        is_public: boolean;
        total_overs: number;
        balls_per_over: number;
        secret_hash?: string;
      } = {
        match_id: newMatchId,
        name: matchName.trim(),
        is_public: !isPrivate,
        total_overs: totalOvers,
        balls_per_over: ballsPerOver,
      };

      if (isPrivate && matchSecret.trim()) {
        matchData.secret_hash = await hashSecret(matchSecret.trim());
      }

      const { error: insertError } = await supabase
        .from('matches')
        .insert(matchData);

      if (insertError) {
        throw insertError;
      }

      onMatchCreated(newMatchId, isPrivate ? matchSecret : undefined, matchName.trim());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.FAILED_TO_CREATE;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-xl font-bold text-yellow-400">Create New Match</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Match Name *
            </label>
            <input
              type="text"
              value={matchName}
              onChange={(e) => setMatchName(e.target.value)}
              placeholder="e.g., India vs Pakistan Finals"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Total Overs *
              </label>
              <input
                type="number"
                min={CRICKET_CONSTANTS.MIN_OVERS}
                max={CRICKET_CONSTANTS.MAX_OVERS}
                value={totalOvers}
                onChange={(e) => setTotalOvers(parseInt(e.target.value) || CRICKET_CONSTANTS.DEFAULT_TOTAL_OVERS)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Balls Per Over *
              </label>
              <input
                type="number"
                min={CRICKET_CONSTANTS.MIN_BALLS_PER_OVER}
                max={CRICKET_CONSTANTS.MAX_BALLS_PER_OVER}
                value={ballsPerOver}
                onChange={(e) => setBallsPerOver(parseInt(e.target.value) || CRICKET_CONSTANTS.DEFAULT_BALLS_PER_OVER)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
            <button
              onClick={() => setIsPrivate(!isPrivate)}
              className="flex items-center gap-2"
            >
              {isPrivate ? (
                <Lock size={20} className="text-yellow-400" />
              ) : (
                <LockKeyhole size={20} className="text-green-400" />
              )}
            </button>
            <div className="flex-1">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-300">
                  Make this match private (requires secret)
                </span>
              </label>
            </div>
          </div>

          {isPrivate && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Match Secret *
              </label>
              <input
                type="password"
                value={matchSecret}
                onChange={(e) => setMatchSecret(e.target.value)}
                placeholder="Enter a secret code"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
              />
              <p className="text-xs text-gray-500 mt-1">
                Share this secret with people you want to give access
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg font-medium transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black py-3 rounded-lg font-bold transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Match'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
