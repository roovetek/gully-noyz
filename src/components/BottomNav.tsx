import { Video, Clock, BarChart3, Settings } from 'lucide-react';

type Tab = 'record' | 'timeline' | 'stats' | 'info';

interface BottomNavProps {
  matchId: string | null;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function BottomNav({ matchId, activeTab, onTabChange }: BottomNavProps) {
  // Only show tabs if a match is selected
  if (!matchId) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800">
      <div className="flex">
        <button
          onClick={() => onTabChange('record')}
          className={`flex-1 py-4 flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'record'
              ? 'text-yellow-400 bg-gray-800'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Video size={24} />
          <span className="text-xs font-semibold">Record</span>
        </button>

        <button
          onClick={() => onTabChange('timeline')}
          className={`flex-1 py-4 flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'timeline'
              ? 'text-yellow-400 bg-gray-800'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Clock size={24} />
          <span className="text-xs font-semibold">Timeline</span>
        </button>

        <button
          onClick={() => onTabChange('stats')}
          className={`flex-1 py-4 flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'stats'
              ? 'text-yellow-400 bg-gray-800'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <BarChart3 size={24} />
          <span className="text-xs font-semibold">Stats</span>
        </button>

        <button
          onClick={() => onTabChange('info')}
          className={`flex-1 py-4 flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'info'
              ? 'text-yellow-400 bg-gray-800'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Settings size={24} />
          <span className="text-xs font-semibold">Config</span>
        </button>

      </div>
    </nav>
  );
}
