import { useEffect, useState } from 'react';
import { getGlobalRules } from '../lib/rulesEngine';
import { Info } from 'lucide-react';
import { MatchRules } from '../lib/types';

export function GullyRulz() {
  const [rules, setRules] = useState<MatchRules | null>(null);

  useEffect(() => {
    async function fetchRules() {
      const fetchedRules = await getGlobalRules();
      setRules(fetchedRules);
    }
    fetchRules();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white pb-20 pt-16">
      <div className="p-4 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Info size={24} className="text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Gully Rulz</h1>
            <p className="text-sm text-gray-400">Global rules for this cricket version.</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {rules ? (
          <div className="space-y-4">
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
          <p className="text-gray-400">Loading rules...</p>
        )}
      </div>
    </div>
  );
}