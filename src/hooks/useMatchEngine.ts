import { useMatchEngineStore } from '../engine/store';

export function useMatchEngine() {
  const state = useMatchEngineStore((s) => s.state);
  const initialize = useMatchEngineStore((s) => s.initialize);
  const dispatch = useMatchEngineStore((s) => s.dispatch);
  const setStateSnapshot = useMatchEngineStore((s) => s.setStateSnapshot);

  return {
    state,
    initialize,
    dispatch,
    setStateSnapshot,
  };
}

