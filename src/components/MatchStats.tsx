import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMatch } from '../context/MatchContext';
import { MatchHeaderSummary } from './MatchHeaderSummary';
import { MatchPageSummaryStrip } from './MatchPageSummaryStrip';
import { supabase, Clip } from '../lib/supabase';
import { getTestDataFilter } from '../lib/testDataFilter';
import { calculateMatchStats } from '../lib/match';
import { formatDismissalOptionLabel } from '../lib/dismissalOptions';
import { HighlightsPlayer } from './HighlightsPlayer';

interface InningsSummary {
  inningsNumber: number;
  totalRuns: number;
  totalWickets: number;
  totalOvers: string;
  clips: Clip[];
}

interface OverData {
  overNumber: number;
  balls: Clip[];
  runs: number;
  wickets: number;
}

const formatDismissalLabel = (dismissalType: string) => formatDismissalOptionLabel(dismissalType);

const isWicketBall = (clip: Pick<Clip, 'outcome' | 'dismissal_type'>) =>
  clip.outcome === 'wicket' || clip.dismissal_type !== null;

export function MatchStats() {
  const { matchId } = useMatch();
  const [innings1Summary, setInnings1Summary] = useState<InningsSummary | null>(null);
  const [innings2Summary, setInnings2Summary] = useState<InningsSummary | null>(null);
  const [expandedInnings, setExpandedInnings] = useState<number | null>(null);
  const [expandedOvers, setExpandedOvers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [matchConfig, setMatchConfig] = useState({ ballsPerOver: 6, totalOvers: 20, currentInnings: 1 });
  const [generatingInnings, setGeneratingInnings] = useState<number | null>(null);
  const [highlightsError, setHighlightsError] = useState<string | null>(null);
  const [highlightsUrl, setHighlightsUrl] = useState<string | null>(null);
  const [highlightsTitle, setHighlightsTitle] = useState('Highlights Reel');
  const [highlightsOpen, setHighlightsOpen] = useState(false);

  const fetchMatchData = useCallback(async () => {
    if (!matchId) return;
    setLoading(true);

    const { data: matchData } = await supabase
      .from('matches')
      .select('balls_per_over, total_overs, current_innings')
      .eq('match_id', matchId)
      .maybeSingle();

    if (matchData) {
      setMatchConfig({
        ballsPerOver: matchData.balls_per_over,
        totalOvers: matchData.total_overs,
        currentInnings: matchData.current_innings ?? 1,
      });
    }

    const testDataFilter = getTestDataFilter();
    let clipsQuery = supabase
      .from('clips')
      .select('*')
      .eq('match_id', matchId);

    if (testDataFilter !== undefined) {
      clipsQuery = clipsQuery.eq('is_test_data', testDataFilter);
    }

    const { data: clips } = await clipsQuery
      .order('innings_number', { ascending: true })
      .order('over_number', { ascending: true })
      .order('delivery_index', { ascending: true })
      .order('ball_number', { ascending: true });

    if (clips) {
      const innings1Clips = clips.filter(c => c.innings_number === 1);
      const innings2Clips = clips.filter(c => c.innings_number === 2);

      if (innings1Clips.length > 0) {
        setInnings1Summary(calculateInningsSummary(1, innings1Clips, matchData?.balls_per_over || 6));
      }

      if (innings2Clips.length > 0) {
        setInnings2Summary(calculateInningsSummary(2, innings2Clips, matchData?.balls_per_over || 6));
      }
    }

    setLoading(false);
  }, [matchId]);

  useEffect(() => {
    if (!matchId) return;

    fetchMatchData();

    const channel = supabase
      .channel(`match_stats_clips_${matchId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clips', filter: `match_id=eq.${matchId}` },
        () => {
          fetchMatchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, fetchMatchData]);

  const calculateInningsSummary = (inningsNumber: number, clips: Clip[], ballsPerOver: number): InningsSummary => {
    const stats = calculateMatchStats(clips, ballsPerOver);

    return {
      inningsNumber,
      totalRuns: stats.totalRuns,
      totalWickets: stats.totalWickets,
      totalOvers: stats.currentOvers,
      clips,
    };
  };

  const getOversData = (clips: Clip[]): OverData[] => {
    const oversMap = new Map<number, Clip[]>();

    clips.forEach(clip => {
      if (!oversMap.has(clip.over_number)) {
        oversMap.set(clip.over_number, []);
      }
      oversMap.get(clip.over_number)!.push(clip);
    });

    return Array.from(oversMap.entries())
      .map(([overNumber, balls]) => {
        const runs = balls.reduce((sum, ball) => {
          const baseRuns = Number.parseInt(ball.outcome, 10);
          return sum + (Number.isFinite(baseRuns) ? baseRuns : 0) + (ball.extra_runs ?? 0);
        }, 0);

        const wickets = balls.filter(isWicketBall).length;

        return { overNumber, balls, runs, wickets };
      })
      .sort((a, b) => a.overNumber - b.overNumber);
  };

  const toggleInnings = (inningsNumber: number) => {
    setExpandedInnings(expandedInnings === inningsNumber ? null : inningsNumber);
  };

  const toggleOver = (inningsNumber: number, overNumber: number) => {
    const key = `${inningsNumber}-${overNumber}`;
    const newExpanded = new Set(expandedOvers);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedOvers(newExpanded);
  };

  const formatOutcome = (clip: Pick<Clip, 'outcome' | 'dismissal_type'>) => {
    const outcome = clip.outcome;
    if (outcome === 'dot') return 'Dot Ball';
    if (outcome === 'wide') return 'Wide';
    if (outcome === 'noball') return 'No ball';
    if (outcome === 'other') return 'Other';
    if (outcome === 'wicket') {
      return clip.dismissal_type ? `Wicket - ${formatDismissalLabel(clip.dismissal_type)}` : 'Wicket';
    }
    return `${outcome} Run${outcome === '1' ? '' : 's'}`;
  };

  const getOutcomeColor = (clip: Pick<Clip, 'outcome' | 'dismissal_type'>) => {
    const outcome = clip.outcome;
    if (outcome === '6') return 'text-green-400 bg-green-500/20 border-green-500';
    if (outcome === '4') return 'text-blue-400 bg-blue-500/20 border-blue-500';
    if (isWicketBall(clip)) {
      return 'text-red-400 bg-red-500/20 border-red-500';
    }
    if (outcome === 'dot') return 'text-gray-400 bg-gray-500/20 border-gray-500';
    return 'text-yellow-400 bg-yellow-500/20 border-yellow-500';
  };

  const isCompletedInnings = (summary: InningsSummary): boolean => {
    const validBalls = summary.clips.filter((clip) => clip.is_valid_ball !== false).length;
    const requiredValidBalls = matchConfig.ballsPerOver * matchConfig.totalOvers;
    return summary.inningsNumber < matchConfig.currentInnings || validBalls >= requiredValidBalls;
  };

  const getHighlightCandidates = (summary: InningsSummary): Clip[] => {
    return summary.clips.filter((clip) => ['4', '6', 'wicket'].includes(clip.outcome));
  };

  const handleGenerateHighlights = async (summary: InningsSummary) => {
    if (!matchId) return;

    setHighlightsError(null);
    setGeneratingInnings(summary.inningsNumber);

    const highlightClipIds = getHighlightCandidates(summary).map((clip) => clip.id);
    if (highlightClipIds.length === 0) {
      setHighlightsError(`No highlight clips found for Innings ${summary.inningsNumber}.`);
      setGeneratingInnings(null);
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: matchId,
          innings_number: summary.inningsNumber,
          clip_ids: highlightClipIds,
        }),
      });

      if (!response.ok) {
        throw new Error(`Highlights endpoint failed with ${response.status}`);
      }

      const data = (await response.json()) as { highlights_url?: string };
      if (!data.highlights_url) {
        throw new Error('Highlights URL missing from response');
      }

      setHighlightsTitle(`Innings ${summary.inningsNumber} Highlights`);
      setHighlightsUrl(data.highlights_url);
      setHighlightsOpen(true);
    } catch {
      setHighlightsError(
        'Could not generate highlights. Start the local highlights backend on localhost:8000.'
      );
    } finally {
      setGeneratingInnings(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-black text-white flex flex-col">
        <MatchPageSummaryStrip>
          <MatchHeaderSummary variant="solid" showNameEdit />
        </MatchPageSummaryStrip>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading match stats...</p>
          </div>
        </div>
      </div>
    );
  }

  const summaries = [innings2Summary, innings1Summary].filter(Boolean) as InningsSummary[];

  return (
    <div className="min-h-screen bg-black text-white pb-20 flex flex-col">
      <MatchPageSummaryStrip>
        <MatchHeaderSummary variant="solid" showNameEdit />
      </MatchPageSummaryStrip>

      <div className="px-4 pt-4 pb-2 bg-gray-900 border-b border-gray-800">
        <h1
          data-testid="match-stats-heading"
          className="text-2xl font-bold text-center text-green-400"
        >
          Match Stats
        </h1>
      </div>

      <div className="p-4 flex-1">
        {highlightsError && (
          <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-lg p-3">
            <p className="text-red-300 text-sm">{highlightsError}</p>
          </div>
        )}

        {summaries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No match data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <h2 className="text-xl font-bold mb-3 text-gray-300">Match Details</h2>
              <div className="space-y-3">
                {summaries.map((summary) => {
                  const overs = getOversData(summary.clips);
                  const isExpanded = expandedInnings === summary.inningsNumber;

                  return (
                    <div key={summary.inningsNumber} className="border border-gray-700 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleInnings(summary.inningsNumber)}
                        className="w-full bg-gray-800 hover:bg-gray-750 p-4 flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown size={20} className="text-orange-400" />
                          ) : (
                            <ChevronRight size={20} className="text-orange-400" />
                          )}
                          <div className="text-left">
                            <div className="text-orange-400 font-bold">Innings {summary.inningsNumber}</div>
                            <div className="text-white text-xl font-bold">{summary.totalRuns}/{summary.totalWickets}</div>
                          </div>
                        </div>
                        <div className="text-gray-400 text-sm">
                          {summary.totalOvers} overs
                        </div>
                      </button>

                      {isCompletedInnings(summary) && (
                        <div className="bg-gray-850 px-4 py-3 border-t border-gray-700">
                          <button
                            onClick={() => void handleGenerateHighlights(summary)}
                            disabled={generatingInnings === summary.inningsNumber}
                            className="w-full bg-purple-500 hover:bg-purple-600 text-black font-bold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {generatingInnings === summary.inningsNumber
                              ? 'Generating Highlights...'
                              : 'Generate Highlights Reel'}
                          </button>
                        </div>
                      )}

                      {isExpanded && (
                        <div className="bg-gray-850 p-3 space-y-2">
                          {overs.map((over) => {
                            const overKey = `${summary.inningsNumber}-${over.overNumber}`;
                            const isOverExpanded = expandedOvers.has(overKey);

                            return (
                              <div key={over.overNumber} className="border border-gray-700 rounded-lg overflow-hidden">
                                <button
                                  onClick={() => toggleOver(summary.inningsNumber, over.overNumber)}
                                  className="w-full bg-gray-800 hover:bg-gray-750 p-3 flex items-center justify-between transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    {isOverExpanded ? (
                                      <ChevronDown size={16} className="text-blue-400" />
                                    ) : (
                                      <ChevronRight size={16} className="text-blue-400" />
                                    )}
                                    <span className="text-blue-400 font-bold">Over {over.overNumber}</span>
                                  </div>
                                  <div className="text-gray-300 text-sm">
                                    {over.runs} runs, {over.wickets} wicket{over.wickets !== 1 ? 's' : ''}
                                  </div>
                                </button>

                                {isOverExpanded && (
                                  <div className="bg-gray-900 p-3 space-y-2">
                                    {over.balls.map((ball) => (
                                      <div
                                        key={ball.id}
                                        className="flex items-center justify-between bg-gray-800 rounded p-3 border border-gray-700"
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="bg-green-500/20 border border-green-400 rounded px-2 py-1">
                                            <span className="text-green-400 text-sm font-bold">
                                              Ball {ball.ball_number}
                                              <span className="text-xs text-green-300 ml-1">
                                                (Del {ball.delivery_index ?? ball.ball_number})
                                              </span>
                                            </span>
                                          </div>
                                          <div className={`border rounded px-3 py-1 text-sm font-bold ${getOutcomeColor(ball)}`}>
                                            {formatOutcome(ball)}
                                          </div>
                                        </div>
                                        <div className="text-gray-500 text-xs">
                                          {new Date(ball.created_at).toLocaleTimeString()}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <HighlightsPlayer
        isOpen={highlightsOpen}
        title={highlightsTitle}
        videoUrl={highlightsUrl}
        onClose={() => {
          setHighlightsOpen(false);
        }}
      />
    </div>
  );
}
