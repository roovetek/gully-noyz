import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Upload,
  Download,
  Cpu,
  ArrowLeft,
} from 'lucide-react';
import { VideoOverlay } from './VideoOverlay';
import { VideoProcessingControls } from './VideoProcessingControls';
import { ReasoningFeed } from './ReasoningFeed';
import type { ReasoningEntry, SkeletonKeypoint, TrajectoryPoint } from './types';
import { createConfigFromMode, type AdvancedOverlayConfig } from '../../types/videoConfig';
import {
  BROWSER_POSE_SCAN_DEFAULTS,
  runBrowserPoseScan,
  type BrowserPoseFrame,
} from './browserPose/runBrowserPoseScan';
import { mapSkeletonToDisplay, normalizedToContainerPx } from './browserPose/videoContainMapping';
import {
  compareToPreset,
  computeBrowserHeuristics,
  type BrowserHeuristicSummary,
} from './browserPose/browserAnalysisHeuristics';
import {
  presetForRole,
  STYLE_PRESETS,
  type AnalysisRole,
  type StylePreset,
} from './stylePresets';

export interface CricketAnalysisBrowserProps {
  onOpenServerAnalysis: () => void;
}

function closestFrame(frames: BrowserPoseFrame[], timeSec: number): BrowserPoseFrame | null {
  if (frames.length === 0) return null;
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (frames[mid].timeSec < timeSec) lo = mid + 1;
    else hi = mid;
  }
  const i = lo;
  const prev = i > 0 ? frames[i - 1] : frames[i];
  const curr = frames[i];
  return Math.abs(prev.timeSec - timeSec) <= Math.abs(curr.timeSec - timeSec) ? prev : curr;
}

function phaseHint(summary: BrowserHeuristicSummary | null, role: AnalysisRole, progress01: number): string {
  if (!summary?.phases.length) return role === 'batting' ? 'Batting phases (estimate)' : 'Bowling phases (estimate)';
  const idx = Math.min(summary.phases.length - 1, Math.floor(progress01 * summary.phases.length));
  return summary.phases[idx] ?? summary.phases[0];
}

