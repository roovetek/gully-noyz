import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Check, X } from 'lucide-react';
import { useVoiceStore } from '../stores/voiceStore';

export interface VoiceDashboardProps {
  onConfirm: () => void;
  onCancel: () => void;
  onStart: () => void;
  onStop: () => void;
  error?: string | null;
}

export function VoiceDashboard({
  onConfirm,
  onCancel,
  onStart,
  onStop,
  error,
}: VoiceDashboardProps) {
  const { state, sanitizedTranscript, confirmationText, confidenceScore, isListening } = useVoiceStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (state === 'LISTENING' && canvasRef.current && isListening) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let animationId: number;
      const draw = () => {
        ctx.fillStyle = 'rgba(229, 231, 235, 1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(59, 130, 246, 0.7)';
        for (let i = 0; i < 20; i++) {
          const height = Math.random() * 40 + 10;
          const x = (i * (canvas.width / 20)) + 5;
          const y = canvas.height / 2 - height / 2;
          ctx.fillRect(x, y, canvas.width / 20 - 10, height);
        }

        animationId = requestAnimationFrame(draw);
      };

      draw();

      return () => cancelAnimationFrame(animationId);
    }
  }, [state, isListening]);

  const getStateColor = () => {
    switch (state) {
      case 'LISTENING':
        return 'bg-blue-50 border-blue-300';
      case 'PROCESSING':
        return 'bg-amber-50 border-amber-300';
      case 'CONFIRMING':
        return 'bg-purple-50 border-purple-300';
      default:
        return 'bg-gray-50 border-gray-300';
    }
  };

  const getStateLabel = () => {
    switch (state) {
      case 'LISTENING':
        return 'LISTENING';
      case 'PROCESSING':
        return 'PROCESSING';
      case 'CONFIRMING':
        return 'CONFIRMING';
      default:
        return 'IDLE';
    }
  };

  const getStateTextColor = () => {
    switch (state) {
      case 'LISTENING':
        return 'text-blue-900';
      case 'PROCESSING':
        return 'text-amber-900';
      case 'CONFIRMING':
        return 'text-purple-900';
      default:
        return 'text-gray-900';
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className={`w-full max-w-md p-8 rounded-2xl border-2 shadow-lg ${getStateColor()} transition-all duration-200`}>
        <div className="text-center mb-8">
          <div className={`inline-block px-4 py-2 rounded-full font-bold text-lg ${getStateTextColor()} mb-2`}>
            {getStateLabel()}
          </div>
          {state === 'LISTENING' && (
            <div className="animate-pulse text-blue-600">Recording...</div>
          )}
        </div>

        {state === 'LISTENING' && (
          <canvas
            ref={canvasRef}
            width={280}
            height={60}
            className="w-full mb-6 rounded-lg bg-gray-100"
          />
        )}

        {state === 'PROCESSING' && (
          <div className="flex justify-center mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-200 border-t-amber-600"></div>
          </div>
        )}

        {(state === 'LISTENING' || state === 'PROCESSING') && sanitizedTranscript && (
          <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Raw Input:</p>
            <p className="text-base font-medium text-gray-900 break-words">{sanitizedTranscript}</p>
            {confidenceScore > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${confidenceScore * 100}%` }}
                  ></div>
                </div>
                <span className="text-xs font-semibold text-gray-700">
                  {Math.round(confidenceScore * 100)}%
                </span>
              </div>
            )}
          </div>
        )}

        {state === 'CONFIRMING' && confirmationText && (
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 mb-6 border border-purple-200">
            <p className="text-sm text-gray-600 mb-2">Please confirm:</p>
            <p className="text-base font-medium text-purple-900 break-words">{confirmationText}</p>
            <div className="mt-3 text-xs text-purple-700">Say "confirmed" or tap the button below</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-3 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex gap-4">
          {state === 'IDLE' && (
            <button
              onClick={onStart}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors active:scale-95"
            >
              <Mic size={20} />
              Start Recording
            </button>
          )}

          {state === 'LISTENING' && (
            <>
              <button
                onClick={onStop}
                className="flex-1 flex items-center justify-center gap-2 bg-amber-600 text-white font-semibold py-3 rounded-lg hover:bg-amber-700 transition-colors active:scale-95"
              >
                <MicOff size={20} />
                Stop
              </button>
              <button
                onClick={onCancel}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-400 text-white font-semibold py-3 rounded-lg hover:bg-gray-500 transition-colors active:scale-95"
              >
                <X size={20} />
                Cancel
              </button>
            </>
          )}

          {state === 'CONFIRMING' && (
            <>
              <button
                onClick={onConfirm}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-semibold py-3 rounded-lg hover:bg-green-700 transition-colors active:scale-95"
              >
                <Check size={20} />
                Confirm
              </button>
              <button
                onClick={onCancel}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-400 text-white font-semibold py-3 rounded-lg hover:bg-gray-500 transition-colors active:scale-95"
              >
                <X size={20} />
                Cancel
              </button>
            </>
          )}
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          {state === 'IDLE' && 'Tap "Start Recording" to begin voice input'}
          {state === 'LISTENING' && 'Listening for cricket terminology...'}
          {state === 'PROCESSING' && 'Processing your input...'}
          {state === 'CONFIRMING' && 'Confirm by saying "confirmed" or tapping the button'}
        </p>
      </div>
    </div>
  );
}
