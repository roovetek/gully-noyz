import { describe, expect, it } from 'vitest';
import { hashFromAppState, parseAppHash } from '../../src/lib/appUrl';

describe('appUrl', () => {
  describe('hashFromAppState', () => {
    it('returns non-match routes for admin, qa and gully-rulz', () => {
      expect(hashFromAppState(null, 'admin')).toBe('#/admin');
      expect(hashFromAppState(null, 'qa')).toBe('#/qa');
      expect(hashFromAppState(null, 'gullyRulz')).toBe('#/gully-rulz');
    });

    it('returns landing when there is no match id', () => {
      expect(hashFromAppState(null, 'record')).toBe('#/');
      expect(hashFromAppState(null, 'timeline')).toBe('#/');
      expect(hashFromAppState(null, 'stats')).toBe('#/');
      expect(hashFromAppState(null, 'info')).toBe('#/');
    });

    it('returns match tab routes for match tabs', () => {
      expect(hashFromAppState('ABC123', 'record')).toBe('#/m/ABC123/record');
      expect(hashFromAppState('ABC123', 'timeline')).toBe('#/m/ABC123/timeline');
      expect(hashFromAppState('ABC123', 'stats')).toBe('#/m/ABC123/stats');
      expect(hashFromAppState('ABC123', 'info')).toBe('#/m/ABC123/info');
    });
  });

  describe('parseAppHash', () => {
    it('parses landing/admin/qa/gully-rulz', () => {
      window.location.hash = '';
      expect(parseAppHash()).toEqual({ kind: 'landing' });

      window.location.hash = '#/admin';
      expect(parseAppHash()).toEqual({ kind: 'admin' });

      window.location.hash = '#/qa';
      expect(parseAppHash()).toEqual({ kind: 'qa' });

      window.location.hash = '#/gully-rulz';
      expect(parseAppHash()).toEqual({ kind: 'gullyRulz' });
    });

    it('parses valid match tabs and normalizes case', () => {
      window.location.hash = '#/m/abc123/timeline';
      expect(parseAppHash()).toEqual({ kind: 'match', matchId: 'ABC123', tab: 'timeline' });

      window.location.hash = '#/m/AbC123/stats';
      expect(parseAppHash()).toEqual({ kind: 'match', matchId: 'ABC123', tab: 'stats' });

      window.location.hash = '#/m/ABC123/info';
      expect(parseAppHash()).toEqual({ kind: 'match', matchId: 'ABC123', tab: 'info' });
    });

    it('defaults to record tab when omitted or unknown', () => {
      window.location.hash = '#/m/ABC123';
      expect(parseAppHash()).toEqual({ kind: 'match', matchId: 'ABC123', tab: 'record' });

      window.location.hash = '#/m/ABC123/unknown';
      expect(parseAppHash()).toEqual({ kind: 'match', matchId: 'ABC123', tab: 'record' });
    });

    it('falls back to landing for invalid match ids and unknown routes', () => {
      window.location.hash = '#/m/abc12/timeline';
      expect(parseAppHash()).toEqual({ kind: 'landing' });

      window.location.hash = '#/not-a-route';
      expect(parseAppHash()).toEqual({ kind: 'landing' });
    });
  });
});

