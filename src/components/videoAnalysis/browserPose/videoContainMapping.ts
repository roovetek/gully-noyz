/** `object-contain` mapping from normalized video coords to overlay pixel coords. */
export function normalizedToContainerPx(
  nx: number,
  ny: number,
  containerW: number,
  containerH: number,
  videoW: number,
  videoH: number
): { x: number; y: number } {
  if (!videoW || !videoH) return { x: nx * containerW, y: ny * containerH };
  const scale = Math.min(containerW / videoW, containerH / videoH);
  const dw = videoW * scale;
  const dh = videoH * scale;
  const ox = (containerW - dw) / 2;
  const oy = (containerH - dh) / 2;
  return { x: ox + nx * dw, y: oy + ny * dh };
}

export function mapSkeletonToDisplay(
  keypointsNorm: Array<{ x: number; y: number; label: string }>,
  containerW: number,
  containerH: number,
  videoW: number,
  videoH: number
): Array<{ x: number; y: number; label: string }> {
  return keypointsNorm.map((k) => ({
    label: k.label,
    ...normalizedToContainerPx(k.x, k.y, containerW, containerH, videoW, videoH),
  }));
}
