import React, { useState, useEffect } from 'react';
import { Mic, Settings } from 'lucide-react';

export interface VoiceSettingsProps {
  onToggle?: (enabled: boolean) => void;
  initialEnabled?: boolean;
}

const VOICE_MODE_KEY = 'voice_mode_enabled';

export function VoiceSettings({ onToggle, initialEnabled = false }: VoiceSettingsProps) {
  const [voiceEnabled, setVoiceEnabled] = useState(initialEnabled);
  const [isWebSpeechSupported, setIsWebSpeechSupported] = useState(true);

  useEffect(() => {
    const supported =
      'webkitSpeechRecognition' in window ||
      'SpeechRecognition' in window;
    setIsWebSpeechSupported(supported);

    const stored = sessionStorage.getItem(VOICE_MODE_KEY);
    if (stored !== null) {
      setVoiceEnabled(stored === 'true');
    }
  }, []);

  const handleToggle = (enabled: boolean) => {
    setVoiceEnabled(enabled);
    sessionStorage.setItem(VOICE_MODE_KEY, enabled ? 'true' : 'false');
    if (onToggle) {
      onToggle(enabled);
    }
  };

  if (!isWebSpeechSupported) {
    return (
      <div className="rounded-lg border border-amber-700 bg-amber-950 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Settings size={16} className="text-amber-400" />
          <p className="text-sm font-semibold text-amber-300">Voice Mode</p>
        </div>
        <p className="text-xs text-amber-200">
          Web Speech API not supported in your browser. Manual entry only.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-blue-700 bg-blue-950 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Mic size={16} className="text-blue-400" />
          <p className="text-sm font-semibold text-blue-300">Voice Mode</p>
        </div>
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={voiceEnabled}
            onChange={(e) => handleToggle(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="ml-2 text-sm text-blue-300">
            {voiceEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </label>
      </div>
      <p className="text-xs text-blue-200">
        {voiceEnabled
          ? 'Voice input is enabled. You can use voice commands to record deliveries.'
          : 'Switch to manual entry mode. Enable voice for hands-free scoring.'}
      </p>
    </div>
  );
}

export function useVoiceMode(): boolean {
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(VOICE_MODE_KEY);
    setVoiceEnabled(stored === 'true');
  }, []);

  return voiceEnabled;
}
