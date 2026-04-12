import { useState, useEffect, useCallback } from 'react';
import { Video, Mic, ClipboardList, type LucideIcon } from 'lucide-react';

export type CaptureMode = 'video+voice' | 'voice' | 'manual';

const STORAGE_KEY = 'capture_mode';
const EVENT_NAME = 'capture-mode-changed';

export function getCaptureMode(): CaptureMode {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored === 'video+voice' || stored === 'voice' || stored === 'manual') {
    return stored;
  }
  // Fallback: honour legacy voice_mode_enabled key
  const legacy = sessionStorage.getItem('voice_mode_enabled');
  return legacy === 'false' ? 'manual' : 'voice';
}

export function setCaptureMode(mode: CaptureMode): void {
  sessionStorage.setItem(STORAGE_KEY, mode);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: mode }));
}

export function useCaptureMode(): CaptureMode {
  const [mode, setMode] = useState<CaptureMode>(getCaptureMode);

  const sync = useCallback(() => setMode(getCaptureMode()), []);

  useEffect(() => {
    window.addEventListener('storage', sync);
    window.addEventListener(EVENT_NAME, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(EVENT_NAME, sync);
    };
  }, [sync]);

  return mode;
}

const MODES: { value: CaptureMode; label: string; Icon: LucideIcon }[] = [
  { value: 'video+voice', label: 'Video + Voice', Icon: Video },
  { value: 'voice', label: 'Voice Only', Icon: Mic },
  { value: 'manual', label: 'Log Only', Icon: ClipboardList },
];

export function CaptureModePicker() {
  const current = useCaptureMode();

  return (
    <div
      className="flex gap-1.5 rounded-xl bg-gray-900/60 p-1.5"
      data-testid="capture-mode-picker"
      role="group"
      aria-label="Capture mode"
    >
      {MODES.map(({ value, label, Icon }) => {
        const active = current === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            data-testid={`capture-mode-${value}`}
            onClick={() => setCaptureMode(value)}
            className={[
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition-all',
              active
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-400 hover:text-white',
            ].join(' ')}
          >
            <Icon size={13} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
