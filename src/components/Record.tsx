import { useMatch } from '../context/MatchContext';
import { VideoCapture } from './VideoCapture';

export function Record() {
  const { matchId } = useMatch();

  return (
    <div className="fixed inset-0 bg-black text-white pt-16 pb-20">
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-yellow-400">Record</h2>
        <div className="bg-black/70 backdrop-blur px-4 py-2 rounded-lg border border-yellow-400">
          <span className="text-gray-400 text-sm">Match ID: </span>
          <span className="text-yellow-400 font-mono font-bold">{matchId}</span>
        </div>
      </div>

      <div className="h-full">
        <VideoCapture />
      </div>
    </div>
  );
}
