import { useState, useEffect, useRef } from 'react';
import { Play } from 'lucide-react';
import { supabase, Clip } from '../lib/supabase';
import { useMatch } from '../context/MatchContext';
import { getTestDataFilter } from '../lib/testDataFilter';
import { calculateInningsOversDisplay } from '../lib/match';
import { formatDismissalOptionLabel } from '../lib/dismissalOptions';

export function MatchTimeline() {
  const { matchId } = useMatch();
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);
  const [selectedOver, setSelectedOver] = useState<number | null>(null);
  const [selectedBall, setSelectedBall] = useState<number | null>(null);
  const [availableOvers, setAvailableOvers] = useState<number[]>([]);
  const [availableBalls, setAvailableBalls] = useState<number[]>([]);
  const [selectedInnings, setSelectedInnings] = useState<number>(1);
  const [ballsPerOver, setBallsPerOver] = useState(6);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!matchId) return;

    fetchClips();

    const channel = supabase
      .channel('clips_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clips',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          console.log('Realtime update:', payload);

          if (payload.eventType === 'INSERT') {
            setClips((current) => {
              const newClip = payload.new as Clip;
              const updated = [...current, newClip];
              return updated.sort((a, b) => {
                if (b.innings_number !== a.innings_number) {
                  return b.innings_number - a.innings_number;
                }
                if (b.over_number !== a.over_number) {
                  return b.over_number - a.over_number;
                }
                return (b.delivery_index ?? b.ball_number) - (a.delivery_index ?? a.ball_number);
              });
            });
          } else if (payload.eventType === 'DELETE') {
            setClips((current) =>
              current.filter((clip) => clip.id !== payload.old.id)
            );
          } else if (payload.eventType === 'UPDATE') {
            setClips((current) =>
              current.map((clip) =>
                clip.id === payload.new.id ? (payload.new as Clip) : clip
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  const fetchClips = async () => {
    if (!matchId) return;

    setLoading(true);

    const { data: matchRow } = await supabase
      .from('matches')
      .select('balls_per_over')
      .eq('match_id', matchId)
      .maybeSingle();
    if (matchRow?.balls_per_over !== null && matchRow.balls_per_over > 0) {
      setBallsPerOver(matchRow.balls_per_over);
    }

    const testDataFilter = getTestDataFilter();
    let clipsQuery = supabase
      .from('clips')
      .select('*')
      .eq('match_id', matchId);

    if (testDataFilter !== undefined) {
      clipsQuery = clipsQuery.eq('is_test_data', testDataFilter);
    }

    const { data, error } = await clipsQuery
      .order('innings_number', { ascending: false })
      .order('over_number', { ascending: false })
      .order('delivery_index', { ascending: false })
      .order('ball_number', { ascending: false });

    if (error) {
      console.error('Error fetching clips:', error);
    } else {
      setClips(data || []);

      const filteredData = data?.filter(clip => clip.innings_number === selectedInnings) || [];
      const overs = [...new Set(filteredData.map(clip => clip.over_number))].sort((a, b) => b - a);
      setAvailableOvers(overs);

      if (selectedOver) {
        const balls = filteredData
          .filter(clip => clip.over_number === selectedOver)
          .map(clip => clip.delivery_index ?? clip.ball_number)
          .sort((a, b) => b - a);
        setAvailableBalls(balls);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClips();
  }, [selectedInnings]);

  useEffect(() => {
    if (selectedOver && clips.length > 0) {
      const balls = clips
        .filter(clip => clip.innings_number === selectedInnings && clip.over_number === selectedOver)
        .map(clip => clip.delivery_index ?? clip.ball_number)
        .sort((a, b) => b - a);
      setAvailableBalls(balls);
    } else {
      setAvailableBalls([]);
    }
  }, [selectedOver, clips, selectedInnings]);

  const handleNavigate = () => {
    if (selectedOver !== null && selectedBall !== null) {
      const targetClip = clips.find(
        clip =>
          clip.innings_number === selectedInnings &&
          clip.over_number === selectedOver &&
          (clip.delivery_index ?? clip.ball_number) === selectedBall
      );

      if (targetClip) {
        const element = document.getElementById(`clip-${targetClip.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-yellow-400');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-yellow-400');
          }, 2000);
        }
      }
    }
  };

  const handlePlayClip = (clipId: string) => {
    setPlayingClipId(clipId);
    const videoElement = document.getElementById(`video-${clipId}`) as HTMLVideoElement;
    if (videoElement) {
      videoElement.play();
    }
  };

  const isWicketBall = (clip: Pick<Clip, 'outcome' | 'dismissal_type'>) =>
    clip.outcome === 'wicket' || clip.dismissal_type !== null;

  const formatOutcome = (clip: Pick<Clip, 'outcome' | 'dismissal_type'>) => {
    if (clip.outcome === 'wicket') {
      if (clip.dismissal_type) {
        const label = formatDismissalOptionLabel(clip.dismissal_type);
        return `Wicket (${label})`;
      }
      return 'Wicket';
    }
    if (clip.outcome === 'wide') return 'Wide';
    if (clip.outcome === 'noball') return 'No ball';
    return clip.outcome === 'dot' ? 'Dot' : clip.outcome;
  };

  const getOutcomeColor = (clip: Pick<Clip, 'outcome' | 'dismissal_type'>) => {
    const outcome = clip.outcome;
    switch (outcome) {
      case '6':
        return 'text-green-400 bg-green-500/20 border-green-500';
      case '4':
        return 'text-blue-400 bg-blue-500/20 border-blue-500';
      case 'wicket':
        return 'text-red-400 bg-red-500/20 border-red-500';
      case 'Dot':
      case 'dot':
        return 'text-gray-400 bg-gray-500/20 border-gray-500';
      case 'wide':
      case 'noball':
        return 'text-orange-400 bg-orange-500/20 border-orange-500';
      default:
        if (isWicketBall(clip)) return 'text-red-400 bg-red-500/20 border-red-500';
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500';
    }
  };

  const getHitSeconds = (clip: Pick<Clip, 'hit_timestamp_ms'>): number | null => {
    if (clip.hit_timestamp_ms === null || clip.hit_timestamp_ms < 0) return null;
    return clip.hit_timestamp_ms / 1000;
  };

  const handleVideoLoadedMetadata = (videoElement: HTMLVideoElement, clip: Clip) => {
    const hitSeconds = getHitSeconds(clip);
    if (hitSeconds === null || Number.isNaN(videoElement.duration) || videoElement.duration <= 0) return;
    const seekTime = Math.min(hitSeconds, Math.max(videoElement.duration - 0.05, 0));
    videoElement.currentTime = seekTime;
  };

  const jumpToHit = (clipId: string, clip: Clip) => {
    const hitSeconds = getHitSeconds(clip);
    if (hitSeconds === null) return;
    const videoElement = document.getElementById(`video-${clipId}`) as HTMLVideoElement | null;
    if (!videoElement) return;
    const duration = videoElement.duration;
    const targetTime = Number.isFinite(duration) && duration > 0
      ? Math.min(hitSeconds, Math.max(duration - 0.05, 0))
      : hitSeconds;
    videoElement.currentTime = targetTime;
    void videoElement.play();
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-black text-white pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading clips...</p>
        </div>
      </div>
    );
  }

  if (clips.length === 0) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-black text-white pb-20 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Play size={32} className="text-gray-600" />
          </div>
          <h3 data-testid="timeline-empty-heading" className="text-xl font-bold text-gray-300 mb-2">
            No clips yet
          </h3>
          <p className="text-gray-500">
            Start recording from the Record tab to see clips appear here
          </p>
        </div>
      </div>
    );
  }

  const filteredClips = clips.filter(clip => clip.innings_number === selectedInnings);

  const getTotalRuns = () => {
    return filteredClips.reduce((total, clip) => {
      const baseRuns = Number.parseInt(clip.outcome, 10);
      return total + (Number.isFinite(baseRuns) ? baseRuns : 0) + (clip.extra_runs ?? 0);
    }, 0);
  };

  const getTotalWickets = () => {
    return filteredClips.filter(isWicketBall).length;
  };

  const getTotalOvers = () => calculateInningsOversDisplay(filteredClips, ballsPerOver);

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="p-4 mb-4 bg-gray-900 border-b border-gray-800">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSelectedInnings(1)}
            className={`flex-1 py-2 rounded-lg font-bold transition-colors ${
              selectedInnings === 1
                ? 'bg-orange-500 text-black'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Innings 1
          </button>
          <button
            onClick={() => setSelectedInnings(2)}
            className={`flex-1 py-2 rounded-lg font-bold transition-colors ${
              selectedInnings === 2
                ? 'bg-orange-500 text-black'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Innings 2
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-800 rounded-lg p-3 text-center border border-green-400">
            <div className="text-gray-400 text-xs mb-1">Runs</div>
            <div className="text-green-400 text-2xl font-bold">{getTotalRuns()}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center border border-blue-400">
            <div className="text-gray-400 text-xs mb-1">Overs</div>
            <div className="text-blue-400 text-2xl font-bold">{filteredClips.length > 0 ? getTotalOvers() : '0'}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center border border-red-400">
            <div className="text-gray-400 text-xs mb-1">Wickets</div>
            <div className="text-red-400 text-2xl font-bold">{getTotalWickets()}</div>
          </div>
        </div>

        <div className="space-y-2">
          <label data-testid="timeline-navigate-label" className="text-gray-400 text-sm">
            Navigate to Ball
          </label>
          <div className="flex gap-2">
            <select
              value={selectedOver || ''}
              onChange={(e) => {
                const over = e.target.value ? parseInt(e.target.value) : null;
                setSelectedOver(over);
                setSelectedBall(null);
              }}
              className="flex-1 bg-gray-800 border border-gray-700 text-white py-2 px-3 rounded-lg focus:outline-none focus:border-green-400"
            >
              <option value="">Select Over</option>
              {availableOvers.map(over => (
                <option key={over} value={over}>Over {over}</option>
              ))}
            </select>
            <select
              value={selectedBall || ''}
              onChange={(e) => setSelectedBall(e.target.value ? parseInt(e.target.value) : null)}
              disabled={!selectedOver}
              className="flex-1 bg-gray-800 border border-gray-700 text-white py-2 px-3 rounded-lg focus:outline-none focus:border-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select Ball</option>
              {availableBalls.map(ball => (
                <option key={ball} value={ball}>Delivery {ball}</option>
              ))}
            </select>
            <button
              onClick={handleNavigate}
              disabled={!selectedOver || !selectedBall}
              className="bg-green-500 hover:bg-green-600 text-black font-bold px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Go
            </button>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="p-4 space-y-3">
        {filteredClips.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-lg border border-gray-800 bg-gray-900/50">
            <p className="text-gray-300 font-medium mb-1">No balls in Innings {selectedInnings}</p>
            <p className="text-gray-500 text-sm">
              Switch innings above, or open Record and log balls for this innings.
            </p>
          </div>
        ) : (
          filteredClips.map((clip) => (
            <div
              id={`clip-${clip.id}`}
              key={clip.id}
              className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden transition-all"
            >
              <div className="relative">
                <video
                  id={`video-${clip.id}`}
                  src={clip.video_url || undefined}
                  className="w-full max-h-60 bg-black object-contain"
                  controls
                  playsInline
                  preload="metadata"
                  onLoadedMetadata={(event) => handleVideoLoadedMetadata(event.currentTarget, clip)}
                  onPlay={() => setPlayingClipId(clip.id)}
                  onPause={() => setPlayingClipId(null)}
                />
                {playingClipId !== clip.id && (
                  <button
                    onClick={() => handlePlayClip(clip.id)}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 transition-colors"
                  >
                    <div className="w-16 h-16 bg-green-500/90 rounded-full flex items-center justify-center">
                      <Play size={28} className="text-white ml-1" />
                    </div>
                  </button>
                )}
              </div>

              {clip.hit_timestamp_ms !== null && (
                <div className="px-4 pt-3">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>Bat-hit marker</span>
                    <button
                      onClick={() => jumpToHit(clip.id, clip)}
                      className="text-cyan-300 hover:text-cyan-200 underline"
                    >
                      Jump to hit ({(clip.hit_timestamp_ms / 1000).toFixed(2)}s)
                    </button>
                  </div>
                  <div className="relative h-1.5 rounded bg-gray-700 overflow-hidden">
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-cyan-300"
                      style={{
                        left: `${Math.min(
                          100,
                          Math.max(
                            0,
                            ((clip.hit_timestamp_ms / 1000) / Math.max(clip.duration || 1, 0.1)) * 100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-500/20 border border-orange-400 rounded px-2 py-0.5">
                      <span className="text-xs text-orange-400 font-bold">Innings {clip.innings_number}</span>
                    </div>
                    <div className="bg-gray-800 border border-green-400 rounded px-3 py-1">
                      <span className="text-sm text-gray-400">Over </span>
                      <span className="text-white font-bold">{clip.over_number}</span>
                      <span className="text-gray-400"> - </span>
                      <span className="text-sm text-gray-400">Ball </span>
                      <span className="text-white font-bold">{clip.ball_number}</span>
                      <span className="text-gray-500 text-xs ml-2">
                        (Del {clip.delivery_index ?? clip.ball_number})
                      </span>
                    </div>

                    <div
                      className={`border rounded px-3 py-1 font-bold text-sm ${getOutcomeColor(clip)}`}
                    >
                      {formatOutcome(clip)}
                    </div>
                  </div>

                  <div className="text-gray-500 text-sm">
                    {clip.duration}s
                  </div>
                </div>

                <div className="mt-2 text-gray-500 text-xs">
                  {new Date(clip.created_at).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
