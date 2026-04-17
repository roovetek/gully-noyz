import {
  ANALYSIS_MODES,
  TRACKING_MODES,
  TRAJECTORY_MODES,
  createConfigFromMode,
  type AdvancedOverlayConfig,
  type AnalysisMode,
  type EntityType,
} from '../../types/videoConfig';

interface VideoProcessingControlsProps {
  value: AdvancedOverlayConfig;
  onChange: (nextValue: AdvancedOverlayConfig) => void;
  title?: string;
  lockedMode?: AnalysisMode;
  hideFocusMode?: boolean;
  showHelperText?: boolean;
}

function HelperText({ children }: { children: string }) {
  return <span className="text-[10px] leading-4 text-slate-500">{children}</span>;
}

const ENTITY_LABELS: Record<EntityType, string> = {
  head: 'Head',
  torso: 'Torso',
  'bat-toe': 'Bat Toe',
  'bat-handle': 'Bat Handle',
  'bat-hand': 'Bat Hand',
  'bowling-arm': 'Bowling Arm',
  'bowling-leg': 'Bowling Leg',
  'toe-line': 'Toe Line',
  ball: 'Ball',
};

const BATTING_ENTITY_OPTIONS: EntityType[] = ['head', 'torso', 'bat-toe', 'bat-handle', 'bat-hand', 'ball'];
const BOWLING_ENTITY_OPTIONS: EntityType[] = ['head', 'torso', 'bowling-arm', 'bowling-leg', 'toe-line', 'ball'];

function toggleEntity(list: EntityType[], entity: EntityType): EntityType[] {
  if (list.includes(entity)) {
    return list.filter((entry) => entry !== entity);
  }
  return [...list, entity];
}

