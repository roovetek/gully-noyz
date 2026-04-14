import { useEffect, useRef } from 'react';
import type { BoundingBox, SkeletonKeypoint, TrajectoryPoint } from './types';

interface VideoOverlayProps {
  boundingBoxes: BoundingBox[];
  skeletonKeypoints: SkeletonKeypoint[];
  trajectoryPoints: TrajectoryPoint[];
  width: number;
  height: number;
  mode?: 'simplified' | 'advanced';
}

const SKELETON_CONNECTIONS: [string, string][] = [
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
];

const LABEL_COLORS: Record<string, string> = {
  batsman: '#34d399',
  bowler: '#60a5fa',
  ball: '#fbbf24',
  fielder: '#f87171',
  umpire: '#a78bfa',
};

function getLabelColor(label: string): string {
  const lower = label.toLowerCase();
  for (const key of Object.keys(LABEL_COLORS)) {
    if (lower.includes(key)) return LABEL_COLORS[key];
  }
  return '#94a3b8';
}

export function VideoOverlay({
  boundingBoxes,
  skeletonKeypoints,
  trajectoryPoints,
  width,
  height,
  mode = 'simplified',
}: VideoOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    const boxesToDraw =
      mode === 'simplified'
        ? boundingBoxes.filter((b) => {
            const label = b.label.toLowerCase();
            return label.includes('ball') || label.includes('batsman') || label.includes('bowler');
          })
        : boundingBoxes;

    for (const box of boxesToDraw) {
      const color = getLabelColor(box.label);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.strokeRect(box.x, box.y, box.w, box.h);
      ctx.shadowBlur = 0;

      if (mode === 'advanced') {
        const alpha = Math.round(box.confidence * 255)
          .toString(16)
          .padStart(2, '0');
        ctx.fillStyle = `${color}${alpha}`;
        ctx.fillRect(box.x, box.y - 22, box.w, 22);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`${box.label} ${Math.round(box.confidence * 100)}%`, box.x + 4, box.y - 6);
      }
    }

    if (mode === 'advanced' && skeletonKeypoints.length > 0) {
      const keypointMap = new Map<string, SkeletonKeypoint>();
      for (const kp of skeletonKeypoints) {
        keypointMap.set(kp.label, kp);
      }

      ctx.strokeStyle = '#34d39980';
      ctx.lineWidth = 2;
      for (const [a, b] of SKELETON_CONNECTIONS) {
        const kpA = keypointMap.get(a);
        const kpB = keypointMap.get(b);
        if (kpA && kpB) {
          ctx.beginPath();
          ctx.moveTo(kpA.x, kpA.y);
          ctx.lineTo(kpB.x, kpB.y);
          ctx.stroke();
        }
      }

      for (const kp of skeletonKeypoints) {
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#34d399';
        ctx.shadowColor = '#34d399';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    if (trajectoryPoints.length > 1) {
      const sorted = [...trajectoryPoints].sort((a, b) => a.t - b.t);
      ctx.beginPath();
      ctx.moveTo(sorted[0].x, sorted[0].y);
      for (let i = 1; i < sorted.length; i += 1) {
        ctx.lineTo(sorted[i].x, sorted[i].y);
      }
      ctx.strokeStyle = mode === 'advanced' ? '#fbbf24' : '#fde047';
      ctx.lineWidth = mode === 'advanced' ? 2 : 3;
      ctx.setLineDash(mode === 'advanced' ? [6, 4] : []);
      ctx.shadowColor = mode === 'advanced' ? '#fbbf24' : '#fde047';
      ctx.shadowBlur = mode === 'advanced' ? 10 : 14;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      const last = sorted[sorted.length - 1];
      ctx.beginPath();
      ctx.arc(last.x, last.y, mode === 'advanced' ? 5 : 6, 0, Math.PI * 2);
      ctx.fillStyle = mode === 'advanced' ? '#fbbf24' : '#fde047';
      ctx.shadowColor = mode === 'advanced' ? '#fbbf24' : '#fde047';
      ctx.shadowBlur = mode === 'advanced' ? 12 : 18;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }, [boundingBoxes, mode, skeletonKeypoints, trajectoryPoints, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );
}
