import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { MatchProvider, useMatch } from './context/MatchContext';
import { MatchClipsProvider } from './context/MatchClipsContext';
import { SecureStorage } from './lib/security';
import { STORAGE_KEYS } from './lib/constants';
import { hashFromAppState, parseAppHash, type AppTab, type MainTab } from './lib/appUrl';
import { MatchSelector } from './components/MatchSelector';
import { Record } from './components/Record';
import { Timeline } from './components/Timeline';
import { MatchStats } from './components/MatchStats';
import { MatchInfo } from './components/MatchInfo';
import { AdminDashboard } from './components/AdminDashboard';
import { Header, type NavHighlight } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Footer } from './components/Footer';
import { GullyRulz } from './components/AppInfo';
import { QAReport } from './components/QAReport';
import { VoicePoC } from './components/VoicePoC';

function isQaReportRouteEnabled(): boolean {
  return Boolean(import.meta.env.DEV || import.meta.env.VITE_ENABLE_QA_REPORT === 'true');
}

function readStoredMainTab(): MainTab {
  const raw = SecureStorage.getItem(STORAGE_KEYS.APP_ACTIVE_TAB);
  if (raw === 'record' || raw === 'timeline' || raw === 'stats' || raw === 'info') {
    return raw;
  }
  return 'record';
}

function handleOpenVoicePoC(): void {
  if (typeof window !== 'undefined') {
    window.location.hash = '#/voice-poc';
  }
}

function AppContent() {
  const { matchId, setMatchId } = useMatch();
  const [activeTab, setActiveTabState] = useState<AppTab>(() =>
    matchId ? readStoredMainTab() : 'record'
  );
  const prevMatchId = useRef<string | null>(null);
  const skipHashEvent = useRef(false);
  const didInitFromHash = useRef(false);

  const setActiveTab = (tab: AppTab) => {
    setActiveTabState(tab);
    if (tab === 'record' || tab === 'timeline' || tab === 'stats' || tab === 'info') {
      SecureStorage.setItem(STORAGE_KEYS.APP_ACTIVE_TAB, tab);
    }
  };

  /** Landing = pick / join match (no match in context). */
  const handleGoHome = () => {
    setActiveTab('record');
    setMatchId(null);
  };

  const handleOpenGullyRulz = () => {
    setActiveTab('gullyRulz');
  };

  useLayoutEffect(() => {
    if (didInitFromHash.current) return;
    didInitFromHash.current = true;
    const p = parseAppHash();
    if (p.kind === 'admin') {
      setActiveTabState('admin');
      return;
    }
    if (p.kind === 'gullyRulz') {
      setActiveTabState('gullyRulz');
      return;
    }
    if (p.kind === 'voicePoC') {
      setActiveTabState('voicePoC');
      return;
    }
    if (p.kind === 'qa') {
      if (isQaReportRouteEnabled()) {
        setActiveTabState('qa');
      } else {
        setMatchId(null);
        setActiveTabState('record');
        if (typeof window !== 'undefined' && window.location.hash === '#/qa') {
          skipHashEvent.current = true;
          window.location.replace(`${window.location.pathname}${window.location.search}#/`);
        }
      }
      return;
    }
    if (p.kind === 'match' && p.matchId === matchId) {
      setActiveTabState(p.tab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time hydration from window.location.hash
  }, []);

  useEffect(() => {
    if (matchId && !prevMatchId.current) {
      const p = parseAppHash();
      if (p.kind !== 'match' || p.matchId !== matchId) {
        setActiveTabState(readStoredMainTab());
      }
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

  useEffect(() => {
    const next = hashFromAppState(matchId, activeTab);
    if (typeof window === 'undefined' || window.location.hash === next) return;
    skipHashEvent.current = true;
    window.location.hash = next;
  }, [matchId, activeTab]);

  useEffect(() => {
    const onHashChange = () => {
      if (skipHashEvent.current) {
        skipHashEvent.current = false;
        return;
      }
      const p = parseAppHash();
      if (p.kind === 'admin') {
        setActiveTabState('admin');
        return;
      }
      if (p.kind === 'gullyRulz') {
        setActiveTabState('gullyRulz');
        return;
      }
      if (p.kind === 'voicePoC') {
        setActiveTabState('voicePoC');
        return;
      }
      if (p.kind === 'qa') {
        if (isQaReportRouteEnabled()) {
          setActiveTabState('qa');
        } else {
          setMatchId(null);
          setActiveTabState('record');
          if (window.location.hash === '#/qa') {
            skipHashEvent.current = true;
            window.location.replace(`${window.location.pathname}${window.location.search}#/`);
          }
        }
        return;
      }
      if (p.kind === 'match' && matchId && p.matchId === matchId) {
        setActiveTabState(p.tab);
        return;
      }
      if (p.kind === 'landing') {
        setMatchId(null);
        setActiveTabState('record');
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [matchId, setMatchId]);

  const navHighlight: NavHighlight = useMemo(() => {
    if (activeTab === 'admin') return 'admin';
    if (activeTab === 'gullyRulz') return 'gullyRulz';
    if (activeTab === 'qa') return 'none';
    if (!matchId) return 'home';
    if (activeTab === 'record') return 'home';
    return 'none';
  }, [activeTab, matchId]);

  const recordFillsViewport = Boolean(matchId && activeTab === 'record');

  return (
    <div
      className={`flex flex-col bg-black ${recordFillsViewport ? 'h-dvh max-h-dvh overflow-hidden' : 'min-h-screen'}`}
    >
      <Header
        highlight={navHighlight}
        onHome={handleGoHome}
        onOpenGullyRulz={handleOpenGullyRulz}
      />
      <div className="pt-16 flex-1 flex flex-col min-h-0">
        {activeTab === 'admin' ? (
          <AdminDashboard />
        ) : activeTab === 'qa' && isQaReportRouteEnabled() ? (
          <QAReport />
        ) : activeTab === 'gullyRulz' ? (
          <GullyRulz />
        ) : activeTab === 'voicePoC' ? (
          <VoicePoC />
        ) : !matchId ? (
          <MatchSelector />
        ) : (
          <>
            {activeTab === 'record' && <Record />}
            {activeTab === 'timeline' && <Timeline />}
            {activeTab === 'stats' && <MatchStats />}
            {activeTab === 'info' && <MatchInfo />}
          </>
        )}
      </div>
      {activeTab !== 'admin' && activeTab !== 'gullyRulz' && activeTab !== 'qa' && activeTab !== 'voicePoC' && (
        <BottomNav matchId={matchId} activeTab={activeTab} onTabChange={setActiveTab} />
      )}
      {!recordFillsViewport && <Footer />}
    </div>
  );
}

function App() {
  return (
    <MatchProvider>
      <MatchClipsProvider>
        <AppContent />
      </MatchClipsProvider>
    </MatchProvider>
  );
}

export default App;