export function VideoProcessingControls({
  value,
  onChange,
  title = 'Processing Controls',
  lockedMode,
  hideFocusMode = false,
  showHelperText = false,
}: VideoProcessingControlsProps) {
  const applyPartial = (patch: Partial<AdvancedOverlayConfig>) => {
    onChange({ ...value, ...patch });
  };

  const handleModeChange = (mode: AnalysisMode) => {
    const nextPreset = createConfigFromMode(mode, {
      objectDetectionThreshold: value.objectDetectionThreshold,
      prioritizeBall: value.prioritizeBall,
      trajectoryContinuity: value.trajectoryContinuity,
      entityColor: value.entityColor,
      trajectoryColor: value.trajectoryColor,
      lineWidth: value.lineWidth,
      trajectoryPoints: value.trajectoryPoints,
      showLabels: value.showLabels,
    });
    onChange(nextPreset);
  };

  const handleThresholdChange = (
    key: keyof AdvancedOverlayConfig['objectDetectionThreshold'],
    threshold: number
  ) => {
    applyPartial({
      objectDetectionThreshold: {
        ...value.objectDetectionThreshold,
        [key]: threshold,
      },
    });
  };

  const renderEntityToggle = (entity: EntityType, selected: boolean, onToggle: () => void) => (
    <button
      key={entity}
      type="button"
      onClick={onToggle}
      className={`rounded-lg border px-2 py-1 text-[11px] transition-colors ${
        selected
          ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-100'
          : 'border-slate-700 bg-slate-900/50 text-slate-300 hover:bg-slate-800/70'
      }`}
    >
      {ENTITY_LABELS[entity]}
    </button>
  );

  const selectedMode = lockedMode ?? value.mode;

  return (
    <section className="glass-panel rounded-2xl p-4 space-y-4" aria-label={title}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-[11px] text-slate-400">
            Tune what the model emphasizes in the uploaded clip and how that emphasis renders on the overlay.
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleModeChange(selectedMode)}
          className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-[11px] text-slate-200 hover:bg-slate-800/80"
        >
          Reset Preset
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {hideFocusMode ? null : (
          <label className="flex flex-col gap-1 text-xs text-slate-300">
            Focus Mode
            {showHelperText ? <HelperText>Chooses batting, bowling, or mixed overlay presets for the tracked entities.</HelperText> : null}
            <select
              value={selectedMode}
              onChange={(event) => handleModeChange(event.target.value as AnalysisMode)}
              disabled={Boolean(lockedMode)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white disabled:opacity-60"
            >
              {ANALYSIS_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1 text-xs text-slate-300">
          Tracking Mode
          {showHelperText ? <HelperText>Limits the overlay emphasis to batting subjects, bowling subjects, everything, or an auto-filtered mix.</HelperText> : null}
          <select
            value={value.trackingMode}
            onChange={(event) => applyPartial({ trackingMode: event.target.value as AdvancedOverlayConfig['trackingMode'] })}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          >
            {TRACKING_MODES.map((trackingMode) => (
              <option key={trackingMode} value={trackingMode}>
                {trackingMode}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-slate-300">
          Trajectory Mode
          {showHelperText ? <HelperText>Shows no trail, a swing-style path, or a straight path using the stored trajectory points.</HelperText> : null}
          <select
            value={value.trajectoryMode}
            onChange={(event) => applyPartial({ trajectoryMode: event.target.value as AdvancedOverlayConfig['trajectoryMode'] })}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          >
            {TRAJECTORY_MODES.map((trajectoryMode) => (
              <option key={trajectoryMode} value={trajectoryMode}>
                {trajectoryMode}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={value.prioritizeBall}
              onChange={(event) => applyPartial({ prioritizeBall: event.target.checked })}
            />
            Prioritize ball
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={value.showLabels}
              onChange={(event) => applyPartial({ showLabels: event.target.checked })}
            />
            Show labels
          </label>
          {showHelperText ? <HelperText>These toggles only affect the overlay display and label rendering, not the browser pose scan itself.</HelperText> : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <label className="flex flex-col gap-2 text-xs text-slate-300">
          Trajectory Depth: {value.trajectoryPoints}
          {showHelperText ? <HelperText>Controls how many trajectory points remain visible after the scan completes.</HelperText> : null}
          <input
            type="range"
            min="5"
            max="60"
            step="1"
            value={value.trajectoryPoints}
            onChange={(event) => applyPartial({ trajectoryPoints: Number(event.target.value) })}
          />
        </label>

        <label className="flex flex-col gap-2 text-xs text-slate-300">
          Line Width: {value.lineWidth}
          {showHelperText ? <HelperText>Changes the thickness of skeleton lines, boxes, and trajectory strokes in the overlay.</HelperText> : null}
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={value.lineWidth}
            onChange={(event) => applyPartial({ lineWidth: Number(event.target.value) })}
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
        <label className="flex flex-col gap-2 text-xs text-slate-300">
          Ball Threshold: {value.objectDetectionThreshold.ball.toFixed(2)}
          {showHelperText ? <HelperText>Used when box detections exist; Browser Lab pose-only scans do not currently draw ball boxes.</HelperText> : null}
          <input
            type="range"
            min="0.1"
            max="0.95"
            step="0.05"
            value={value.objectDetectionThreshold.ball}
            onChange={(event) => handleThresholdChange('ball', Number(event.target.value))}
          />
        </label>
        <label className="flex flex-col gap-2 text-xs text-slate-300">
          Bat Threshold: {value.objectDetectionThreshold.bat.toFixed(2)}
          {showHelperText ? <HelperText>Used for bat box filtering where detections exist; current Browser Lab visuals are mostly skeleton and wrist-path based.</HelperText> : null}
          <input
            type="range"
            min="0.1"
            max="0.95"
            step="0.05"
            value={value.objectDetectionThreshold.bat}
            onChange={(event) => handleThresholdChange('bat', Number(event.target.value))}
          />
        </label>
        <label className="flex flex-col gap-2 text-xs text-slate-300">
          Player Threshold: {value.objectDetectionThreshold.player.toFixed(2)}
          {showHelperText ? <HelperText>Used for player box filtering when detections exist; it does not alter the MediaPipe pose model confidence settings.</HelperText> : null}
          <input
            type="range"
            min="0.1"
            max="0.95"
            step="0.05"
            value={value.objectDetectionThreshold.player}
            onChange={(event) => handleThresholdChange('player', Number(event.target.value))}
          />
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-200">Batting Keypoints</p>
          {showHelperText ? <HelperText>Selects which batting-related pose labels remain visible in the overlay after scan.</HelperText> : null}
          <div className="flex flex-wrap gap-2">
            {BATTING_ENTITY_OPTIONS.map((entity) =>
              renderEntityToggle(entity, value.trackBattingPoints.includes(entity), () =>
                applyPartial({
                  trackBattingPoints: toggleEntity(value.trackBattingPoints, entity),
                })
              )
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-200">Bowling Keypoints</p>
          {showHelperText ? <HelperText>Selects which bowling-related pose labels remain visible in the overlay after scan.</HelperText> : null}
          <div className="flex flex-wrap gap-2">
            {BOWLING_ENTITY_OPTIONS.map((entity) =>
              renderEntityToggle(entity, value.trackBowlingPoints.includes(entity), () =>
                applyPartial({
                  trackBowlingPoints: toggleEntity(value.trackBowlingPoints, entity),
                })
              )
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          Entity Color
          {showHelperText ? <HelperText>Sets the skeleton and point color for the selected pose entities.</HelperText> : null}
          <input
            type="color"
            value={value.entityColor}
            onChange={(event) => applyPartial({ entityColor: event.target.value })}
            className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          Trajectory Color
          {showHelperText ? <HelperText>Sets the color used for the displayed wrist or motion trajectory path.</HelperText> : null}
          <input
            type="color"
            value={value.trajectoryColor}
            onChange={(event) => applyPartial({ trajectoryColor: event.target.value })}
            className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1"
          />
        </label>
      </div>
    </section>
  );
}