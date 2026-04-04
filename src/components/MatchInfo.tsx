import { ShieldCheck, Info } from 'lucide-react';
import { useMatch } from '../context/MatchContext';

interface MatchInfoProps {
  onOpenAdmin: () => void;
}

export function MatchInfo({ onOpenAdmin }: MatchInfoProps) {
  const { matchId, matchName } = useMatch();

  return (
    <div className="min-h-screen bg-black text-white pb-20 pt-16">
      <div className="p-4 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Info size={24} className="text-green-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Match Info</h1>
            <p className="text-sm text-gray-400">Quick access to the current match and admin tools.</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
          <div className="text-sm text-gray-400 uppercase tracking-[0.2em] mb-2">Current Match</div>
          <div className="text-2xl font-bold text-white">{matchName || 'Unnamed Match'}</div>
          <div className="mt-2 text-sm text-gray-400">
            Match ID: <span className="font-mono text-yellow-400">{matchId}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400">Admin Dashboard</div>
              <div className="text-xs text-gray-500">Open the admin panel from the app UI.</div>
            </div>
            <ShieldCheck className="text-green-400" />
          </div>
          <p className="text-sm text-gray-300">
            This page exposes the admin entry point in the UI. It is not only reachable by manually editing the URL.
          </p>
          <button
            onClick={onOpenAdmin}
            className="w-full rounded-lg bg-green-500 px-4 py-3 text-black font-bold hover:bg-green-600 transition-colors"
          >
            Open Admin Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
