import { useState, useRef, useEffect } from 'react';
import { MatchProvider, useMatch } from './context/MatchContext';
import { SecureStorage } from './lib/security';
import { STORAGE_KEYS } from './lib/constants';
import { Record } from './components/Record';
import { Timeline } from './components/Timeline';
import { MatchStats } from './components/MatchStats';
import { MatchInfo } from './components/MatchInfo';
import { AdminDashboard } from './components/AdminDashboard';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Footer } from './components/Footer';

type MainTab = 'record' | 'timeline' | 'stats' | 'info';

function readStoredMainTab(): MainTab {
  const raw = SecureStorage.getItem(STORAGE_KEYS.APP_ACTIVE_TAB);
  if (raw === 'record' || raw === 'timeline' || raw === 'stats' || raw === 'info') {
    return raw;
  }
  return 'record';
}

function AppContent() {
  const { matchId, setMatchId } = useMatch();
  const [activeTab, setActiveTabState] = useState<
    MainTab | 'gullyRulz' | 'admin'
  >(() => (matchId ? readStoredMainTab() : 'record'));
  const prevMatchId = useRef<string | null>(null);

  const setActiveTab = (tab: MainTab | 'gullyRulz' | 'admin') => {
    setActiveTabState(tab);
    if (tab === 'record' || tab === 'timeline' || tab === 'stats' || tab === 'info') {
      SecureStorage.setItem(STORAGE_KEYS.APP_ACTIVE_TAB, tab);
    }
  };

  useEffect(() => {
    if (matchId && !prevMatchId.current) {
      setActiveTabState(readStoredMainTab());
    }
    if (!matchId) {
      try {
        SecureStorage.removeItem(STORAGE_KEYS.APP_ACTIVE_TAB);
      } catch {
        /* ignore */
      }
      setActiveTabState((prev) =>
        prev === 'gullyRulz' || prev === 'admin' ? prev : 'record'
      );
    }
    prevMatchId.current = matchId;
  }, [matchId]);

  const handleGoHome = () => {
    setActiveTab('record');
    setMatchId(null);
  };

  const handleOpenAdmin = () => {
    setActiveTab('admin');
  };

  const handleCloseAdmin = () => {
    setActiveTab(readStoredMainTab());
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Header onHome={handleGoHome} onOpenAdmin={handleOpenAdmin} />
      <div className="pt-16 flex-1">
        {/* Ensure consistent spacing below the fixed header */}
        {activeTab === 'admin' ? (
          <AdminDashboard onClose={handleCloseAdmin} />
        ) : (
          <>
            {activeTab === 'record' && <Record />}
            {activeTab === 'timeline' && <Timeline />}
            {activeTab === 'stats' && <MatchStats />}
            {activeTab === 'info' && <MatchInfo />}
          </>
        )}
      </div>
      {activeTab !== 'admin' && activeTab !== 'gullyRulz' && (
        <BottomNav matchId={matchId} activeTab={activeTab} onTabChange={setActiveTab} />
      )}
      {!matchId && activeTab !== 'gullyRulz' && activeTab !== 'admin' && <Footer />}
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
