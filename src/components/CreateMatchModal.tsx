import { useState } from 'react';
import { X, Lock, LockKeyhole } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CreateMatchModalProps {
  onClose: () => void;
  onMatchCreated: (matchId: string, matchSecret?: string) => void;
}

export function CreateMatchModal({ onClose, onMatchCreated }: CreateMatchModalProps) {
  const [matchName, setMatchName] = useState('');
  const [matchSecret, setMatchSecret] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [totalOvers, setTotalOvers] = useState(20);
  const [ballsPerOver, setBallsPerOver] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateMatchId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreate = async () => {
    if (!matchName.trim()) {
      setError('Please enter a match name');
      return;
    }

    if (isPrivate && !matchSecret.trim()) {
      setError('Please enter a secret for private match');
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
        const { data: hashData, error: hashError } = await supabase.rpc(
          'crypt',
          { password: matchSecret.trim(), salt: await supabase.rpc('gen_salt', { type: 'bf' }) }
        );

        if (hashError) {
          const secretHash = btoa(matchSecret.trim());
          matchData.secret_hash = secretHash;
        } else {
          matchData.secret_hash = hashData;
        }
      }

      const { error: insertError } = await supabase
        .from('matches')
        .insert(matchData);

      if (insertError) throw insertError;

      onMatchCreated(newMatchId, isPrivate ? matchSecret : undefined);
    } catch (err) {
      console.error('Error creating match:', err);
      setError('Failed to create match. Please try again.');
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
                min="1"
                max="50"
                value={totalOvers}
                onChange={(e) => setTotalOvers(parseInt(e.target.value) || 1)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Balls Per Over *
              </label>
              <input
                type="number"
                min="5"
                max="8"
                value={ballsPerOver}
                onChange={(e) => setBallsPerOver(parseInt(e.target.value) || 6)}
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
