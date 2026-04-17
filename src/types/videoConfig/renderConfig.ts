/**
 * Video Render Precision Configuration
 * Handles sub-pixel precision, aspect ratio fitting, and coordinate rounding
 * Trimmed from old videoConfig.ts - precision/snapping only
 */

/**
 * Configuration for video overlay rendering precision
 */
export interface VideoRenderPrecisionConfig {
  /** 
   * Threshold below which a video is considered "small"
   * Small videos get sub-pixel precision handling
   * Default: 200,000 pixels (e.g., 1280x169 or lower)
   */
  smallVideoPixelThreshold: number;
  
  /**
   * Minimum number of pixels per landmark on small videos
   * Lower values = higher precision (more decimal places)
   * Default: 1.5 for very small videos, 3.0 for larger ones
   */
  minPixelsPerLandmarkSmall: number;
  
  /**
   * Minimum number of pixels per landmark on regular videos
   * Default: 3.0
   */
  minPixelsPerLandmarkRegular: number;

  /**
   * Tolerance for aspect ratio mismatch
   * If overlay aspect ratio differs from video aspect ratio
   * by more than this threshold, enable auto-fit
   * Default: 0.02 (2%)
   */
  aspectRatioMismatchTolerance: number;

  /**
   * Enable/disable automatic aspect ratio fitting for small videos
   * Default: true for small videos, false for large ones
   */
  autoFitSmallVideoAspectRatio: boolean;

  /**
   * Maximum allowed overlay scaling (to prevent extreme zoom)
   * Default: 1.5x
   */
  maxOverlayScale: number;

  /**
   * Smoothness factor for position interpolation
   * 0 = no smoothing, 1 = full smoothing
   * Default: 0.2 (subtle smoothing)
   */
  positionSmoothFactor: number;

  /**
   * Number of interpolation steps for position smoothing
   * Default: 3 steps for each frame change
   */
  interpolationSteps: number;

  /**
   * Enable/disable rounding for regular-sized videos
   * true = round to nearest pixel
   * false = use sub-pixel precision
   * Default: true for videos >= smallVideoPixelThreshold
   */
  roundCoordinatesRegularVideos: boolean;

  /**
   * Enable/disable rounding for small videos
   * Default: false (use sub-pixel precision)
   */
  roundCoordinatesSmallVideos: boolean;

  /**
   * Minimum container size before enabling advanced precision
   * Default: 300 pixels (width or height)
   */
  advancedPrecisionMinContainerSize: number;

  /**
   * Precision multiplier for very small containers
   * Higher multiplier = more decimal precision
   * Default: 10 (for sub-pixel)
   */
  precisionMultiplierSmall: number;

  /**
   * Precision multiplier for regular containers
   * Default: 1 (for pixel-accurate)
   */
  precisionMultiplierRegular: number;

  /**
   * Whether to log configuration changes
   * Default: false
   */
  debugLogging: boolean;
}

/**
 * Default configuration values
 */
export const DEFAULT_VIDEO_RENDER_PRECISION_CONFIG: VideoRenderPrecisionConfig = {
  smallVideoPixelThreshold: 200000, // ~448p resolution
  minPixelsPerLandmarkSmall: 1.5,
  minPixelsPerLandmarkRegular: 3.0,
  aspectRatioMismatchTolerance: 0.02,
  autoFitSmallVideoAspectRatio: true,
  maxOverlayScale: 1.5,
  positionSmoothFactor: 0.2,
  interpolationSteps: 3,
  roundCoordinatesRegularVideos: true,
  roundCoordinatesSmallVideos: false,
  advancedPrecisionMinContainerSize: 300,
  precisionMultiplierSmall: 10,
  precisionMultiplierRegular: 1,
  debugLogging: false,
};

/**
 * Get current config (merged with defaults)
 * @param customConfig - Runtime configuration (optional)
 * @returns Current configuration object
 */
export function getVideoRenderPrecisionConfig(
  customConfig?: Partial<VideoRenderPrecisionConfig>
): VideoRenderPrecisionConfig {
  return {
    ...DEFAULT_VIDEO_RENDER_PRECISION_CONFIG,
    ...customConfig,
  };
}

/**
 * Update configuration values
 * @param config - Configuration values to update
 * @returns New configuration object
 */
export function updateVideoRenderPrecisionConfig(
  config: Partial<VideoRenderPrecisionConfig>
): VideoRenderPrecisionConfig {
  const newConfig = {
    ...DEFAULT_VIDEO_RENDER_PRECISION_CONFIG,
    ...config,
  };

  if (config.debugLogging) {
    console.log('[VideoRenderPrecisionConfig] Updated:', config);
  }

  return newConfig;
}

/**
 * Check if video should use sub-pixel precision
 * @param videoWidth - Video width in pixels
 * @param videoHeight - Video height in pixels
 * @returns true if sub-pixel precision should be used
 */
export function shouldUseSubPixelPrecision(
  videoWidth: number,
  videoHeight: number
): boolean {
  const config = getVideoRenderPrecisionConfig();
  const totalPixels = videoWidth * videoHeight;
  return totalPixels < config.smallVideoPixelThreshold;
}

/**
 * Calculate precision multiplier based on video/container sizes
 * @param containerWidth - Overlay container width
 * @param containerHeight - Overlay container height
 * @returns Precision multiplier to use
 */
export function getPrecisionMultiplier(
  containerWidth: number,
  containerHeight: number
): number {
  const config = getVideoRenderPrecisionConfig();
  const minDim = Math.min(containerWidth, containerHeight);
  
  if (minDim < config.advancedPrecisionMinContainerSize) {
    return config.precisionMultiplierSmall;
  }
  
  return config.precisionMultiplierRegular;
}

/**
 * Check if aspect ratios match within tolerance
 * @param overlayAspectRatio - Overlay (container) aspect ratio
 * @param videoAspectRatio - Video aspect ratio
 * @param tolerance - Allowed tolerance (default from config)
 * @returns true if aspect ratios match within tolerance
 */
export function aspectRatiosMatch(
  overlayAspectRatio: number,
  videoAspectRatio: number,
  tolerance?: number
): boolean {
  const config = getVideoRenderPrecisionConfig();
  const actualTolerance = tolerance ?? config.aspectRatioMismatchTolerance;
  const diff = Math.abs(overlayAspectRatio - videoAspectRatio);
  return diff <= actualTolerance;
}

/**
 * Check if overlay should be auto-fit to container
 * @param containerWidth - Container width
 * @param containerHeight - Container height
 * @param videoWidth - Video width
 * @param videoHeight - Video height
 * @returns true if auto-fit should be enabled
 */
export function shouldAutoFitOverlay(
  _containerWidth: number,
  _containerHeight: number,
  videoWidth: number,
  videoHeight: number
): boolean {
  const config = getVideoRenderPrecisionConfig();
  const videoIsSmall = shouldUseSubPixelPrecision(videoWidth, videoHeight);
  
  return videoIsSmall && config.autoFitSmallVideoAspectRatio;
}

/**
 * Export default config as JSON
 */
export function exportDefaultConfig(): VideoRenderPrecisionConfig {
  return { ...DEFAULT_VIDEO_RENDER_PRECISION_CONFIG };
}
