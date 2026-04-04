import { useState, useEffect } from 'react';
import { Home, ChevronDown, ChevronRight } from 'lucide-react';
import { useMatch } from '../context/MatchContext';
import { supabase, Clip } from '../lib/supabase';

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

export function MatchStats() {
  const { matchId, matchName, setMatchId } = useMatch();
  const [innings1Summary, setInnings1Summary] = useState<InningsSummary | null>(null);
  const [innings2Summary, setInnings2Summary] = useState<InningsSummary | null>(null);
  const [expandedInnings, setExpandedInnings] = useState<number | null>(null);
  const [expandedOvers, setExpandedOvers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [matchConfig, setMatchConfig] = useState({ ballsPerOver: 6, totalOvers: 20 });

  useEffect(() => {
    if (matchId) {
      fetchMatchData();
    }
  }, [matchId]);

  const fetchMatchData = async () => {
    setLoading(true);

    const { data: matchData } = await supabase
      .from('matches')
      .select('balls_per_over, total_overs')
      .eq('match_id', matchId)
      .maybeSingle();

    if (matchData) {
      setMatchConfig({
        ballsPerOver: matchData.balls_per_over,
        totalOvers: matchData.total_overs,
      });
    }

    const { data: clips } = await supabase
      .from('clips')
      .select('*')
      .eq('match_id', matchId)
      .order('innings_number', { ascending: true })
      .order('over_number', { ascending: true })
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
  };

  const calculateInningsSummary = (inningsNumber: number, clips: Clip[], ballsPerOver: number): InningsSummary => {
    const totalRuns = clips.reduce((sum, clip) => {
      const runs = parseInt(clip.outcome);
      return sum + (isNaN(runs) ? 0 : runs);
    }, 0);

    const totalWickets = clips.filter(c => c.outcome === 'wicket' ||
      ['bowled', 'caught', 'lbw', 'runout', 'stumped', 'hitwicket', 'hitballtwice', 'obstructing', 'timedout', 'handledball'].includes(c.outcome)).length;

    const uniqueOvers = new Set(clips.map(c => c.over_number));
    const maxOver = Math.max(...Array.from(uniqueOvers));
    const ballsInLastOver = clips.filter(c => c.over_number === maxOver).length;
    const completedOvers = ballsInLastOver === ballsPerOver ? maxOver : maxOver - 1;
    const remainingBalls = ballsInLastOver === ballsPerOver ? 0 : ballsInLastOver;
    const totalOvers = remainingBalls === 0 ? completedOvers.toString() : `${completedOvers}.${remainingBalls}`;

    return {
      inningsNumber,
      totalRuns,
      totalWickets,
      totalOvers,
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
          const r = parseInt(ball.outcome);
          return sum + (isNaN(r) ? 0 : r);
        }, 0);

        const wickets = balls.filter(b => b.outcome === 'wicket' ||
          ['bowled', 'caught', 'lbw', 'runout', 'stumped', 'hitwicket', 'hitballtwice', 'obstructing', 'timedout', 'handledball'].includes(b.outcome)).length;

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

  const formatOutcome = (outcome: string) => {
    if (outcome === 'dot') return 'Dot Ball';
    if (outcome === 'wicket') return 'Wicket';
    if (['bowled', 'caught', 'lbw', 'runout', 'stumped', 'hitwicket', 'hitballtwice', 'obstructing', 'timedout', 'handledball'].includes(outcome)) {
      return `Out - ${outcome.charAt(0).toUpperCase() + outcome.slice(1)}`;
    }
    return `${outcome} Run${outcome === '1' ? '' : 's'}`;
  };

  const getOutcomeColor = (outcome: string) => {
    if (outcome === '6') return 'text-green-400 bg-green-500/20 border-green-500';
    if (outcome === '4') return 'text-blue-400 bg-blue-500/20 border-blue-500';
    if (outcome === 'wicket' || ['bowled', 'caught', 'lbw', 'runout', 'stumped', 'hitwicket', 'hitballtwice', 'obstructing', 'timedout', 'handledball'].includes(outcome)) {
      return 'text-red-400 bg-red-500/20 border-red-500';
    }
    if (outcome === 'dot') return 'text-gray-400 bg-gray-500/20 border-gray-500';
    return 'text-yellow-400 bg-yellow-500/20 border-yellow-500';
  };

  const handleHome = () => {
    setMatchId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading match stats...</p>
        </div>
      </div>
    );
  }

  const summaries = [innings2Summary, innings1Summary].filter(Boolean) as InningsSummary[];

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="p-4 mb-4 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleHome}
            className="bg-gray-900 p-2 rounded-lg border border-green-400 hover:bg-green-400/20 transition-colors"
          >
            <Home size={24} className="text-green-400" />
          </button>

          <div className="bg-gray-900 px-4 py-2 rounded-lg border border-yellow-400">
            <div>
              {matchName && (
                <div className="text-white font-bold text-sm">{matchName}</div>
              )}
              <div className="text-xs">
                <span className="text-gray-400">ID: </span>
                <span className="text-yellow-400 font-mono font-bold">{matchId}</span>
              </div>
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-green-400">Match Stats</h1>
      </div>

      <div className="p-4">
        {summaries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No match data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <h2 className="text-xl font-bold mb-3 text-gray-300">Match Summary</h2>
              <div className="grid grid-cols-2 gap-4">
                {innings1Summary && (
                  <div className="bg-gray-800 rounded-lg p-3 border border-orange-400">
                    <div className="text-orange-400 text-sm font-bold mb-2">Innings 1</div>
                    <div className="text-white text-2xl font-bold">{innings1Summary.totalRuns}/{innings1Summary.totalWickets}</div>
                    <div className="text-gray-400 text-sm">Overs: {innings1Summary.totalOvers}</div>
                  </div>
                )}
                {innings2Summary && (
                  <div className="bg-gray-800 rounded-lg p-3 border border-orange-400">
                    <div className="text-orange-400 text-sm font-bold mb-2">Innings 2</div>
                    <div className="text-white text-2xl font-bold">{innings2Summary.totalRuns}/{innings2Summary.totalWickets}</div>
                    <div className="text-gray-400 text-sm">Overs: {innings2Summary.totalOvers}</div>
                  </div>
                )}
              </div>
            </div>

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
                                            <span className="text-green-400 text-sm font-bold">Ball {ball.ball_number}</span>
                                          </div>
                                          <div className={`border rounded px-3 py-1 text-sm font-bold ${getOutcomeColor(ball.outcome)}`}>
                                            {formatOutcome(ball.outcome)}
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
    </div>
  );
}
