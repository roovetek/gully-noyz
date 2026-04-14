import { TrendingUp, Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface ScorePanelProps {
  matchLabel: string;
  totalRuns: number;
  totalWickets: number;
  deliveryCount: number;
  isOnline: boolean;
  pendingSyncCount: number;
}

function getRunRate(runs: number, deliveries: number): string {
  if (deliveries === 0) return '0.00';
  return ((runs / deliveries) * 6).toFixed(2);
}

export function ScorePanel({
  matchLabel,
  totalRuns,
  totalWickets,
  deliveryCount,
  isOnline,
  pendingSyncCount,
}: ScorePanelProps) {
  const overs = Math.floor(deliveryCount / 6);
  const balls = deliveryCount % 6;

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <p className="text-xs text-slate-500 leading-none mb-0.5">Active Match</p>
        <p className="text-sm font-medium text-white truncate max-w-[260px]">{matchLabel}</p>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-white font-mono">
            {totalRuns}
            <span className="text-slate-500 text-lg">/{totalWickets}</span>
          </p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Score</p>
        </div>

        <div className="text-center">
          <p className="text-lg font-bold text-white font-mono">
            {overs}.{balls}
          </p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Overs</p>
        </div>

        <div className="text-center">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <p className="text-lg font-bold text-emerald-400 font-mono">
              {getRunRate(totalRuns, deliveryCount)}
            </p>
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Run Rate</p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/50">
          {isOnline ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span className={`text-xs font-medium ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
            {isOnline ? 'Live' : 'Offline'}
          </span>
          {pendingSyncCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400 ml-1">
              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
              {pendingSyncCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
