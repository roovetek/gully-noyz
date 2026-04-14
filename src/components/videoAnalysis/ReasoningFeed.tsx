import { useEffect, useRef } from 'react';
import { Brain, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import type { ReasoningEntry } from './types';

interface ReasoningFeedProps {
  entries: ReasoningEntry[];
  isAnalyzing: boolean;
}

const typeConfig = {
  info: { icon: Brain, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  success: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  analysis: { icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
} as const;

function formatTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function ReasoningFeed({ entries, isAnalyzing }: ReasoningFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [entries.length]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-white">System Thoughts</span>
        </div>
        {isAnalyzing && (
          <span className="flex items-center gap-1.5 text-xs text-cyan-400">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Processing
          </span>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2 pr-1"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}
      >
        {isAnalyzing && (
          <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="text-xs text-cyan-300">Running inference pipeline...</span>
            </div>
            <div className="mt-2 h-1 rounded-full bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 animate-[progress_1.5s_ease-in-out_infinite]"
                style={{ width: '60%' }}
              />
            </div>
          </div>
        )}

        {entries.length === 0 && !isAnalyzing ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-600">
            <Brain className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs text-center">AI reasoning will appear here during analysis</p>
          </div>
        ) : (
          entries.map((entry, i) => {
            const config = typeConfig[entry.type] ?? typeConfig.info;
            const Icon = config.icon;
            return (
              <div
                key={`${entry.timestamp}-${i}`}
                className={`rounded-lg border ${config.border} ${config.bg} p-3 transition-all duration-300`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-start gap-2">
                  <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-200 leading-relaxed">{entry.message}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{formatTime(entry.timestamp)}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
