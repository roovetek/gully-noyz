import { create } from 'zustand';
import { matchReducer, createInitialMatchState } from './matchEngine';
import type { MatchAction, MatchState } from './types';
import type { MatchRules } from '../lib/types';

interface MatchEngineStore {
  state: MatchState | null;
  initialize: (matchId: string, rules: MatchRules) => void;
  dispatch: (action: MatchAction) => void;
  setStateSnapshot: (next: MatchState) => void;
}

export const useMatchEngineStore = create<MatchEngineStore>((set, get) => ({
  state: null,
  initialize: (matchId, rules) => {
    set({ state: createInitialMatchState({ matchId, rules }) });
  },
  dispatch: (action) => {
    const current = get().state;
    if (!current) return;
    set({ state: matchReducer(current, action) });
  },
  setStateSnapshot: (next) => set({ state: next }),
}));

