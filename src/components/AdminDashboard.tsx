import { useState, useEffect, useCallback } from 'react';
import { Settings, Save, AlertCircle, CheckCircle, X, Trash2, List, Activity, Lock } from 'lucide-react';
import { getGlobalRules, updateGlobalRules } from '../lib/rulesEngine';
import { validateAdminAccess } from '../lib/accessControl';
import { changeGlobalAdminPasscode } from '../lib/globalAdmin';
import { MatchRules } from '../lib/types';
import { supabase } from '../lib/supabase';
import { getTestDataFilter } from '../lib/testDataFilter';
import { deleteMatch } from '../lib/deleteMatch';
import { getDeploymentInfo, validateDeploymentSync, DeploymentInfo } from '../lib/deploymentVersion';

interface AdminDashboardProps {
  onClose: () => void;
}

interface AdminMatchRow {
  match_id: string;
  name: string | null;
  created_at: string;
}

export function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  /** In-memory only: used for RPCs that require dashboard passcode (save rules, delete match). */
  const [adminSessionSecret, setAdminSessionSecret] = useState('');
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');
  const [rules, setRules] = useState<MatchRules | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [adminSection, setAdminSection] = useState<'rules' | 'matches' | 'deployment' | 'password'>('rules');
  const [adminMatches, setAdminMatches] = useState<AdminMatchRow[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesListError, setMatchesListError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminMatchRow | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState<string | null>(null);
  const [deploymentInfo, setDeploymentInfo] = useState<DeploymentInfo | null>(null);
  const [dashPwCurrent, setDashPwCurrent] = useState('');
  const [dashPwNew, setDashPwNew] = useState('');
  const [dashPwConfirm, setDashPwConfirm] = useState('');
  const [dashPwSaving, setDashPwSaving] = useState(false);
  const [dashPwFeedback, setDashPwFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

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

  const closeDashboard = useCallback(() => {
    setAdminSessionSecret('');
    onClose();
  }, [onClose]);

  const handleAuth = async () => {
    if (!passcode.trim()) {
      setAuthError('Please enter your dashboard admin passcode');
      return;
    }

    setLoading(true);
    setAuthError('');

    try {
      const isValid = await validateAdminAccess(passcode);
      if (isValid) {
        setAdminSessionSecret(passcode.trim());
        setIsAuthenticated(true);
      } else {
        setAuthError('Invalid dashboard passcode');
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
      await updateGlobalRules(rules, 'global_admin', adminSessionSecret);
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

  const loadAdminMatches = useCallback(async () => {
    setMatchesLoading(true);
    setMatchesListError(null);
    const testDataFilter = getTestDataFilter();
    let q = supabase
      .from('matches')
      .select('match_id, name, created_at')
      .order('created_at', { ascending: false });
    if (testDataFilter !== undefined) {
      q = q.eq('is_test_data', testDataFilter);
    }
    const { data, error } = await q;
    setMatchesLoading(false);
    if (error) {
      setMatchesListError(error.message);
      setAdminMatches([]);
      return;
    }
    setAdminMatches((data as AdminMatchRow[]) || []);
  }, []);

  useEffect(() => {
    if (isAuthenticated && adminSection === 'matches') {
      loadAdminMatches();
    }
    if (isAuthenticated && adminSection === 'deployment') {
      setDeploymentInfo(getDeploymentInfo());
    }
  }, [isAuthenticated, adminSection, loadAdminMatches]);

  const openDeleteModal = (row: AdminMatchRow) => {
    setDeleteTarget(row);
    setDeleteConfirmText('');
    setDeleteModalError(null);
  };

  const closeDeleteModal = () => {
    if (deleteBusy) return;
    setDeleteTarget(null);
    setDeleteConfirmText('');
    setDeleteModalError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleteConfirmText.trim() !== deleteTarget.match_id) return;
    setDeleteBusy(true);
    setDeleteModalError(null);
    const result = await deleteMatch(deleteTarget.match_id, adminSessionSecret);
    setDeleteBusy(false);
    if (!result.ok) {
      setDeleteModalError(result.message);
      return;
    }
    setDeleteSuccessMessage(`Match ${deleteTarget.match_id} was deleted.`);
    setTimeout(() => setDeleteSuccessMessage(null), 4000);
    closeDeleteModal();
    loadAdminMatches();
  };

  const handleDashboardPasswordChange = async () => {
    setDashPwFeedback(null);
    if (dashPwNew !== dashPwConfirm) {
      setDashPwFeedback({ type: 'err', text: 'New password and confirmation do not match.' });
      return;
    }
    setDashPwSaving(true);
    const result = await changeGlobalAdminPasscode(dashPwCurrent, dashPwNew);
    setDashPwSaving(false);
    if (!result.ok) {
      setDashPwFeedback({ type: 'err', text: result.message });
      return;
    }
    setDashPwFeedback({ type: 'ok', text: 'Dashboard password updated.' });
    setAdminSessionSecret(dashPwNew.trim());
    setDashPwCurrent('');
    setDashPwNew('');
    setDashPwConfirm('');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white p-4 pb-24">
        <div className="mx-auto w-full max-w-md bg-white rounded-lg shadow-xl mt-4">
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <Settings className="text-gray-700" size={24} />
              <h2 className="text-xl font-semibold text-gray-900">Dashboard admin</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close dashboard">
              <X size={24} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dashboard passcode
              </label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setAuthError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                placeholder="Enter dashboard passcode"
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

  if (!rules && isAuthenticated && adminSection === 'rules') {
    return (
      <div className="min-h-screen bg-black text-white p-4 pb-24">
        <div className="mx-auto bg-white rounded-lg p-6 flex flex-col items-center gap-4 max-w-md mt-4">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      <div className="mx-auto bg-white rounded-lg shadow-xl max-w-4xl w-full my-4">
        <div className="flex items-center justify-between p-6 border-b bg-white rounded-t-lg gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Settings className="text-gray-700" size={24} />
            <h2 className="text-xl font-semibold text-gray-900 truncate">Dashboard</h2>
          </div>
          <button onClick={closeDashboard} className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-1 ml-1">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
            <button
              type="button"
              onClick={() => setAdminSection('rules')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                adminSection === 'rules'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Settings size={16} />
                Global rules
              </span>
            </button>
            <button
              type="button"
              onClick={() => setAdminSection('matches')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                adminSection === 'matches'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <List size={16} />
                Delete matches
              </span>
            </button>
            <button
              type="button"
              onClick={() => setAdminSection('deployment')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                adminSection === 'deployment'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Activity size={16} />
                Deployment
              </span>
            </button>
            <button
              type="button"
              onClick={() => setAdminSection('password')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                adminSection === 'password'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Lock size={16} />
                Admin password
              </span>
            </button>
          </div>

          {deleteSuccessMessage && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-center gap-2">
              <CheckCircle size={16} />
              {deleteSuccessMessage}
            </div>
          )}

          {adminSection === 'deployment' && deploymentInfo && (() => {
            const validation = validateDeploymentSync();
            return (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Deployment Status</h3>

                {validation.isSynced ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                    <CheckCircle size={16} />
                    Deployment is properly configured
                  </div>
                ) : (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Configuration issues:</strong>
                      <ul className="mt-1 space-y-1 list-disc list-inside">
                        {validation.issues.map((issue, i) => <li key={i}>{issue}</li>)}
                      </ul>
                    </div>
                  </div>
                )}

                {validation.warnings.length > 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700 flex items-start gap-2">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Warnings:</strong>
                      <ul className="mt-1 space-y-1 list-disc list-inside">
                        {validation.warnings.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="border border-gray-200 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700">Build Info</h4>
                  <p className="text-xs text-gray-500">
                    Full build id (package version + commit or timestamp). Use this to confirm the latest deploy.
                  </p>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between gap-2"><span>Build id</span><span className="font-mono font-medium text-gray-900 text-right break-all">{deploymentInfo.version}</span></div>
                    <div className="flex justify-between"><span>Environment</span><span className="font-mono font-medium text-gray-900">{deploymentInfo.environment}</span></div>
                    <div className="flex justify-between"><span>Build date</span><span className="font-mono font-medium text-gray-900 text-xs">{new Date(deploymentInfo.buildDate).toLocaleString()}</span></div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700">Feature Flags</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(deploymentInfo.features).map(([key, enabled]) => (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        {enabled ? <CheckCircle size={14} className="text-green-500" /> : <X size={14} className="text-red-500" />}
                        <span className="text-gray-700">{key}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {adminSection === 'matches' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-red-900">
                  <strong>Destructive:</strong> Deleting a match removes its clips (database + storage), audit log rows for that match, and the match record. Related access roles, rule overrides, and match results are removed automatically.
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-gray-900">Matches</h3>
                <button
                  type="button"
                  onClick={() => loadAdminMatches()}
                  disabled={matchesLoading}
                  className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Refresh
                </button>
              </div>

              {matchesListError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{matchesListError}</div>
              )}

              {matchesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
                </div>
              ) : adminMatches.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">No matches found.</p>
              ) : (
                <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                  {adminMatches.map((m) => (
                    <li
                      key={m.match_id}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50"
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-sm font-semibold text-gray-900">{m.match_id}</div>
                        <div className="text-sm text-gray-600 truncate">{m.name || 'Unnamed'}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(m.created_at).toLocaleString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openDeleteModal(m)}
                        className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {adminSection === 'rules' && (
            <>
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
                  min="2"
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
            </>
          )}

          {saveStatus === 'success' && adminSection === 'rules' && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
              <CheckCircle size={16} />
              Global rules saved successfully!
            </div>
          )}

          {saveStatus === 'error' && adminSection === 'rules' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
              <AlertCircle size={16} />
              Failed to save rules. Please try again.
            </div>
          )}

          {adminSection === 'rules' && (
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 flex items-center justify-center gap-2"
              >
                <Save size={20} />
                {saveStatus === 'saving' ? 'Saving...' : 'Save Global Rules'}
              </button>
            </div>
          )}

          {adminSection === 'password' && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-gray-900 font-semibold">
                <Lock size={18} className="text-gray-600" />
                Change dashboard password
              </div>
              <p className="text-xs text-gray-500">
                This only affects dashboard admin access (this screen).
              </p>
              <div className="space-y-3 max-w-md">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Current</label>
                  <input
                    type="password"
                    value={dashPwCurrent}
                    onChange={(e) => {
                      setDashPwCurrent(e.target.value);
                      setDashPwFeedback(null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">New (min 4)</label>
                  <input
                    type="password"
                    value={dashPwNew}
                    onChange={(e) => {
                      setDashPwNew(e.target.value);
                      setDashPwFeedback(null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Confirm new</label>
                  <input
                    type="password"
                    value={dashPwConfirm}
                    onChange={(e) => {
                      setDashPwConfirm(e.target.value);
                      setDashPwFeedback(null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              {dashPwFeedback && (
                <div
                  className={`text-sm p-2 rounded ${
                    dashPwFeedback.type === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {dashPwFeedback.text}
                </div>
              )}
              <button
                type="button"
                onClick={handleDashboardPasswordChange}
                disabled={
                  dashPwSaving ||
                  !dashPwCurrent.trim() ||
                  !dashPwNew.trim() ||
                  !dashPwConfirm.trim()
                }
                className="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-900 disabled:opacity-50"
              >
                {dashPwSaving ? 'Updating…' : 'Update dashboard password'}
              </button>
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Delete match</h3>
            <p className="text-sm text-gray-600">
              This cannot be undone. Type the match ID{' '}
              <span className="font-mono font-bold text-gray-900">{deleteTarget.match_id}</span> to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => {
                setDeleteConfirmText(e.target.value);
                setDeleteModalError(null);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono"
              placeholder={deleteTarget.match_id}
              autoFocus
              disabled={deleteBusy}
            />
            {deleteModalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{deleteModalError}</div>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleteBusy}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={
                  deleteBusy || deleteConfirmText.trim() !== deleteTarget.match_id
                }
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteBusy ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
