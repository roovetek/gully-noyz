import { useState, useRef, useEffect } from 'react';
import { MatchProvider, useMatch } from './context/MatchContext';
import { MatchSelector } from './components/MatchSelector';
import { Record } from './components/Record';
import { Timeline } from './components/Timeline';
import { MatchStats } from './components/MatchStats';
import { MatchInfo } from './components/MatchInfo';
import { AdminDashboard } from './components/AdminDashboard';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Footer } from './components/Footer';
import { GullyRulz } from './components/AppInfo';

function AppContent() {
  const { matchId, setMatchId } = useMatch();
  const [activeTab, setActiveTab] = useState<'record' | 'timeline' | 'stats' | 'info' | 'gullyRulz'>('record');
  const [showAdmin, setShowAdmin] = useState(false);
  const prevMatchId = useRef<string | null>(null);

  useEffect(() => {
    if (matchId && !prevMatchId.current) {
      setActiveTab('record');
    }
    prevMatchId.current = matchId;
  }, [matchId]);

  const handleOpenGullyRulz = () => {
    setActiveTab('gullyRulz');
  };

  const handleGoHome = () => {
    setActiveTab('record');
    setMatchId(null);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Header
        onHome={handleGoHome}
        onOpenAdmin={() => setShowAdmin(true)}
        onOpenGullyRulz={handleOpenGullyRulz}
      />
      <div className="pt-16 flex-1">
        {activeTab === 'gullyRulz' ? (
          <GullyRulz />
        ) : !matchId ? (
          <MatchSelector />
        ) : (
          <div className="pb-24">
            {activeTab === 'record' && <Record />}
            {activeTab === 'timeline' && <Timeline />}
            {activeTab === 'stats' && <MatchStats />}
            {activeTab === 'info' && <MatchInfo />}
          </div>
        )}
      </div>
      <BottomNav matchId={matchId} activeTab={activeTab} onTabChange={setActiveTab} />
      {!matchId && activeTab !== 'gullyRulz' && <Footer />}
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
