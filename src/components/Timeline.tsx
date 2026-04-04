import { useMatch } from '../context/MatchContext';
import { MatchTimeline } from './MatchTimeline';

export function Timeline() {
  const { matchId } = useMatch();

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="p-4 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-yellow-400">Timeline</h2>
          <div className="bg-gray-900 px-4 py-2 rounded-lg border border-yellow-400">
            <span className="text-gray-400 text-sm">Match ID: </span>
            <span className="text-yellow-400 font-mono font-bold">{matchId}</span>
          </div>
        </div>
      </div>

      <MatchTimeline />
    </div>
  );
}
