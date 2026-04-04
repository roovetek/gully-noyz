import { useState } from 'react';
import { MatchProvider, useMatch } from './context/MatchContext';
import { MatchSelector } from './components/MatchSelector';
import { Record } from './components/Record';
import { Timeline } from './components/Timeline';
import { BottomNav } from './components/BottomNav';

function AppContent() {
  const { matchId } = useMatch();
  const [activeTab, setActiveTab] = useState<'record' | 'timeline'>('record');

  if (!matchId) {
    return <MatchSelector />;
  }

  return (
    <div className="min-h-screen bg-black">
      {activeTab === 'record' ? <Record /> : <Timeline />}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

function App() {
  return (
    <MatchProvider>
      <AppContent />
    </MatchProvider>
  );
}

export default App;
