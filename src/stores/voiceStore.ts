import { create } from 'zustand';

export type VoiceState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'CONFIRMING';

export interface VoiceStoreState {
  state: VoiceState;
  transcript: string;
  isListening: boolean;
  error: string | null;
  confirmationText: string;
  setState: (state: VoiceState) => void;
  setTranscript: (transcript: string) => void;
  setIsListening: (isListening: boolean) => void;
  setError: (error: string | null) => void;
  setConfirmationText: (text: string) => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceStoreState>((set) => ({
  state: 'IDLE',
  transcript: '',
  isListening: false,
  error: null,
  confirmationText: '',
  setState: (state) => set({ state }),
  setTranscript: (transcript) => set({ transcript }),
  setIsListening: (isListening) => set({ isListening }),
  setError: (error) => set({ error }),
  setConfirmationText: (text) => set({ confirmationText: text }),
  reset: () => set({
    state: 'IDLE',
    transcript: '',
    isListening: false,
    error: null,
    confirmationText: '',
  }),
}));
