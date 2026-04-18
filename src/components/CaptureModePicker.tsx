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

const MODES: { value: CaptureMode; label: string; shortLabel: string; Icon: LucideIcon }[] = [
  { value: 'video+voice', label: 'Video + Voice', shortLabel: 'V+Voice', Icon: Video },
  { value: 'voice', label: 'Voice Only', shortLabel: 'Voice', Icon: Mic },
  { value: 'manual', label: 'Log Only', shortLabel: 'Log', Icon: ClipboardList },
];

export function CaptureModePicker() {
  const current = useCaptureMode();

  return (
    <div
      className="flex min-w-0 gap-1 rounded-lg bg-gray-900/60 p-1 sm:gap-1.5 sm:rounded-xl sm:p-1.5"
      data-testid="capture-mode-picker"
      role="group"
      aria-label="Capture mode"
    >
      {MODES.map(({ value, label, shortLabel, Icon }) => {
        const active = current === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            aria-label={label}
            data-testid={`capture-mode-${value}`}
            onClick={() => setCaptureMode(value)}
            className={[
              'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1.5 text-[10px] font-semibold leading-tight transition-all sm:flex-row sm:gap-1.5 sm:rounded-lg sm:px-2 sm:text-xs',
              active
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-400 hover:text-white',
            ].join(' ')}
          >
            <Icon className="shrink-0" size={14} />
            <span className="max-w-full truncate sm:hidden">{shortLabel}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
