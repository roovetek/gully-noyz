import { Info } from 'lucide-react';
import { useMatch } from '../context/MatchContext';
import { useEffect, useState } from 'react';
import { getEffectiveRules } from '../lib/rulesEngine';
import { MatchRules } from '../lib/types';
import { supabase } from '../lib/supabase';
import { resetMatchCredentials } from '../lib/globalAdmin';
import { SecureStorage } from '../lib/security';
import { STORAGE_KEYS } from '../lib/constants';

export function MatchInfo() {
  const { matchId, matchName } = useMatch();
  const [rules, setRules] = useState<MatchRules | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [newUmpirePasscode, setNewUmpirePasscode] = useState('');
  const [newScorerPasscode, setNewScorerPasscode] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    async function fetchMatchRules() {
      if (matchId) {
        const effectiveRules = await getEffectiveRules(matchId);
        setRules(effectiveRules);
        const { data } = await supabase
          .from('matches')
          .select('created_at')
          .eq('match_id', matchId)
          .maybeSingle();
        setCreatedAt(data?.created_at ?? null);
      }
    }
    fetchMatchRules();
  }, [matchId]);

  const handleResetCredentials = async () => {
    if (!matchId) return;
    setResetFeedback(null);

    if (newSecret.trim().length < 6) {
      setResetFeedback({ type: 'err', text: 'New match secret must be at least 6 characters.' });
      return;
    }
    if (newUmpirePasscode.trim().length < 4) {
      setResetFeedback({ type: 'err', text: 'New umpire passcode must be at least 4 characters.' });
      return;
    }
    if (newScorerPasscode.trim().length < 4) {
      setResetFeedback({ type: 'err', text: 'New scorer passcode must be at least 4 characters.' });
      return;
    }
    if (confirmText.trim().toUpperCase() !== matchId) {
      setResetFeedback({ type: 'err', text: `Type ${matchId} to confirm reset.` });
      return;
    }

    setResetBusy(true);
    const result = await resetMatchCredentials({
      matchId,
      adminPasscode,
      newMatchSecret: newSecret,
      newUmpirePasscode,
      newScorerPasscode,
    });
    setResetBusy(false);

    if (!result.ok) {
      setResetFeedback({ type: 'err', text: result.message });
      return;
    }

    SecureStorage.setItem(`${STORAGE_KEYS.MATCH_SECRET_PREFIX}${matchId}`, newSecret.trim());
    setResetFeedback({ type: 'ok', text: 'Match secret and passcodes updated successfully.' });
    setAdminPasscode('');
    setNewSecret('');
    setNewUmpirePasscode('');
    setNewScorerPasscode('');
    setConfirmText('');
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="p-4 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Info size={24} className="text-green-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Match Info</h1>
            <p className="text-sm text-gray-400">Details and rules for the current match.</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
          <div className="text-sm text-gray-400 uppercase tracking-[0.2em] mb-2">Current Match</div>
          <div className="text-2xl font-bold text-white">{matchName || 'Unnamed Match'}</div>
          <div className="mt-2 text-sm text-gray-400">
            Match ID: <span className="font-mono text-yellow-400">{matchId}</span>
          </div>
          {createdAt && (
            <div className="mt-1 text-sm text-gray-400">
              Match Date: <span className="text-white">{new Date(createdAt).toLocaleString()}</span>
            </div>
          )}
        </div>

        {rules ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-red-700 bg-gray-900 p-5 space-y-4">
              <h2 className="text-xl font-bold text-white">Admin Recovery</h2>
              <p className="text-sm text-gray-300">
                Replaces the <strong className="text-white">private match secret</strong>,{' '}
                <strong className="text-white">umpire passcode</strong>, and{' '}
                <strong className="text-white">scorer passcode</strong> in one step. Everyone must use the new values
                after this. Requires your <strong className="text-white">Admin Console</strong> passcode.
              </p>
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Admin Console passcode</label>
                  <input
                    type="password"
                    value={adminPasscode}
                    onChange={(e) => setAdminPasscode(e.target.value)}
                    className="w-full bg-black border border-gray-700 text-white px-3 py-2 rounded-lg"
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">New match secret (min 6 characters)</label>
                  <input
                    type="password"
                    value={newSecret}
                    onChange={(e) => setNewSecret(e.target.value)}
                    className="w-full bg-black border border-gray-700 text-white px-3 py-2 rounded-lg"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">New umpire passcode (min 4)</label>
                  <input
                    type="password"
                    value={newUmpirePasscode}
                    onChange={(e) => setNewUmpirePasscode(e.target.value)}
                    className="w-full bg-black border border-gray-700 text-white px-3 py-2 rounded-lg"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">New scorer passcode (min 4)</label>
                  <input
                    type="password"
                    value={newScorerPasscode}
                    onChange={(e) => setNewScorerPasscode(e.target.value)}
                    className="w-full bg-black border border-gray-700 text-white px-3 py-2 rounded-lg"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Confirm — type match ID: <span className="font-mono text-yellow-400">{matchId}</span>
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                    className="w-full bg-black border border-gray-700 text-white px-3 py-2 rounded-lg font-mono"
                    placeholder={matchId || ''}
                  />
                </div>
              </div>
              {resetFeedback && (
                <div
                  className={`text-sm px-3 py-2 rounded-lg ${
                    resetFeedback.type === 'ok'
                      ? 'bg-green-900/40 border border-green-700 text-green-200'
                      : 'bg-red-900/40 border border-red-700 text-red-200'
                  }`}
                >
                  {resetFeedback.text}
                </div>
              )}
              <button
                type="button"
                onClick={handleResetCredentials}
                disabled={
                  resetBusy ||
                  !matchId ||
                  !adminPasscode.trim() ||
                  !newSecret.trim() ||
                  !newUmpirePasscode.trim() ||
                  !newScorerPasscode.trim()
                }
                className="w-full md:w-auto px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-300 text-white font-semibold"
              >
                {resetBusy ? 'Updating credentials...' : 'Reset match secret and passcodes'}
              </button>
            </div>

            <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
              <h2 className="text-xl font-bold text-white">Overs and Balls</h2>
              <p className="text-sm text-gray-400">Overs per innings: {rules.overs_per_innings}</p>
              <p className="text-sm text-gray-400">Balls per over: {rules.balls_per_over}</p>
            </div>

            <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
              <h2 className="text-xl font-bold text-white">Wickets and Bowlers</h2>
              <p className="text-sm text-gray-400">Max wickets: {rules.max_wickets}</p>
              <p className="text-sm text-gray-400">Max overs per bowler: {rules.max_overs_per_bowler}</p>
            </div>

            <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
              <h2 className="text-xl font-bold text-white">Extras</h2>
              <p className="text-sm text-gray-400">Wides contribute runs: {rules.wide_no_runs ? 'Yes' : 'No'}</p>
              <p className="text-sm text-gray-400">Wides count as balls: {rules.wide_no_ball_count ? 'Yes' : 'No'}</p>
              <p className="text-sm text-gray-400">Leg-byes contribute runs: {rules.legbye_no_runs ? 'Yes' : 'No'}</p>
            </div>

            <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
              <h2 className="text-xl font-bold text-white">Other Rules</h2>
              <p className="text-sm text-gray-400">Consecutive overs required: {rules.consecutive_overs_required ? 'Yes' : 'No'}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-400">Loading match rules...</p>
        )}
      </div>
    </div>
  );
}
