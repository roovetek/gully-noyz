import { useState, useEffect, useRef } from 'react';
import { Play } from 'lucide-react';
import { supabase, Clip } from '../lib/supabase';
import { useMatch } from '../context/MatchContext';

export function MatchTimeline() {
  const { matchId } = useMatch();
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);
  const [selectedOver, setSelectedOver] = useState<number | null>(null);
  const [selectedBall, setSelectedBall] = useState<number | null>(null);
  const [availableOvers, setAvailableOvers] = useState<number[]>([]);
  const [availableBalls, setAvailableBalls] = useState<number[]>([]);
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
                if (b.over_number !== a.over_number) {
                  return b.over_number - a.over_number;
                }
                return b.ball_number - a.ball_number;
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
    const { data, error } = await supabase
      .from('clips')
      .select('*')
      .eq('match_id', matchId)
      .order('over_number', { ascending: false })
      .order('ball_number', { ascending: false });

    if (error) {
      console.error('Error fetching clips:', error);
    } else {
      setClips(data || []);

      const overs = [...new Set(data?.map(clip => clip.over_number) || [])].sort((a, b) => b - a);
      setAvailableOvers(overs);

      if (selectedOver) {
        const balls = data
          ?.filter(clip => clip.over_number === selectedOver)
          .map(clip => clip.ball_number)
          .sort((a, b) => b - a) || [];
        setAvailableBalls(balls);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedOver && clips.length > 0) {
      const balls = clips
        .filter(clip => clip.over_number === selectedOver)
        .map(clip => clip.ball_number)
        .sort((a, b) => b - a);
      setAvailableBalls(balls);
    } else {
      setAvailableBalls([]);
    }
  }, [selectedOver, clips]);

  const handleNavigate = () => {
    if (selectedOver !== null && selectedBall !== null) {
      const targetClip = clips.find(
        clip => clip.over_number === selectedOver && clip.ball_number === selectedBall
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

  const handlePlayClip = (clipId: string, videoUrl: string) => {
    setPlayingClipId(clipId);
    const videoElement = document.getElementById(`video-${clipId}`) as HTMLVideoElement;
    if (videoElement) {
      videoElement.play();
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case '6':
        return 'text-green-400 bg-green-500/20 border-green-500';
      case '4':
        return 'text-blue-400 bg-blue-500/20 border-blue-500';
      case 'Wicket':
        return 'text-red-400 bg-red-500/20 border-red-500';
      case 'Dot':
        return 'text-gray-400 bg-gray-500/20 border-gray-500';
      default:
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading clips...</p>
        </div>
      </div>
    );
  }

  if (clips.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white pb-20 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Play size={32} className="text-gray-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-300 mb-2">No clips yet</h3>
          <p className="text-gray-500">
            Start recording from the Record tab to see clips appear here
          </p>
        </div>
      </div>
    );
  }

  const getTotalRuns = () => {
    return clips.reduce((total, clip) => {
      const runs = parseInt(clip.outcome);
      return total + (isNaN(runs) ? 0 : runs);
    }, 0);
  };

  const getTotalWickets = () => {
    return clips.filter(clip => clip.outcome === 'wicket').length;
  };

  const getTotalBalls = () => {
    return clips.length;
  };

  const getTotalOvers = () => {
    const uniqueOvers = new Set(clips.map(clip => clip.over_number));
    const completedOvers = uniqueOvers.size;
    const ballsInCurrentOver = clips.filter(clip =>
      clip.over_number === Math.max(...Array.from(uniqueOvers))
    ).length;

    if (ballsInCurrentOver === 0) {
      return completedOvers.toString();
    }

    return `${completedOvers - 1}.${ballsInCurrentOver}`;
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="p-4 mb-4 bg-gray-900 border-b border-gray-800">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-800 rounded-lg p-3 text-center border border-green-400">
            <div className="text-gray-400 text-xs mb-1">Runs</div>
            <div className="text-green-400 text-2xl font-bold">{getTotalRuns()}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center border border-blue-400">
            <div className="text-gray-400 text-xs mb-1">Overs</div>
            <div className="text-blue-400 text-2xl font-bold">{clips.length > 0 ? getTotalOvers() : '0'}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center border border-red-400">
            <div className="text-gray-400 text-xs mb-1">Wickets</div>
            <div className="text-red-400 text-2xl font-bold">{getTotalWickets()}</div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-gray-400 text-sm">Navigate to Ball</label>
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
                <option key={ball} value={ball}>Ball {ball}</option>
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
        {clips.map((clip) => (
          <div
            id={`clip-${clip.id}`}
            key={clip.id}
            className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden transition-all"
          >
            <div className="relative">
              <video
                id={`video-${clip.id}`}
                src={clip.video_url}
                className="w-full max-h-60 bg-black object-contain"
                controls
                playsInline
                preload="metadata"
                onPlay={() => setPlayingClipId(clip.id)}
                onPause={() => setPlayingClipId(null)}
              />
              {playingClipId !== clip.id && (
                <button
                  onClick={() => handlePlayClip(clip.id, clip.video_url)}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 transition-colors"
                >
                  <div className="w-16 h-16 bg-green-500/90 rounded-full flex items-center justify-center">
                    <Play size={28} className="text-white ml-1" />
                  </div>
                </button>
              )}
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-800 border border-green-400 rounded px-3 py-1">
                    <span className="text-sm text-gray-400">Over </span>
                    <span className="text-white font-bold">{clip.over_number}</span>
                    <span className="text-gray-400"> - </span>
                    <span className="text-sm text-gray-400">Ball </span>
                    <span className="text-white font-bold">{clip.ball_number}</span>
                  </div>

                  <div
                    className={`border rounded px-3 py-1 font-bold text-sm ${getOutcomeColor(
                      clip.outcome
                    )}`}
                  >
                    {clip.outcome}
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
        ))}
      </div>
    </div>
  );
}
