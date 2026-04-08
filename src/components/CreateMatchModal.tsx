import { useState, useEffect } from 'react';
import { X, Lock, LockKeyhole, Settings } from 'lucide-react';
import { executeTrackedAction, supabase } from '../lib/supabase';
import { hashSecret } from '../lib/security';
import { generateMatchId } from '../lib/match';
import { validateMatchName, validateMatchSecret } from '../lib/validation';
import { ERROR_MESSAGES } from '../lib/constants';
import { getGlobalRules } from '../lib/rulesEngine';
import { createMatchAccess } from '../lib/accessControl';
import { MatchRules } from '../lib/types';
import { logger } from '../lib/logger';

interface CreateMatchModalProps {
  onClose: () => void;
  onMatchCreated: (matchId: string, matchSecret?: string, name?: string) => void;
}

export function CreateMatchModal({ onClose, onMatchCreated }: CreateMatchModalProps) {
  const [matchName, setMatchName] = useState('');
  const [matchSecret, setMatchSecret] = useState('');
  const [umpirePasscode, setUmpirePasscode] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [customizeRules, setCustomizeRules] = useState(false);
  const [rules, setRules] = useState<MatchRules | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadGlobalRules();
  }, []);

  const loadGlobalRules = async () => {
    const globalRules = await getGlobalRules();
    if (globalRules) {
      setRules(globalRules);
    }
  };

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

    if (!umpirePasscode.trim() || umpirePasscode.length < 4) {
      setError('Umpire passcode must be at least 4 characters');
      return;
    }

    if (!rules) {
      setError('Rules not loaded. Please refresh and try again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const newMatchId = generateMatchId();

      const matchData: any = {
        match_id: newMatchId,
        name: matchName.trim(),
        is_public: !isPrivate,
        total_overs: rules.overs_per_innings * 2,
        balls_per_over: rules.balls_per_over,
        current_innings: 1,
        overs_per_innings: rules.overs_per_innings,
        max_wickets: rules.max_wickets,
        max_overs_per_bowler: rules.max_overs_per_bowler,
        wide_no_runs: rules.wide_no_runs,
        wide_no_ball_count: rules.wide_no_ball_count,
        legbye_no_runs: rules.legbye_no_runs,
        consecutive_overs_required: rules.consecutive_overs_required,
      };

      if (isPrivate && matchSecret.trim()) {
        matchData.secret_hash = await hashSecret(matchSecret.trim());
      }

      const { error: insertError } = await executeTrackedAction({
        tableName: 'matches',
        action: 'insert',
        payload: matchData,
        matchId: newMatchId,
        execute: async (_traceId) => {
          return await supabase.from('matches').insert(matchData);
        },
      });

      if (insertError) {
        logger.error('Failed to create match', { matchData, error: insertError });
        throw insertError;
      }

      await createMatchAccess(newMatchId, umpirePasscode.trim());

      onMatchCreated(newMatchId, isPrivate ? matchSecret : undefined, matchName.trim());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.FAILED_TO_CREATE;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateRule = <K extends keyof MatchRules>(key: K, value: MatchRules[K]) => {
    if (rules) {
      setRules({ ...rules, [key]: value });
    }
  };

  if (!rules) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="animate-spin h-8 w-8 border-4 border-yellow-400 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-lg w-full max-w-2xl my-8">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-xl font-bold text-yellow-400">Create New Match</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
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

          <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-200">Match Rules</h3>
              <button
                onClick={() => setCustomizeRules(!customizeRules)}
                className="flex items-center gap-2 text-sm text-yellow-400 hover:text-yellow-300"
              >
                <Settings size={16} />
                {customizeRules ? 'Use Defaults' : 'Customize'}
              </button>
            </div>

            {!customizeRules ? (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-400">Overs per innings:</div>
                <div className="text-white">{rules.overs_per_innings}</div>
                <div className="text-gray-400">Balls per over:</div>
                <div className="text-white">{rules.balls_per_over}</div>
                <div className="text-gray-400">Max wickets:</div>
                <div className="text-white">{rules.max_wickets}</div>
                <div className="text-gray-400">Max overs per bowler:</div>
                <div className="text-white">{rules.max_overs_per_bowler}</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Overs per innings</label>
                  <input
                    type="number"
                    value={rules.overs_per_innings}
                    onChange={(e) => updateRule('overs_per_innings', parseInt(e.target.value))}
                    min="1"
                    max="50"
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Balls per over</label>
                  <input
                    type="number"
                    value={rules.balls_per_over}
                    onChange={(e) => updateRule('balls_per_over', parseInt(e.target.value))}
                    min="2"
                    max="8"
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Max wickets</label>
                  <input
                    type="number"
                    value={rules.max_wickets}
                    onChange={(e) => updateRule('max_wickets', parseInt(e.target.value))}
                    min="1"
                    max="11"
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Max overs per bowler</label>
                  <input
                    type="number"
                    value={rules.max_overs_per_bowler}
                    onChange={(e) => updateRule('max_overs_per_bowler', parseInt(e.target.value))}
                    min="1"
                    max="10"
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Umpire Passcode <span className="text-gray-500 text-xs">(min 4 characters)</span>
            </label>
            <input
              type="password"
              value={umpirePasscode}
              onChange={(e) => setUmpirePasscode(e.target.value)}
              placeholder="Set a passcode for the umpire"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
            />
            <p className="text-xs text-gray-500 mt-1">
              Match authority (not the Admin Console). Used to verify umpire actions during the match.
            </p>
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
