import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Upload,
  Plus,
  RefreshCw,
  Cpu,
  Download,
} from 'lucide-react';
import { useMatch } from '../../context/MatchContext';
import { useCricketVisionStream } from '../../hooks/cricket/useCricketVisionStream';
import { VideoOverlay } from './VideoOverlay';
import { VideoProcessingControls } from './VideoProcessingControls';
import { ReasoningFeed } from './ReasoningFeed';
import { BallTimeline } from './BallTimeline';
import { ScorePanel } from './ScorePanel';
import { createConfigFromMode, type AdvancedOverlayConfig } from '../../types/videoConfig';
import type {
  AnalysisDelivery,
  BoundingBox,
  SkeletonKeypoint,
  TrajectoryPoint,
  ReasoningEntry,
} from './types';

const DEMO_REASONING_SEQUENCE: ReasoningEntry[] = [
  { message: 'Initializing pose estimation model...', timestamp: 0, type: 'info' },
  { message: 'Detecting player positions in frame', timestamp: 0, type: 'analysis' },
  { message: 'Batsman stance identified: Right-handed, front-on', timestamp: 0, type: 'success' },
  { message: 'Analyzing arm path for delivery classification', timestamp: 0, type: 'analysis' },
  { message: 'Ball release point: 2.1m height, side-on action', timestamp: 0, type: 'info' },
  { message: 'Calculating ball trajectory from release to crease', timestamp: 0, type: 'analysis' },
  { message: 'Estimated delivery speed: 138.4 km/h', timestamp: 0, type: 'success' },
  { message: 'Pitch map: Good length, off-stump line', timestamp: 0, type: 'info' },
  { message: 'Bat swing path detected - square drive attempted', timestamp: 0, type: 'analysis' },
  { message: 'Shot quality score: 8.2/10 - clean connection', timestamp: 0, type: 'success' },
];

const DEMO_BOXES: BoundingBox[] = [
  { x: 80, y: 60, w: 120, h: 300, label: 'Batsman', confidence: 0.97 },
  { x: 480, y: 80, w: 100, h: 260, label: 'Bowler', confidence: 0.94 },
  { x: 290, y: 320, w: 30, h: 30, label: 'Ball', confidence: 0.89 },
];

const DEMO_KEYPOINTS: SkeletonKeypoint[] = [
  { x: 140, y: 75, label: 'head' },
  { x: 100, y: 130, label: 'left_shoulder' },
  { x: 180, y: 130, label: 'right_shoulder' },
  { x: 75, y: 195, label: 'left_elbow' },
  { x: 205, y: 180, label: 'right_elbow' },
  { x: 55, y: 255, label: 'left_wrist' },
  { x: 240, y: 240, label: 'right_wrist' },
  { x: 110, y: 240, label: 'left_hip' },
  { x: 170, y: 240, label: 'right_hip' },
  { x: 100, y: 310, label: 'left_knee' },
  { x: 160, y: 310, label: 'right_knee' },
  { x: 95, y: 370, label: 'left_ankle' },
  { x: 165, y: 370, label: 'right_ankle' },
];

const DEMO_TRAJECTORY: TrajectoryPoint[] = [
  { x: 520, y: 130, t: 0 },
  { x: 470, y: 160, t: 1 },
  { x: 420, y: 200, t: 2 },
  { x: 370, y: 250, t: 3 },
  { x: 320, y: 300, t: 4 },
  { x: 295, y: 335, t: 5 },
];

export interface CricketAnalysisProps {
  onOpenBrowserLab?: () => void;
}

