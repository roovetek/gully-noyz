import { Target, Zap, Shield } from 'lucide-react';
import type { AnalysisDelivery } from './types';

interface BallTimelineProps {
  deliveries: AnalysisDelivery[];
  currentTimestamp: number;
  onSeek: (timestamp: number) => void;
}

function getRunsColor(runs: number, wicket: boolean): string {
  if (wicket) return 'bg-red-500/20 border-red-500/50 text-red-400';
  if (runs === 6) return 'bg-amber-500/20 border-amber-500/50 text-amber-400';
  if (runs === 4) return 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400';
  if (runs === 0) return 'bg-slate-700/40 border-slate-600/30 text-slate-500';
  return 'bg-blue-500/20 border-blue-500/40 text-blue-300';
}

function formatOver(over: number, ball: number): string {
  return `${over}.${ball}`;
}

export function BallTimeline({ deliveries, currentTimestamp, onSeek }: BallTimelineProps) {
  const sorted = [...deliveries].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Target className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-semibold text-white">Ball-by-Ball Ledger</span>
        <span className="ml-auto text-xs text-slate-500">{sorted.length} deliveries</span>
      </div>

      <div
        className="flex-1 overflow-y-auto space-y-1.5 pr-1"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}
      >
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-600">
            <Target className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs text-center">No deliveries recorded yet</p>
          </div>
        ) : (
          sorted.map((delivery) => {
            const isActive = Math.abs(currentTimestamp - delivery.timestamp_seconds) < 3;
            return (
              <button
                key={delivery.id}
                onClick={() => onSeek(delivery.timestamp_seconds)}
                className={`w-full text-left rounded-lg border p-2.5 transition-all duration-200 hover:scale-[1.01] ${
                  isActive
                    ? 'bg-blue-500/20 border-blue-500/50 ring-1 ring-blue-500/30'
                    : 'bg-slate-800/40 border-slate-700/30 hover:bg-slate-700/40 hover:border-slate-600/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500 w-8 flex-shrink-0">
                    {formatOver(delivery.over_number, delivery.ball_number)}
                  </span>

                  <span
                    className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0 ${getRunsColor(delivery.runs, delivery.wicket)}`}
                  >
                    {delivery.wicket ? 'W' : delivery.runs}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-white truncate">{delivery.batsman}</span>
                      {delivery.ball_speed_kmh && (
                        <span className="flex items-center gap-0.5 text-[10px] text-amber-400 flex-shrink-0">
                          <Zap className="w-2.5 h-2.5" />
                          {delivery.ball_speed_kmh}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Shield className="w-2.5 h-2.5 text-slate-500" />
                      <span className="text-[10px] text-slate-500 truncate">{delivery.bowler}</span>
                      {delivery.shot_type && (
                        <span className="text-[10px] text-slate-600 ml-auto flex-shrink-0">{delivery.shot_type}</span>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-slate-600 flex-shrink-0">
                    {Math.floor(delivery.timestamp_seconds / 60)}:{String(
                      Math.floor(delivery.timestamp_seconds % 60)
                    ).padStart(2, '0')}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
