import { useState, useEffect } from 'react';
import { ArrowLeft, Users, Video, CreditCard as Edit2, Lock, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useMatch } from '../context/MatchContext';
import { SecretPrompt } from './SecretPrompt';

interface MatchInfo {
  match_id: string;
  name: string;
  is_public: boolean;
  total_overs: number;
  balls_per_over: number;
  clip_count: number;
  latest_activity: string;
}

interface MatchListProps {
  onBack: () => void;
}

export function MatchList({ onBack }: MatchListProps) {
  const { setMatchId } = useMatch();
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newTotalOvers, setNewTotalOvers] = useState(20);
  const [newBallsPerOver, setNewBallsPerOver] = useState(6);
  const [showSecretPrompt, setShowSecretPrompt] = useState(false);
  const [pendingMatch, setPendingMatch] = useState<{ id: string; name: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<'join' | 'rename' | null>(null);

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

    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select('match_id, name, is_public, total_overs, balls_per_over')
      .order('created_at', { ascending: false });

    if (matchesError) {
      console.error('Error fetching matches:', matchesError);
      setLoading(false);
      return;
    }

    const { data: clipsData, error: clipsError } = await supabase
      .from('clips')
      .select('match_id, created_at');

    if (clipsError) {
      console.error('Error fetching clips:', clipsError);
    }

    const clipsByMatch = new Map<string, { count: number; latestActivity: string }>();
    clipsData?.forEach((clip) => {
      const existing = clipsByMatch.get(clip.match_id);
      if (!existing) {
        clipsByMatch.set(clip.match_id, {
          count: 1,
          latestActivity: clip.created_at,
        });
      } else {
        existing.count += 1;
        if (new Date(clip.created_at) > new Date(existing.latestActivity)) {
          existing.latestActivity = clip.created_at;
        }
      }
    });

    const matchList = matchesData.map((match) => {
      const clipInfo = clipsByMatch.get(match.match_id) || {
        count: 0,
        latestActivity: new Date().toISOString(),
      };
      return {
        match_id: match.match_id,
        name: match.name,
        is_public: match.is_public,
        total_overs: match.total_overs,
        balls_per_over: match.balls_per_over,
        clip_count: clipInfo.count,
        latest_activity: clipInfo.latestActivity,
      };
    });

    matchList.sort((a, b) =>
      new Date(b.latest_activity).getTime() - new Date(a.latest_activity).getTime()
    );

    setMatches(matchList);
    setLoading(false);
  };

  const handleJoinMatch = (match: MatchInfo) => {
    if (!match.is_public) {
      const storedSecret = sessionStorage.getItem(`match_secret_${match.match_id}`);
      if (!storedSecret) {
        setPendingMatch({ id: match.match_id, name: match.name });
        setPendingAction('join');
        setShowSecretPrompt(true);
        return;
      }
    }
    setMatchId(match.match_id);
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
    setNewTotalOvers(match.total_overs);
    setNewBallsPerOver(match.balls_per_over);
  };

  const handleSaveEdit = async (matchId: string) => {
    if (!newName.trim()) return;

    try {
      const { error } = await supabase
        .from('matches')
        .update({
          name: newName.trim(),
          total_overs: newTotalOvers,
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
        } else if (pendingAction === 'rename') {
          const matchToEdit = matches.find(m => m.match_id === pendingMatch.id);
          if (matchToEdit) {
            setEditingMatch(pendingMatch.id);
            setNewName(matchToEdit.name);
            setNewTotalOvers(matchToEdit.total_overs);
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
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="bg-gray-800 hover:bg-gray-700 p-2 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} className="text-white" />
        </button>
        <h1 className="text-3xl font-bold text-yellow-400">All Matches</h1>
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
          {matches.map((match) => (
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
                          placeholder="Overs"
                          className="bg-gray-800 border border-yellow-400 rounded px-3 py-1 text-white w-20"
                        />
                        <input
                          type="number"
                          min="5"
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
                    <div className="flex items-center gap-2 flex-1">
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
                  )}
                </div>
                <div className="text-gray-500 text-sm">
                  {getTimeAgo(match.latest_activity)}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-yellow-400/20 border border-yellow-400 rounded px-3 py-1">
                    <span className="text-yellow-400 font-mono font-bold">
                      {match.match_id}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-green-400">
                    <Video size={16} />
                    <span>{match.clip_count} clips</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-400">
                    <span>{match.total_overs} overs</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <span>{match.balls_per_over} balls</span>
                  </div>
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
