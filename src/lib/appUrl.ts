/** Hash-based app locations (no server rewrite needed). */

export type MainTab = 'record' | 'timeline' | 'stats' | 'info';
export type AppTab = MainTab | 'gullyRulz' | 'admin' | 'qa';

export function hashFromAppState(matchId: string | null, activeTab: AppTab): string {
  if (activeTab === 'admin') return '#/admin';
  if (activeTab === 'gullyRulz') return '#/gully-rulz';
  if (activeTab === 'qa') return '#/qa';
  if (!matchId) return '#/';
  if (activeTab === 'record' || activeTab === 'timeline' || activeTab === 'stats' || activeTab === 'info') {
    return `#/m/${matchId}/${activeTab}`;
  }
  return '#/';
}

export type ParsedHash =
  | { kind: 'landing' }
  | { kind: 'admin' }
  | { kind: 'qa' }
  | { kind: 'gullyRulz' }
  | { kind: 'match'; matchId: string; tab: MainTab };

export function parseAppHash(): ParsedHash {
  const raw = (typeof window !== 'undefined' ? window.location.hash : '') || '';
  const path = raw.startsWith('#') ? raw.slice(1) : raw;
  const segments = path.replace(/^\/+/, '/').split('/').filter(Boolean);

  if (segments.length === 0) return { kind: 'landing' };

  if (segments[0] === 'admin') return { kind: 'admin' };
  if (segments[0] === 'qa') return { kind: 'qa' };
  if (segments[0] === 'gully-rulz') return { kind: 'gullyRulz' };

  if (segments[0] === 'm' && segments[1]) {
    const id = segments[1].trim().toUpperCase();
    if (/^[A-Z0-9]{6}$/.test(id)) {
      const t = (segments[2] || 'record').toLowerCase();
      const tab: MainTab =
        t === 'timeline' ? 'timeline' : t === 'stats' ? 'stats' : t === 'info' ? 'info' : 'record';
      return { kind: 'match', matchId: id, tab };
    }
  }

  return { kind: 'landing' };
}
