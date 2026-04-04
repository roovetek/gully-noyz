import { useState } from 'react';
import { MatchProvider, useMatch } from './context/MatchContext';
import { MatchSelector } from './components/MatchSelector';
import { Record } from './components/Record';
import { Timeline } from './components/Timeline';
import { MatchStats } from './components/MatchStats';
import { MatchInfo } from './components/MatchInfo';
import { AdminDashboard } from './components/AdminDashboard';
import { BottomNav } from './components/BottomNav';

function AppContent() {
  const { matchId } = useMatch();
  const [activeTab, setActiveTab] = useState<'record' | 'timeline' | 'stats' | 'info'>('record');
  const [showAdmin, setShowAdmin] = useState(false);

  if (!matchId) {
    return <MatchSelector />;
  }

  return (
    <div className="min-h-screen bg-black">
      {activeTab === 'record' && <Record />}
      {activeTab === 'timeline' && <Timeline />}
      {activeTab === 'stats' && <MatchStats />}
      {activeTab === 'info' && <MatchInfo onOpenAdmin={() => setShowAdmin(true)} />}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      {showAdmin && <AdminDashboard onClose={() => setShowAdmin(false)} />}
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
