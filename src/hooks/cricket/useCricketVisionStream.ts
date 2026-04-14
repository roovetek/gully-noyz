import { useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import type { BoundingBox, SkeletonKeypoint, TrajectoryPoint } from '../../components/videoAnalysis/types';

export const DEFAULT_CRICKET_API_URL = 'http://127.0.0.1:8002';

function apiToWsBase(apiUrl: string): string {
  if (apiUrl.startsWith('https://')) return `wss://${apiUrl.slice('https://'.length)}`;
  if (apiUrl.startsWith('http://')) return `ws://${apiUrl.slice('http://'.length)}`;
  return apiUrl;
}

export interface TelemetryMessage {
  schema_version: number;
  frame_width?: number;
  frame_height?: number;
  frame_index?: number;
  keypoints?: Array<{ x: number; y: number; label: string; person_id?: number }>;
  bounding_boxes?: BoundingBox[];
  trajectory?: TrajectoryPoint[];
  rules?: Record<string, unknown>;
  reasoning?: string;
  error?: string;
  event?: string;
}

function scaleTelemetry(
  msg: TelemetryMessage,
  displayW: number,
  displayH: number
): {
  boxes: BoundingBox[];
  keypoints: SkeletonKeypoint[];
  trajectory: TrajectoryPoint[];
} {
  const fw = msg.frame_width ?? 1;
  const fh = msg.frame_height ?? 1;
  const sx = displayW / fw;
  const sy = displayH / fh;

  const boxes = (msg.bounding_boxes ?? []).map((b) => ({
    ...b,
    x: b.x * sx,
    y: b.y * sy,
    w: b.w * sx,
    h: b.h * sy,
  }));

  const keypoints: SkeletonKeypoint[] = (msg.keypoints ?? []).map((k) => ({
    x: k.x * sx,
    y: k.y * sy,
    label: k.label,
  }));

  const trajectory = (msg.trajectory ?? []).map((p) => ({
    x: p.x * sx,
    y: p.y * sy,
    t: p.t,
  }));

  return { boxes, keypoints, trajectory };
}

async function startSession(apiUrl: string, file: File): Promise<{ sessionId: string; websocketUrl?: string; wsPath?: string }> {
  const normalized = apiUrl.replace(/\/$/, '');

  const form = new FormData();
  form.append('file', file);

  const sessionRes = await fetch(`${normalized}/sessions`, {
    method: 'POST',
    body: form,
  });

  if (sessionRes.ok) {
    const data = (await sessionRes.json()) as { session_id: string; websocket_url?: string; ws_path?: string };
    return {
      sessionId: data.session_id,
      websocketUrl: data.websocket_url,
      wsPath: data.ws_path,
    };
  }

  const uploadRes = await fetch(`${normalized}/upload`, {
    method: 'POST',
    body: form,
  });
  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Backend error ${uploadRes.status}: ${errText || uploadRes.statusText}`);
  }

  const uploadData = (await uploadRes.json()) as { session_id: string };
  return { sessionId: uploadData.session_id };
}

export function useCricketVisionStream(options: {
  file: File | null;
  videoSize: { width: number; height: number };
  streamKey: number;
  onOverlay: (boxes: BoundingBox[], keypoints: SkeletonKeypoint[], trajectory: TrajectoryPoint[]) => void;
  onReasoning: (text: string) => void;
  onAnalyzing: (v: boolean) => void;
  onStreamEnd?: () => void;
  apiUrl?: string;
}) {
  const {
    file,
    videoSize,
    streamKey,
    onOverlay,
    onReasoning,
    onAnalyzing,
    onStreamEnd,
    apiUrl = import.meta.env.VITE_CRICKET_API_URL ?? DEFAULT_CRICKET_API_URL,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const lastReasoningRef = useRef('');
  const videoSizeRef = useRef(videoSize);
  const onOverlayRef = useRef(onOverlay);
  const onReasoningRef = useRef(onReasoning);
  const onAnalyzingRef = useRef(onAnalyzing);
  const onStreamEndRef = useRef(onStreamEnd);

  useLayoutEffect(() => {
    videoSizeRef.current = videoSize;
  }, [videoSize.width, videoSize.height]);

  useLayoutEffect(() => {
    onOverlayRef.current = onOverlay;
  }, [onOverlay]);

  useLayoutEffect(() => {
    onReasoningRef.current = onReasoning;
  }, [onReasoning]);

  useLayoutEffect(() => {
    onAnalyzingRef.current = onAnalyzing;
  }, [onAnalyzing]);

  useLayoutEffect(() => {
    onStreamEndRef.current = onStreamEnd;
  }, [onStreamEnd]);

  const stop = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    onAnalyzingRef.current(false);
  }, []);

  useEffect(() => {
    if (streamKey === 0 || !file) {
      stop();
      return;
    }

    let cancelled = false;
    const wsBase =
      import.meta.env.VITE_CRICKET_WS_URL?.replace(/\/$/, '') ??
      apiToWsBase(apiUrl.replace(/\/$/, ''));

    (async () => {
      onAnalyzingRef.current(true);
      lastReasoningRef.current = '';

      try {
        const started = await startSession(apiUrl, file);
        if (cancelled) return;

        let wsUrl = started.websocketUrl;
        if (!wsUrl) {
          if (started.wsPath) {
            wsUrl = `${wsBase}${started.wsPath}`;
          } else {
            wsUrl = `${wsBase}/ws/${started.sessionId}`;
          }
        }

        if (wsUrl.startsWith('http://')) wsUrl = `ws://${wsUrl.slice('http://'.length)}`;
        if (wsUrl.startsWith('https://')) wsUrl = `wss://${wsUrl.slice('https://'.length)}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          ws.send('start');
        };

        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data as string) as TelemetryMessage;
            if (msg.error) {
              onReasoningRef.current(`Stream error: ${msg.error}`);
              return;
            }
            if (msg.event === 'stream_end') {
              onAnalyzingRef.current(false);
              onStreamEndRef.current?.();
              return;
            }
            if (msg.schema_version !== 1 || msg.frame_width == null) return;

            const { width, height } = videoSizeRef.current;
            const { boxes, keypoints, trajectory } = scaleTelemetry(msg, width, height);
            onOverlayRef.current(boxes, keypoints, trajectory);

            const r = msg.reasoning?.trim() ?? '';
            if (r && r !== lastReasoningRef.current) {
              lastReasoningRef.current = r;
              onReasoningRef.current(r);
            }
          } catch {
            // Ignore malformed payloads.
          }
        };

        ws.onerror = () => {
          onReasoningRef.current('WebSocket error. Verify cricket-api is running on port 8002.');
          onAnalyzingRef.current(false);
        };

        ws.onclose = () => {
          wsRef.current = null;
          onAnalyzingRef.current(false);
        };
      } catch (e) {
        onReasoningRef.current(`Failed to start stream: ${e instanceof Error ? e.message : String(e)}`);
        onAnalyzingRef.current(false);
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [streamKey, file, apiUrl, stop]);

  return { stop };
}
