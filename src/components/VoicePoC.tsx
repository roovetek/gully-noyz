import { useVoiceStateMachine } from '../hooks/useVoiceStateMachine';
import { useVoiceStore } from '../stores/voiceStore';

export function VoicePoC() {
  const { state, transcript, error: storeError, confirmationText } = useVoiceStore();

  const { startLoop, cancel, isSupported } = useVoiceStateMachine({
    wakeWord: 'start recording',
    confirmationWord: 'confirmed',
    onConfirmed: (transcript) => {
      console.log('Voice confirmed:', transcript);
    },
    onCancelled: () => {
      console.log('Voice cancelled');
    },
  });

  if (!isSupported) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-900 mb-4">Not Supported</h1>
          <p className="text-lg text-red-700">
            Your browser does not support the Web Speech API. Please use Chrome, Edge, or Safari.
          </p>
        </div>
      </div>
    );
  }

  const getStateColor = () => {
    switch (state) {
      case 'IDLE':
        return 'bg-gray-100 border-gray-300';
      case 'LISTENING':
        return 'bg-blue-100 border-blue-500 animate-pulse';
      case 'PROCESSING':
        return 'bg-yellow-100 border-yellow-500';
      case 'CONFIRMING':
        return 'bg-purple-100 border-purple-500';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  const getStatusLight = () => {
    switch (state) {
      case 'IDLE':
        return 'bg-gray-400';
      case 'LISTENING':
        return 'bg-blue-500 animate-pulse';
      case 'PROCESSING':
        return 'bg-yellow-500';
      case 'CONFIRMING':
        return 'bg-purple-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Voice PoC</h1>
          <p className="text-sm text-slate-400">Audio Handshake Test</p>
        </div>

        <div
          className={`border-4 rounded-3xl p-12 text-center transition-all duration-300 ${getStateColor()}`}
        >
          <div className="flex justify-center mb-6">
            <div className={`w-16 h-16 rounded-full ${getStatusLight()} shadow-lg`} />
          </div>

          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-600 uppercase tracking-widest">
              Current State
            </p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{state}</p>
          </div>

          {state === 'IDLE' && (
            <p className="text-gray-700 mb-6">Say "Start Recording" to begin</p>
          )}

          {state === 'LISTENING' && (
            <div className="mb-6">
              <p className="text-gray-700 mb-3">Listening...</p>
              <div className="flex justify-center gap-1">
                <div className="w-1 h-12 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-1 h-12 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-1 h-12 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                <div className="w-1 h-12 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.6s' }} />
              </div>
            </div>
          )}

          {state === 'PROCESSING' && (
            <div className="mb-6">
              <p className="text-gray-700 mb-3">Processing...</p>
              <div className="inline-block">
                <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          )}

          {state === 'CONFIRMING' && (
            <div className="mb-6">
              <p className="text-gray-700 mb-3">Confirming...</p>
              <p className="text-sm font-semibold text-purple-700 italic">
                "{confirmationText}"
              </p>
              <p className="text-xs text-purple-600 mt-3">Say "Confirmed" to save</p>
            </div>
          )}

          {transcript && (
            <div className="bg-white bg-opacity-50 rounded-lg p-4 mb-6 text-left">
              <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Transcript</p>
              <p className="text-sm text-gray-800 break-words">{transcript}</p>
            </div>
          )}

          {storeError && (
            <div className="bg-red-100 border-2 border-red-500 rounded-lg p-4 mb-6">
              <p className="text-xs font-semibold text-red-600 uppercase mb-1">Error</p>
              <p className="text-sm text-red-800">{storeError}</p>
            </div>
          )}
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={startLoop}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
          >
            Start Loop
          </button>
          <button
            onClick={cancel}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
          >
            Cancel
          </button>
        </div>

        <div className="mt-8 p-4 bg-slate-700 rounded-lg text-slate-300 text-xs">
          <p className="font-semibold mb-2">Instructions:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Click "Start Loop" to begin listening</li>
            <li>Say "Start Recording" when ready to speak</li>
            <li>Speak your outcome (e.g., "Four Runs")</li>
            <li>Listen to confirmation and say "Confirmed" to save</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