export function CricketAnalysisBrowser({ onOpenServerAnalysis }: CricketAnalysisBrowserProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const processCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [videoSize, setVideoSize] = useState({ width: 640, height: 360 });
  const [videoPixelSize, setVideoPixelSize] = useState({ w: 640, h: 360 });

  const [role, setRole] = useState<AnalysisRole>('batting');
  const [handedness, setHandedness] = useState<'right' | 'left'>('right');
  const [presetId, setPresetId] = useState<string>(STYLE_PRESETS[0].id);
  const [advancedOverlay, setAdvancedOverlay] = useState<AdvancedOverlayConfig>(() =>
    createConfigFromMode('batting')
  );

  const [frames, setFrames] = useState<BrowserPoseFrame[]>([]);
  const [summary, setSummary] = useState<BrowserHeuristicSummary | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [reasoningFeed, setReasoningFeed] = useState<ReasoningEntry[]>([]);

  const [activeKeypoints, setActiveKeypoints] = useState<SkeletonKeypoint[]>([]);
  const [activeTrajectory, setActiveTrajectory] = useState<TrajectoryPoint[]>([]);

  const appendReasoning = useCallback((entry: ReasoningEntry) => {
    setReasoningFeed((prev) => [entry, ...prev].slice(0, 80));
  }, []);

  useEffect(() => {
    const o = new ResizeObserver(() => {
      if (videoContainerRef.current) {
        const { clientWidth, clientHeight } = videoContainerRef.current;
        setVideoSize({ width: clientWidth, height: clientHeight });
      }
    });
    if (videoContainerRef.current) o.observe(videoContainerRef.current);
    return () => o.disconnect();
  }, []);

  const updateOverlayForTime = useCallback(
    (t: number, frameList: BrowserPoseFrame[], heur: BrowserHeuristicSummary | null) => {
      const v = videoRef.current;
      const vw = v?.videoWidth ?? videoPixelSize.w;
      const vh = v?.videoHeight ?? videoPixelSize.h;
      const { width: cw, height: ch } = videoSize;

      const fr = closestFrame(frameList, t);
      const sk = fr ? mapSkeletonToDisplay(fr.keypointsNorm, cw, ch, vw, vh) : [];
      setActiveKeypoints(sk);

      if (heur?.wristTrajectory.length) {
        const traj = heur.wristTrajectory.map((p) => {
          const m = normalizedToContainerPx(p.x, p.y, cw, ch, vw, vh);
          return { x: m.x, y: m.y, t: p.t };
        });
        setActiveTrajectory(traj);
      } else {
        setActiveTrajectory([]);
      }
    },
    [videoPixelSize, videoSize]
  );

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTimestamp(t);
    setProgress(t / (videoRef.current.duration || 1));
    updateOverlayForTime(t, frames, summary);
  }, [frames, summary, updateOverlayForTime]);

  useEffect(() => {
    updateOverlayForTime(currentTimestamp, frames, summary);
  }, [videoSize.width, videoSize.height, currentTimestamp, frames, summary, updateOverlayForTime]);

  const handleSeek = useCallback(
    (seconds: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = seconds;
        setProgress(seconds / (videoRef.current.duration || 1));
        setCurrentTimestamp(seconds);
        updateOverlayForTime(seconds, frames, summary);
      }
    },
    [frames, summary, updateOverlayForTime]
  );

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      void videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleVideoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setFrames([]);
      setSummary(null);
      setActiveKeypoints([]);
      setActiveTrajectory([]);
      setReasoningFeed([]);
      setProgress(0);
      setCurrentTimestamp(0);
      setIsPlaying(false);
      appendReasoning({
        message: 'Video loaded. Run a browser pose scan (MediaPipe WASM, local only).',
        timestamp: Date.now(),
        type: 'info',
      });
    },
    [appendReasoning]
  );

  const runScan = useCallback(async () => {
    const video = videoRef.current;
    const canvas = processCanvasRef.current;
    if (!video || !canvas || !videoSrc) {
      appendReasoning({ message: 'Load a video first.', timestamp: Date.now(), type: 'warning' });
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
  setFrames([]);
  setSummary(null);
  setActiveKeypoints([]);
  setActiveTrajectory([]);
    appendReasoning({ message: 'Loading pose model and scanning frames (may take a while)…', timestamp: Date.now(), type: 'analysis' });

    try {
      const scanned = await runBrowserPoseScan({
        video,
        canvas,
        stepSec: 0.12,
        maxProcessWidth: 480,
        onProgress: setScanProgress,
      });
      setFrames(scanned);
      const heur = computeBrowserHeuristics(scanned, role, handedness);
      setSummary(heur);

      if (heur) {
        heur.phases.forEach((line) => {
          appendReasoning({ message: line, timestamp: Date.now(), type: 'analysis' });
        });
        appendReasoning({
          message: `Estimates — stance width (norm): ${heur.stanceWidthNorm.toFixed(3)}, wrist travel (y): ${heur.wristTravelY.toFixed(3)}, hip travel (x): ${heur.hipTravelX.toFixed(3)}`,
          timestamp: Date.now(),
          type: 'success',
        });
      }

      const preset = STYLE_PRESETS.find((p) => p.id === presetId) ?? STYLE_PRESETS[0];
      if (heur && preset.role === role) {
        compareToPreset(heur, preset).forEach((msg) => {
          appendReasoning({ message: msg, timestamp: Date.now(), type: 'info' });
        });
      }

      updateOverlayForTime(video.currentTime, scanned, heur);
      appendReasoning({ message: 'Browser pose scan complete. Playback uses advanced skeleton overlay.', timestamp: Date.now(), type: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Pose scan failed';
      appendReasoning({ message: msg, timestamp: Date.now(), type: 'warning' });
    } finally {
      setIsScanning(false);
    }
  }, [appendReasoning, handedness, presetId, role, updateOverlayForTime, videoSrc]);

  const exportMetricsJson = useCallback(() => {
    if (!frames.length) {
      appendReasoning({ message: 'Nothing to export — run a scan first.', timestamp: Date.now(), type: 'warning' });
      return;
    }
    const preset = STYLE_PRESETS.find((p) => p.id === presetId);
    const blob = new Blob(
      [
        JSON.stringify(
          {
            role,
            handedness,
            preset: preset?.playerName,
            summary,
            frameCount: frames.length,
            sampleTimesSec: frames.map((f) => f.timeSec),
          },
          null,
          2
        ),
      ],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gully-browser-pose-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    appendReasoning({ message: 'Exported metrics summary JSON (not full per-frame landmarks).', timestamp: Date.now(), type: 'success' });
  }, [appendReasoning, frames, handedness, presetId, role, summary]);

  const presetsForRole = presetForRole(role);
  const selectedPreset: StylePreset | undefined = STYLE_PRESETS.find((p) => p.id === presetId);
  const progressPercent = progress * 100;
  const phaseLine = phaseHint(summary, role, duration > 0 ? currentTimestamp / duration : 0);

  useEffect(() => {
    const first = presetForRole(role)[0];
    if (first) setPresetId(first.id);
    setAdvancedOverlay((previous) =>
      createConfigFromMode(role, {
        objectDetectionThreshold: previous.objectDetectionThreshold,
        prioritizeBall: previous.prioritizeBall,
        trajectoryContinuity: previous.trajectoryContinuity,
        entityColor: previous.entityColor,
        trajectoryColor: previous.trajectoryColor,
        lineWidth: previous.lineWidth,
        trajectoryPoints: previous.trajectoryPoints,
        showLabels: previous.showLabels,
      })
    );
  }, [role]);

  return (
    <div className="w-full min-h-0 flex flex-col gap-4 p-4 max-w-[1600px] mx-auto text-white">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onOpenServerAnalysis}
          className="inline-flex items-center gap-2 rounded-xl border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 hover:bg-rose-500/20"
        >
          <ArrowLeft className="w-4 h-4" />
          Server / GPU analysis
        </button>
        <p className="text-xs text-slate-400 max-w-xl">
          Pose runs in your browser via MediaPipe WASM. Video stays local. Metrics and phases are coarse estimates from 2D pose — not medical or pro coaching advice.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 flex-1 min-h-0">
        <div className="flex flex-col gap-4 min-h-0">
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="w-full md:w-3/4 mx-auto">
              <div
                ref={videoContainerRef}
                className="relative bg-slate-950 w-full"
                style={{ aspectRatio: '16/9' }}
              >
              {videoSrc ? (
                <video
                  ref={videoRef}
                  src={videoSrc}
                  className="w-full h-full object-contain bg-black"
                  muted={isMuted}
                  playsInline
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={() => {
                    if (videoRef.current) {
                      setDuration(videoRef.current.duration);
                      setVideoPixelSize({
                        w: videoRef.current.videoWidth,
                        h: videoRef.current.videoHeight,
                      });
                    }
                  }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <Upload className="w-8 h-8 text-slate-500" />
                  <p className="text-slate-500 text-sm">Upload a short clip for local pose estimation</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-5 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-medium hover:bg-amber-500/30"
                  >
                    Choose video
                  </button>
                </div>
              )}

              <VideoOverlay
                boundingBoxes={[]}
                skeletonKeypoints={activeKeypoints}
                trajectoryPoints={activeTrajectory}
                width={videoSize.width}
                height={videoSize.height}
                mode="advanced"
                advancedOverlay={advancedOverlay}
                videoWidth={videoPixelSize.w}
                videoHeight={videoPixelSize.h}
              />

              {isScanning && (
                <div className="absolute top-3 left-3 flex flex-col gap-1 px-3 py-2 rounded-lg bg-slate-900/85 border border-amber-500/40 backdrop-blur-sm max-w-[240px]">
                  <span className="text-xs text-amber-200 font-medium">Scanning pose…</span>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 transition-all"
                      style={{ width: `${Math.round(scanProgress * 100)}%` }}
                    />
                  </div>
                </div>
              )}

                {frames.length > 0 && !isScanning && (
                  <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
                    <p className="text-[11px] text-slate-200 bg-slate-900/80 border border-slate-700/60 rounded-lg px-2 py-1 line-clamp-2">
                      Phase hint: {phaseLine}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 space-y-3 flex flex-col gap-3">
              <div
                className="w-full h-1.5 bg-slate-800 rounded-full cursor-pointer relative group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = (e.clientX - rect.left) / rect.width;
                  handleSeek(ratio * duration);
                }}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  disabled={!videoSrc}
                  className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center disabled:opacity-40"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  disabled={!videoSrc}
                  className="w-9 h-9 rounded-full bg-slate-800/60 border border-slate-700/40 text-slate-400 flex items-center justify-center disabled:opacity-40"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <span className="text-xs font-mono text-slate-500">
                  {Math.floor(currentTimestamp / 60)}:{String(Math.floor(currentTimestamp % 60)).padStart(2, '0')} /{' '}
                  {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
                </span>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 border border-slate-600 text-xs text-slate-200"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideoUpload}
                />

                <button
                  type="button"
                  onClick={() => void runScan()}
                  disabled={!videoSrc || isScanning}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/25 border border-amber-500/50 text-amber-200 text-xs font-semibold hover:bg-amber-500/35 disabled:opacity-50"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  Run browser pose scan
                </button>

                <button
                  type="button"
                  onClick={exportMetricsJson}
                  disabled={!frames.length}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 border border-slate-600 text-xs text-slate-200 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export JSON
                </button>
              </div>
            </div>

            <canvas ref={processCanvasRef} className="hidden" aria-hidden />

            <div className="p-4 space-y-3 flex flex-col gap-3">
              <div className="flex flex-wrap gap-3 text-xs">
                <label className="flex items-center gap-2 text-slate-300">
                  Role
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as AnalysisRole)}
                    className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-1 text-white"
                  >
                    <option value="batting">Batting</option>
                    <option value="bowling">Bowling</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-slate-300">
                  Primary wrist
                  <select
                    value={handedness}
                    onChange={(e) => setHandedness(e.target.value as 'right' | 'left')}
                    className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-1 text-white"
                  >
                    <option value="right">Right</option>
                    <option value="left">Left</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-slate-300">
                  Style preset
                  <select
                    value={presetId}
                    onChange={(e) => setPresetId(e.target.value)}
                    className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-1 text-white max-w-[200px]"
                  >
                    {presetsForRole.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.playerName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <p className="text-[11px] text-slate-400 border border-slate-700/50 rounded-lg p-2 bg-slate-900/40">
                Browser Lab uses role to choose batting vs bowling heuristics. Primary wrist only changes which wrist path is used for derived trajectory and motion summaries; it does not change the pose model itself.
              </p>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="flex flex-col gap-1 text-xs text-slate-300">
                  Role
                  <span className="text-[10px] leading-4 text-slate-500">
                    Chooses batting or bowling heuristics, preset comparisons, and the base overlay focus used after scan.
                  </span>
                </label>
                <label className="flex flex-col gap-1 text-xs text-slate-300">
                  Primary wrist
                  <span className="text-[10px] leading-4 text-slate-500">
                    Selects which wrist drives the derived wrist-travel metric and the displayed wrist trajectory path.
                  </span>
                </label>
                <label className="flex flex-col gap-1 text-xs text-slate-300">
                  Style preset
                  <span className="text-[10px] leading-4 text-slate-500">
                    Compares the scanned motion summary against an illustrative batting or bowling reference band.
                  </span>
                </label>
              </div>

              <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3 text-[11px] text-slate-400">
                <p className="font-medium text-slate-200">Browser pose scan defaults</p>
                <p>Model: {BROWSER_POSE_SCAN_DEFAULTS.modelVariant}</p>
                <p>Running mode: {BROWSER_POSE_SCAN_DEFAULTS.runningMode}</p>
                <p>Sample step: {BROWSER_POSE_SCAN_DEFAULTS.stepSec}s per frame</p>
                <p>Max process width: {BROWSER_POSE_SCAN_DEFAULTS.maxProcessWidth}px</p>
                <p>Max poses: {BROWSER_POSE_SCAN_DEFAULTS.numPoses}</p>
                <p>
                  Confidence gates: detect {BROWSER_POSE_SCAN_DEFAULTS.minPoseDetectionConfidence}, presence {BROWSER_POSE_SCAN_DEFAULTS.minPosePresenceConfidence}, tracking {BROWSER_POSE_SCAN_DEFAULTS.minTrackingConfidence}
                </p>
              </div>

              {selectedPreset && (
                <p className="text-[11px] text-slate-400 border border-slate-700/50 rounded-lg p-2 bg-slate-900/40">
                  <span className="text-slate-300 font-medium">{selectedPreset.playerName}: </span>
                  {selectedPreset.summary} — {selectedPreset.disclaimer}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 xl:h-[min(900px,80vh)]">
          <VideoProcessingControls
            value={advancedOverlay}
            onChange={setAdvancedOverlay}
            title="Browser Pose Controls"
            lockedMode={role}
            hideFocusMode
            showHelperText
          />
          <div className="glass-panel rounded-2xl p-4 flex flex-col h-[420px] xl:h-[min(640px,70vh)] min-h-[320px]">
            <ReasoningFeed entries={reasoningFeed} isAnalyzing={isScanning} />
          </div>
        </div>
      </div>
    </div>
  );
}
