import { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, CheckCircle, X } from 'lucide-react';
import { getGlobalRules, updateGlobalRules } from '../lib/rulesEngine';
import { validateAdminAccess } from '../lib/accessControl';
import { MatchRules } from '../lib/types';

interface AdminDashboardProps {
  onClose: () => void;
  onCreateMatch?: () => void;
}

export function AdminDashboard({ onClose, onCreateMatch }: AdminDashboardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');
  const [rules, setRules] = useState<MatchRules | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (isAuthenticated) {
      loadRules();
    }
  }, [isAuthenticated]);

  const loadRules = async () => {
    const globalRules = await getGlobalRules();
    if (globalRules) {
      setRules(globalRules);
    }
  };

  const handleAuth = async () => {
    if (!passcode.trim()) {
      setAuthError('Please enter admin passcode');
      return;
    }

    setLoading(true);
    setAuthError('');

    try {
      const isValid = await validateAdminAccess(passcode);
      if (isValid) {
        setIsAuthenticated(true);
      } else {
        setAuthError('Invalid admin passcode');
      }
    } catch {
      setAuthError('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!rules) return;

    setSaveStatus('saving');

    try {
      await updateGlobalRules(rules, 'admin');
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const updateRule = <K extends keyof MatchRules>(key: K, value: MatchRules[K]) => {
    if (rules) {
      setRules({ ...rules, [key]: value });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <Settings className="text-gray-700" size={24} />
              <h2 className="text-xl font-semibold text-gray-900">Admin Access</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Passcode
              </label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setAuthError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                placeholder="Enter admin passcode"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {authError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
                <AlertCircle size={16} />
                {authError}
              </div>
            )}

            <button
              onClick={handleAuth}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300"
            >
              {loading ? 'Authenticating...' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!rules) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Settings className="text-gray-700" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">Admin Dashboard</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-yellow-800">
              <strong>Note:</strong> Changes to global rules apply to new matches only. Existing matches retain their original rules.
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Global Rules Configuration</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Overs Per Innings
                </label>
                <input
                  type="number"
                  value={rules.overs_per_innings}
                  onChange={(e) => updateRule('overs_per_innings', parseInt(e.target.value))}
                  min="1"
                  max="50"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Balls Per Over
                </label>
                <input
                  type="number"
                  value={rules.balls_per_over}
                  onChange={(e) => updateRule('balls_per_over', parseInt(e.target.value))}
                  min="4"
                  max="8"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Wickets Per Innings
                </label>
                <input
                  type="number"
                  value={rules.max_wickets}
                  onChange={(e) => updateRule('max_wickets', parseInt(e.target.value))}
                  min="1"
                  max="11"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Overs Per Bowler
                </label>
                <input
                  type="number"
                  value={rules.max_overs_per_bowler}
                  onChange={(e) => updateRule('max_overs_per_bowler', parseInt(e.target.value))}
                  min="1"
                  max="10"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="text-sm font-semibold text-gray-700">Extra Ball Rules</h4>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules.wide_no_runs}
                  onChange={(e) => updateRule('wide_no_runs', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Wide balls count as 0 runs</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules.wide_no_ball_count}
                  onChange={(e) => updateRule('wide_no_ball_count', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Wide balls don't count as valid balls</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules.legbye_no_runs}
                  onChange={(e) => updateRule('legbye_no_runs', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Leg-byes count as 0 runs</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules.consecutive_overs_required}
                  onChange={(e) => updateRule('consecutive_overs_required', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Require consecutive overs from same bowler</span>
              </label>
            </div>
          </div>

          {saveStatus === 'success' && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
              <CheckCircle size={16} />
              Global rules saved successfully!
            </div>
          )}

          {saveStatus === 'error' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
              <AlertCircle size={16} />
              Failed to save rules. Please try again.
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 flex items-center justify-center gap-2"
            >
              <Save size={20} />
              {saveStatus === 'saving' ? 'Saving...' : 'Save Global Rules'}
            </button>

            {onCreateMatch && (
              <button
                onClick={() => {
                  onCreateMatch();
                  onClose();
                }}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Create New Match
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
