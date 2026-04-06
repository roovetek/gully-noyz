import { useState, useEffect } from 'react';
import { ArrowLeft, Users, Video, CreditCard as Edit2, Lock, Check, X, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useMatch } from '../context/MatchContext';
import { SecretPrompt } from './SecretPrompt';
import { getTestDataFilter } from '../lib/testDataFilter';

interface MatchInfo {
  match_id: string;
  name: string;
  is_public: boolean;
  total_overs: number;
  balls_per_over: number;
  clip_count: number;
  latest_activity: string;
  created_at: string;
  innings1_runs: number;
  innings1_wickets: number;
  innings1_overs: string;
  innings2_runs: number;
  innings2_wickets: number;
  innings2_overs: string;
  current_innings: number;
  current_over: number;
  current_ball: number;
  is_completed: boolean;
}

interface MatchListProps {
  onBack: () => void;
}

export function MatchList({ onBack }: MatchListProps) {
  const { setMatchId, setMatchName } = useMatch();
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newTotalOvers, setNewTotalOvers] = useState(20);
  const [newBallsPerOver, setNewBallsPerOver] = useState(6);
  const [showSecretPrompt, setShowSecretPrompt] = useState(false);
  const [pendingMatch, setPendingMatch] = useState<{ id: string; name: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<'join' | 'rename' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMatches();

    const channel = supabase
      .channel('match_list_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clips',
        },
        () => {
          fetchMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMatches = async () => {
    setLoading(true);

    const testDataFilter = getTestDataFilter();
    let matchesQuery = supabase
      .from('matches')
      .select('match_id, name, is_public, total_overs, balls_per_over, created_at')
      .order('created_at', { ascending: false });

    if (testDataFilter !== undefined) {
      matchesQuery = matchesQuery.eq('is_test_data', testDataFilter);
    }

    const { data: matchesData, error: matchesError } = await matchesQuery;

    if (matchesError) {
      console.error('Error fetching matches:', matchesError);
      setLoading(false);
      return;
    }

    let clipsQuery = supabase
      .from('clips')
      .select('*');

    if (testDataFilter !== undefined) {
      clipsQuery = clipsQuery.eq('is_test_data', testDataFilter);
    }

    const { data: clipsData, error: clipsError } = await clipsQuery;

    if (clipsError) {
      console.error('Error fetching clips:', clipsError);
    }

    const clipsByMatch = new Map<string, { count: number; latestActivity: string; clips: any[] }>();
    clipsData?.forEach((clip) => {
      const existing = clipsByMatch.get(clip.match_id);
      if (!existing) {
        clipsByMatch.set(clip.match_id, {
          count: 1,
          latestActivity: clip.created_at,
          clips: [clip],
        });
      } else {
        existing.count += 1;
        existing.clips.push(clip);
        if (new Date(clip.created_at) > new Date(existing.latestActivity)) {
          existing.latestActivity = clip.created_at;
        }
      }
    });

    const matchList = matchesData.map((match) => {
      const clipInfo = clipsByMatch.get(match.match_id) || {
        count: 0,
        latestActivity: match.created_at,
        clips: [],
      };

      const innings1Clips = clipInfo.clips.filter(c => c.innings_number === 1);
      const innings2Clips = clipInfo.clips.filter(c => c.innings_number === 2);

      const calculateInningsStats = (clips: any[], ballsPerOver: number) => {
        if (clips.length === 0) return { runs: 0, wickets: 0, overs: '0' };

        const totalRuns = clips.reduce((sum, clip) => {
          const runs = parseInt(clip.outcome);
          return sum + (isNaN(runs) ? 0 : runs);
        }, 0);

        const totalWickets = clips.filter(c =>
          c.outcome === 'wicket' ||
          ['bowled', 'caught', 'lbw', 'runout', 'stumped', 'hitwicket', 'hitballtwice', 'obstructing', 'timedout', 'handledball'].includes(c.outcome)
        ).length;

        const uniqueOvers = new Set(clips.map(c => c.over_number));
        const maxOver = Math.max(...Array.from(uniqueOvers));
        const ballsInLastOver = clips.filter(c => c.over_number === maxOver).length;
        const completedOvers = ballsInLastOver === ballsPerOver ? maxOver : maxOver - 1;
        const remainingBalls = ballsInLastOver === ballsPerOver ? 0 : ballsInLastOver;
        const totalOvers = remainingBalls === 0 ? completedOvers.toString() : `${completedOvers}.${remainingBalls}`;

        return { runs: totalRuns, wickets: totalWickets, overs: totalOvers };
      };

      const innings1Stats = calculateInningsStats(innings1Clips, match.balls_per_over);
      const innings2Stats = calculateInningsStats(innings2Clips, match.balls_per_over);

      const allClips = clipInfo.clips.sort((a, b) => {
        if (a.innings_number !== b.innings_number) return b.innings_number - a.innings_number;
        if (a.over_number !== b.over_number) return b.over_number - a.over_number;
        return b.ball_number - a.ball_number;
      });

      const latestClip = allClips[0];
      const currentInnings = latestClip?.innings_number || 0;
      const currentOver = latestClip?.over_number || 0;
      const currentBall = latestClip?.ball_number || 0;

      const isCompleted = innings2Clips.length > 0 &&
        (innings2Stats.wickets >= 10 || parseFloat(innings2Stats.overs) >= match.total_overs);

      return {
        match_id: match.match_id,
        name: match.name,
        is_public: match.is_public,
        total_overs: match.total_overs,
        balls_per_over: match.balls_per_over,
        clip_count: clipInfo.count,
        latest_activity: clipInfo.latestActivity,
        created_at: match.created_at,
        innings1_runs: innings1Stats.runs,
        innings1_wickets: innings1Stats.wickets,
        innings1_overs: innings1Stats.overs,
        innings2_runs: innings2Stats.runs,
        innings2_wickets: innings2Stats.wickets,
        innings2_overs: innings2Stats.overs,
        current_innings: currentInnings,
        current_over: currentOver,
        current_ball: currentBall,
        is_completed: isCompleted,
      };
    });

    matchList.sort((a, b) =>
      new Date(b.latest_activity).getTime() - new Date(a.latest_activity).getTime()
    );

    setMatches(matchList);
    setLoading(false);
  };

  const handleJoinMatch = async (match: MatchInfo) => {
    if (!match.is_public) {
      const storedSecret = sessionStorage.getItem(`match_secret_${match.match_id}`);
      if (!storedSecret) {
        setPendingMatch({ id: match.match_id, name: match.name });
        setPendingAction('join');
        setShowSecretPrompt(true);
        return;
      }

      const { data: matchData } = await supabase
        .from('matches')
        .select('secret_hash')
        .eq('match_id', match.match_id)
        .maybeSingle();

      if (!matchData || matchData.secret_hash !== btoa(storedSecret)) {
        setPendingMatch({ id: match.match_id, name: match.name });
        setPendingAction('join');
        setShowSecretPrompt(true);
        return;
      }
    }
    setMatchId(match.match_id);
    setMatchName(match.name);
  };

  const handleRenameClick = (match: MatchInfo, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!match.is_public) {
      const storedSecret = sessionStorage.getItem(`match_secret_${match.match_id}`);
      if (!storedSecret) {
        setPendingMatch({ id: match.match_id, name: match.name });
        setPendingAction('rename');
        setShowSecretPrompt(true);
        return;
      }
    }
    setEditingMatch(match.match_id);
    setNewName(match.name);
    setNewTotalOvers(Math.round(match.total_overs / 2));
    setNewBallsPerOver(match.balls_per_over);
  };

  const handleSaveEdit = async (matchId: string) => {
    if (!newName.trim()) return;

    try {
      const { error } = await supabase
        .from('matches')
        .update({
          name: newName.trim(),
          total_overs: newTotalOvers * 2,
          overs_per_innings: newTotalOvers,
          balls_per_over: newBallsPerOver
        })
        .eq('match_id', matchId);

      if (error) throw error;

      setEditingMatch(null);
      setNewName('');
      fetchMatches();
    } catch (err) {
      console.error('Error updating match:', err);
    }
  };

  const handleSecretVerify = async (secret: string) => {
    if (!pendingMatch) return;

    try {
      const { data: match } = await supabase
        .from('matches')
        .select('secret_hash')
        .eq('match_id', pendingMatch.id)
        .maybeSingle();

      if (!match) {
        return { success: false, error: 'Match not found' };
      }

      const secretHash = btoa(secret);
      if (match.secret_hash === secretHash) {
        sessionStorage.setItem(`match_secret_${pendingMatch.id}`, secret);
        setShowSecretPrompt(false);

        if (pendingAction === 'join') {
          setMatchId(pendingMatch.id);
          setMatchName(pendingMatch.name);
        } else if (pendingAction === 'rename') {
          const matchToEdit = matches.find(m => m.match_id === pendingMatch.id);
          if (matchToEdit) {
            setEditingMatch(pendingMatch.id);
            setNewName(matchToEdit.name);
            setNewTotalOvers(Math.round(matchToEdit.total_overs / 2));
            setNewBallsPerOver(matchToEdit.balls_per_over);
          }
        }

        setPendingMatch(null);
        setPendingAction(null);
        return { success: true };
      } else {
        return { success: false, error: 'Incorrect secret' };
      }
    } catch (err) {
      console.error('Error verifying secret:', err);
      return { success: false, error: 'Failed to verify secret' };
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <>
      {showSecretPrompt && pendingMatch && (
        <SecretPrompt
          matchId={pendingMatch.id}
          matchName={pendingMatch.name}
          onVerify={handleSecretVerify}
          onCancel={() => {
            setShowSecretPrompt(false);
            setPendingMatch(null);
            setPendingAction(null);
          }}
        />
      )}
    <div className="min-h-screen bg-black text-white p-4">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="bg-gray-800 hover:bg-gray-700 p-2 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} className="text-white" />
        </button>
        <h1 className="text-3xl font-bold text-yellow-400">All Matches</h1>
      </div>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search by name or match ID…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 text-white placeholder-gray-500 py-3 pl-10 pr-4 rounded-lg focus:outline-none focus:border-green-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-green-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-20">
          <Video size={48} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">No matches yet</p>
          <p className="text-gray-500 text-sm">
            Be the first to create a match
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches
            .filter((m) => {
              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase();
              return (
                m.match_id.toLowerCase().includes(q) ||
                (m.name || '').toLowerCase().includes(q)
              );
            })
            .map((match) => (
            <div
              key={match.match_id}
              className="w-full bg-gray-900 border border-gray-800 hover:border-green-400 rounded-lg p-4 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 flex-1">
                  {!match.is_public && (
                    <Lock size={16} className="text-yellow-400" />
                  )}
                  {editingMatch === match.match_id ? (
                    <div className="flex flex-col gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Match Name"
                        className="bg-gray-800 border border-yellow-400 rounded px-3 py-1 text-white"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={newTotalOvers}
                          onChange={(e) => setNewTotalOvers(parseInt(e.target.value) || 1)}
                          placeholder="Overs/innings"
                          className="bg-gray-800 border border-yellow-400 rounded px-3 py-1 text-white w-24"
                          title="Overs per innings"
                        />
                        <input
                          type="number"
                          min="2"
                          max="8"
                          value={newBallsPerOver}
                          onChange={(e) => setNewBallsPerOver(parseInt(e.target.value) || 6)}
                          placeholder="Balls"
                          className="bg-gray-800 border border-yellow-400 rounded px-3 py-1 text-white w-20"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveEdit(match.match_id);
                          }}
                          className="p-1 bg-green-500 hover:bg-green-600 rounded"
                        >
                          <Check size={16} className="text-black" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingMatch(null);
                            setNewName('');
                          }}
                          className="p-1 bg-gray-700 hover:bg-gray-600 rounded"
                        >
                          <X size={16} className="text-white" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-bold text-lg">
                          {match.name || 'Unnamed Match'}
                        </h3>
                        <button
                          onClick={(e) => handleRenameClick(match, e)}
                          className="p-1 hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit2 size={14} className="text-gray-400" />
                        </button>
                      </div>
                      <div className="text-gray-500 text-xs">
                        Created: {new Date(match.created_at).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <div className="bg-yellow-400/20 border border-yellow-400 rounded px-3 py-1">
                  <span className="text-yellow-400 font-mono font-bold text-xs">
                    {match.match_id}
                  </span>
                </div>
                <div className="bg-blue-400/20 border border-blue-400 rounded px-2 py-1 text-xs">
                  <span className="text-blue-400">{Math.round(match.total_overs / 2)} overs/innings</span>
                </div>
                <div className="bg-gray-500/20 border border-gray-500 rounded px-2 py-1 text-xs">
                  <span className="text-gray-400">{match.balls_per_over} balls/over</span>
                </div>
              </div>

              {match.is_completed ? (
                <div className="bg-green-500/20 border border-green-400 rounded-lg p-3 mb-3">
                  <div className="text-green-400 font-bold text-sm mb-2">Match Completed</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-orange-400 mb-1">Innings 1</div>
                      <div className="text-white font-bold">{match.innings1_runs}/{match.innings1_wickets}</div>
                      <div className="text-gray-400">{match.innings1_overs} overs</div>
                    </div>
                    <div>
                      <div className="text-orange-400 mb-1">Innings 2</div>
                      <div className="text-white font-bold">{match.innings2_runs}/{match.innings2_wickets}</div>
                      <div className="text-gray-400">{match.innings2_overs} overs</div>
                    </div>
                  </div>
                </div>
              ) : match.current_innings > 0 ? (
                <div className="bg-orange-500/20 border border-orange-400 rounded-lg p-3 mb-3">
                  <div className="text-orange-400 font-bold text-sm mb-2">
                    In Progress - Innings {match.current_innings}
                  </div>
                  <div className="text-xs">
                    {match.current_innings === 1 ? (
                      <div>
                        <div className="text-white font-bold text-lg">{match.innings1_runs}/{match.innings1_wickets}</div>
                        <div className="text-gray-400">{match.innings1_overs} overs</div>
                        <div className="text-gray-500 mt-1">Current: Over {match.current_over}, Ball {match.current_ball}</div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-gray-400 mb-1">Innings 1</div>
                            <div className="text-white font-bold">{match.innings1_runs}/{match.innings1_wickets}</div>
                            <div className="text-gray-400 text-xs">{match.innings1_overs} overs</div>
                          </div>
                          <div>
                            <div className="text-orange-400 mb-1">Innings 2</div>
                            <div className="text-white font-bold">{match.innings2_runs}/{match.innings2_wickets}</div>
                            <div className="text-gray-400 text-xs">{match.innings2_overs} overs</div>
                          </div>
                        </div>
                        <div className="text-gray-500">Current: Over {match.current_over}, Ball {match.current_ball}</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-3">
                  <div className="text-gray-400 text-sm">No clips recorded yet</div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Video size={14} />
                    <span>{match.clip_count} clips</span>
                  </div>
                  <div>{getTimeAgo(match.latest_activity)}</div>
                </div>
                <button
                  onClick={() => handleJoinMatch(match)}
                  className="bg-green-500 hover:bg-green-600 text-black font-bold py-2 px-4 rounded transition-colors"
                >
                  Join
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