export function CricketAnalysis({ onOpenBrowserLab }: CricketAnalysisProps) {
  const { matchId, matchName } = useMatch();

  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoSize, setVideoSize] = useState({ width: 640, height: 360 });
  const [videoPixelSize, setVideoPixelSize] = useState({ w: 0, h: 0 });
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [localStreamKey, setLocalStreamKey] = useState(0);
  const [overlayMode, setOverlayMode] = useState<'simplified' | 'advanced'>('simplified');
  const [advancedOverlay, setAdvancedOverlay] = useState<AdvancedOverlayConfig>(() =>
    createConfigFromMode('mixed')
  );

  const [deliveries, setDeliveries] = useState<AnalysisDelivery[]>([]);
  const [reasoningFeed, setReasoningFeed] = useState<ReasoningEntry[]>([]);
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeBoundingBoxes, setActiveBoundingBoxes] = useState<BoundingBox[]>([]);
  const [activeSkeletonKeypoints, setActiveSkeletonKeypoints] = useState<SkeletonKeypoint[]>([]);
  const [activeTrajectoryPoints, setActiveTrajectoryPoints] = useState<TrajectoryPoint[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount] = useState(0);

  const appendReasoning = useCallback((entry: ReasoningEntry) => {
    setReasoningFeed((prev) => [entry, ...prev].slice(0, 60));
  }, []);

  const clearReasoning = useCallback(() => {
    setReasoningFeed([]);
  }, []);

  const setOverlayData = useCallback(
    (boxes: BoundingBox[], keypoints: SkeletonKeypoint[], trajectory: TrajectoryPoint[]) => {
      setActiveBoundingBoxes(boxes);
      setActiveSkeletonKeypoints(keypoints);
      setActiveTrajectoryPoints(trajectory);
    },
    []
  );

  const clearOverlayData = useCallback(() => {
    setActiveBoundingBoxes([]);
    setActiveSkeletonKeypoints([]);
    setActiveTrajectoryPoints([]);
  }, []);

  const onBackendOverlay = useCallback(
    (boxes: BoundingBox[], keypoints: SkeletonKeypoint[], trajectory: TrajectoryPoint[]) => {
      setOverlayData(boxes, keypoints, trajectory);
    },
    [setOverlayData]
  );

  const onBackendReasoning = useCallback(
    (text: string) => {
      appendReasoning({ message: text, timestamp: Date.now(), type: 'analysis' });
    },
    [appendReasoning]
  );

  useCricketVisionStream({
    file: uploadedFile,
    videoSize,
    streamKey: localStreamKey,
    onOverlay: onBackendOverlay,
    onReasoning: onBackendReasoning,
    onAnalyzing: setIsAnalyzing,
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (videoContainerRef.current) {
        const { clientWidth, clientHeight } = videoContainerRef.current;
        setVideoSize({ width: clientWidth, height: clientHeight });
      }
    });

    if (videoContainerRef.current) {
      observer.observe(videoContainerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTimestamp(t);
    setProgress(t / (videoRef.current.duration || 1));
  }, []);

  const handleSeek = useCallback((seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      setProgress(seconds / (videoRef.current.duration || 1));
      setCurrentTimestamp(seconds);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      void videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const runDemoAnalysis = useCallback(async () => {
    clearReasoning();
    clearOverlayData();
    setIsAnalyzing(true);

    for (let i = 0; i < DEMO_REASONING_SEQUENCE.length; i += 1) {
      await new Promise((r) => setTimeout(r, 350 + Math.random() * 250));
      appendReasoning({
        ...DEMO_REASONING_SEQUENCE[i],
        timestamp: Date.now(),
      });
    }

    setOverlayData(DEMO_BOXES, DEMO_KEYPOINTS, DEMO_TRAJECTORY);
    setIsAnalyzing(false);
  }, [appendReasoning, clearOverlayData, clearReasoning, setOverlayData]);

  const handleVideoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setUploadedFile(file);
      setLocalStreamKey(0);
      setIsPlaying(false);
      setProgress(0);
      setCurrentTimestamp(0);
      clearOverlayData();
      clearReasoning();
    },
    [clearOverlayData, clearReasoning]
  );

  const startLocalBackendStream = useCallback(() => {
    if (!uploadedFile) return;
    clearReasoning();
    setLocalStreamKey((k) => k + 1);
  }, [uploadedFile, clearReasoning]);

  const handleAddDemoDelivery = useCallback(() => {
    const next: AnalysisDelivery = {
      id: crypto.randomUUID(),
      over_number: Math.floor(deliveries.length / 6),
      ball_number: (deliveries.length % 6) + 1,
      batsman: 'Batter',
      bowler: 'Bowler',
      runs: [0, 1, 2, 4, 6][Math.floor(Math.random() * 5)],
      extras: 0,
      wicket: Math.random() < 0.08,
      shot_type: ['Cover Drive', 'Pull Shot', 'Flick', 'Cut Shot', 'Straight Drive'][
        Math.floor(Math.random() * 5)
      ],
      ball_speed_kmh: Math.round(125 + Math.random() * 25),
      timestamp_seconds: currentTimestamp,
    };

    setDeliveries((prev) => [...prev, next]);
    appendReasoning({
      message: `Delivery logged: ${next.runs} runs - ${next.shot_type}`,
      timestamp: Date.now(),
      type: 'success',
    });
  }, [appendReasoning, currentTimestamp, deliveries.length]);

  const handleExportOverlayFrame = useCallback(() => {
    const container = videoContainerRef.current;
    const video = videoRef.current;
    if (!container) {
      appendReasoning({
        message: 'Cannot export frame: video container not ready.',
        timestamp: Date.now(),
        type: 'warning',
      });
      return;
    }

    const overlayCanvas = container.querySelector('canvas') as HTMLCanvasElement | null;
    if (!overlayCanvas) {
      appendReasoning({
        message: 'Cannot export frame: overlay canvas missing.',
        timestamp: Date.now(),
        type: 'warning',
      });
      return;
    }

    const width = video?.videoWidth || overlayCanvas.width || videoSize.width;
    const height = video?.videoHeight || overlayCanvas.height || videoSize.height;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;

    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    if (video && video.readyState >= 2) {
      ctx.drawImage(video, 0, 0, width, height);
    } else {
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(overlayCanvas, 0, 0, width, height);

    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gully-overlay-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      appendReasoning({
        message: 'Exported overlay frame as PNG.',
        timestamp: Date.now(),
        type: 'success',
      });
    }, 'image/png');
  }, [appendReasoning, videoSize.height, videoSize.width]);

  const totalRuns = deliveries.reduce((sum, d) => sum + d.runs + d.extras, 0);
  const totalWickets = deliveries.filter((d) => d.wicket).length;
  const progressPercent = progress * 100;
  const matchLabel = matchName || (matchId ? `Match ${matchId}` : 'No match selected');

  return (
    <div className="w-full min-h-0 flex flex-col gap-4 p-4 max-w-[1600px] mx-auto text-white">
      <div className="ml-auto">
        <ScorePanel
          matchLabel={matchLabel}
          totalRuns={totalRuns}
          totalWickets={totalWickets}
          deliveryCount={deliveries.length}
          isOnline={isOnline}
          pendingSyncCount={pendingSyncCount}
        />
      </div>

      <details className="glass-panel rounded-2xl p-4 text-sm text-slate-200" open={!videoSrc}>
        <summary className="cursor-pointer select-none font-semibold text-white">
          Capabilities And Expectations
        </summary>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
            <p className="text-xs uppercase tracking-wide text-cyan-300">Supported Input</p>
            <p className="mt-1 text-slate-300">Formats: MP4, WEBM, MOV, MKV, AVI</p>
            <p className="text-slate-400">Recommended: stable camera, clear batter + bowler view</p>
            <p className="text-slate-400">Max upload: 200 MB default</p>
          </div>

          <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
            <p className="text-xs uppercase tracking-wide text-cyan-300">Overlay Modes</p>
            <p className="mt-1 text-slate-300">Simplified: ball path + key actor boxes, cleaner review</p>
            <p className="text-slate-300">Advanced: full keypoints, confidence labels, dense telemetry</p>
          </div>

          <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
            <p className="text-xs uppercase tracking-wide text-cyan-300">What You Get</p>
            <p className="mt-1 text-slate-300">Live overlays and umpire-style reasoning stream</p>
            <p className="text-slate-300">Export Frame creates PNG with current overlay</p>
            <p className="text-amber-300">Full overlay video export is not enabled yet</p>
          </div>

          <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
            <p className="text-xs uppercase tracking-wide text-cyan-300">Local Requirements</p>
            <p className="mt-1 text-slate-300">Start cricket-api on port 8002</p>
            <p className="text-slate-300">Run Ollama with your selected local model</p>
            <p className="text-slate-400">Then click Local GPU Stream after upload</p>
            {onOpenBrowserLab && (
              <button
                type="button"
                onClick={onOpenBrowserLab}
                className="mt-3 w-full rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200 hover:bg-amber-500/20"
              >
                No server? Open browser-only pose lab (MediaPipe WASM)
              </button>
            )}
          </div>
        </div>
      </details>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 flex-1 min-h-0">
        <div className="flex flex-col gap-4 min-h-0">
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div
              ref={videoContainerRef}
              className="relative bg-slate-950 w-full"
              style={{ aspectRatio: '16/9' }}
            >
              {videoSrc ? (
                <video
                  ref={videoRef}
                  src={videoSrc}
                  className="w-full h-full object-cover"
                  muted={isMuted}
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
                  <div className="w-20 h-20 rounded-full bg-slate-800/60 border border-slate-700/50 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-slate-500" />
                  </div>
                  <p className="text-slate-500 text-sm">Upload a video to begin analysis</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-5 py-2 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-colors"
                  >
                    Choose Video
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleVideoUpload}
                  />
                </div>
              )}

              <VideoOverlay
                boundingBoxes={activeBoundingBoxes}
                skeletonKeypoints={activeSkeletonKeypoints}
                trajectoryPoints={activeTrajectoryPoints}
                width={videoSize.width}
                height={videoSize.height}
                mode={overlayMode}
                advancedOverlay={advancedOverlay}
                videoWidth={videoPixelSize.w}
                videoHeight={videoPixelSize.h}
              />

              {isAnalyzing && (
                <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-cyan-500/40 backdrop-blur-sm">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-xs text-cyan-300 font-medium">AI Analyzing</span>
                </div>
              )}
            </div>

            <div className="p-4 space-y-3">
              <div
                className="w-full h-1.5 bg-slate-800 rounded-full cursor-pointer relative group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = (e.clientX - rect.left) / rect.width;
                  handleSeek(ratio * duration);
                }}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `calc(${progressPercent}% - 6px)` }}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  disabled={!videoSrc}
                  className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center hover:bg-blue-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>

                <button
                  onClick={() => setIsMuted(!isMuted)}
                  disabled={!videoSrc}
                  className="w-9 h-9 rounded-full bg-slate-800/60 border border-slate-700/40 text-slate-400 flex items-center justify-center hover:bg-slate-700/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                <span className="text-xs font-mono text-slate-500 ml-1">
                  {Math.floor(currentTimestamp / 60)}:
                  {String(Math.floor(currentTimestamp % 60)).padStart(2, '0')}
                  {' / '}
                  {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
                </span>

                <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
                  <div className="flex items-center gap-1 rounded-xl bg-slate-900/70 border border-slate-700/60 p-1">
                    <button
                      onClick={() => setOverlayMode('simplified')}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                        overlayMode === 'simplified'
                          ? 'bg-blue-500/30 text-blue-200 border border-blue-400/40'
                          : 'text-slate-300 hover:bg-slate-800/70'
                      }`}
                      title="Simplified overlay: cleaner highlights for quick review"
                    >
                      Simplified
                    </button>
                    <button
                      onClick={() => setOverlayMode('advanced')}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                        overlayMode === 'advanced'
                          ? 'bg-violet-500/30 text-violet-200 border border-violet-400/40'
                          : 'text-slate-300 hover:bg-slate-800/70'
                      }`}
                      title="Advanced overlay: full keypoints and telemetry detail"
                    >
                      Advanced
                    </button>
                  </div>

                  <button
                    onClick={runDemoAnalysis}
                    disabled={isAnalyzing}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs font-medium hover:bg-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    Demo Analysis
                  </button>

                  <button
                    onClick={startLocalBackendStream}
                    disabled={!uploadedFile || isAnalyzing}
                    title="Requires cricket-api on port 8002 and Ollama"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-500/20 border border-violet-500/40 text-violet-300 text-xs font-medium hover:bg-violet-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    Local GPU Stream
                  </button>

                  <button
                    onClick={handleAddDemoDelivery}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-medium hover:bg-emerald-500/30 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Log Delivery
                  </button>

                  <button
                    onClick={handleExportOverlayFrame}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-medium hover:bg-amber-500/30 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Frame
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-9 h-9 rounded-full bg-slate-800/60 border border-slate-700/40 text-slate-400 flex items-center justify-center hover:bg-slate-700/60 transition-colors"
                    title="Upload video"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleVideoUpload}
                  />

                  <button className="w-9 h-9 rounded-full bg-slate-800/60 border border-slate-700/40 text-slate-400 flex items-center justify-center hover:bg-slate-700/60 transition-colors">
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-4 h-[220px]">
            <BallTimeline
              deliveries={deliveries}
              currentTimestamp={currentTimestamp}
              onSeek={handleSeek}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 xl:h-full">
          <VideoProcessingControls
            value={advancedOverlay}
            onChange={setAdvancedOverlay}
            title="Video Processing Controls"
          />
          <div className="glass-panel rounded-2xl p-4 flex flex-col h-[520px] xl:h-full min-h-[500px]">
            <ReasoningFeed entries={reasoningFeed} isAnalyzing={isAnalyzing} />
          </div>
        </div>
      </div>
    </div>
  );
}
