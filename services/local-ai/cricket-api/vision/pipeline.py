"""Ultralytics YOLO11 pose + detection inference with MPS/CPU device selection."""

from __future__ import annotations

import logging
import os
from collections import deque
from dataclasses import dataclass, field
from typing import Any

import numpy as np

from vision.coco_keypoints import COCO_KEYPOINT_NAMES, COCO_SPORTS_BALL_CLASS_ID

logger = logging.getLogger(__name__)


def resolve_device() -> str:
    """Prefer MPS on Apple Silicon, then CUDA, else CPU."""
    force = os.environ.get("CRICKET_DEVICE", "").strip().lower()
    if force in ("mps", "cuda", "cpu"):
        return force
    try:
        import torch

        if torch.backends.mps.is_available():
            return "mps"
        if torch.cuda.is_available():
            return "cuda"
    except Exception:
        pass
    logger.warning("MPS/CUDA not available; using CPU for YOLO")
    return "cpu"


@dataclass
class InferenceResult:
    bounding_boxes: list[dict[str, Any]] = field(default_factory=list)
    keypoints: list[dict[str, Any]] = field(default_factory=list)
    ball_center: tuple[float, float] | None = None
    ball_confidence: float = 0.0
    bowler_wrist_y: float | None = None
    num_persons: int = 0


class VisionPipeline:
    """Loads pose + detect models once; runs synchronous inference (call from thread pool)."""

    def __init__(
        self,
        pose_model: str | None = None,
        detect_model: str | None = None,
        ball_conf_threshold: float | None = None,
        person_conf_threshold: float | None = None,
    ) -> None:
        from ultralytics import YOLO

        self._device = resolve_device()
        pose_model = pose_model or os.environ.get("CRICKET_POSE_MODEL", "yolo11n-pose.pt")
        detect_model = detect_model or os.environ.get("CRICKET_DETECT_MODEL", "yolo11n.pt")
        self._ball_conf = ball_conf_threshold or float(os.environ.get("CRICKET_BALL_CONF", "0.25"))
        self._person_conf = person_conf_threshold or float(os.environ.get("CRICKET_PERSON_CONF", "0.35"))
        self._bowler_on_left = os.environ.get("CRICKET_BOWLER_ON_LEFT", "true").lower() in (
            "1",
            "true",
            "yes",
        )

        logger.info("Loading YOLO pose model %s on %s", pose_model, self._device)
        self._pose = YOLO(pose_model)
        logger.info("Loading YOLO detect model %s on %s", detect_model, self._device)
        self._detect = YOLO(detect_model)

    @property
    def device(self) -> str:
        return self._device

    def infer(self, frame_bgr: np.ndarray, frame_width: int, frame_height: int) -> InferenceResult:
        """Run pose + ball detection on one BGR frame."""
        out = InferenceResult()

        pose_res = self._pose.predict(
            source=frame_bgr,
            device=self._device,
            verbose=False,
            conf=self._person_conf,
        )
        det_res = self._detect.predict(
            source=frame_bgr,
            device=self._device,
            verbose=False,
            conf=self._ball_conf,
        )

        mid_x = frame_width / 2.0
        persons: list[tuple[float, int, Any]] = []

        if pose_res and pose_res[0].keypoints is not None and pose_res[0].boxes is not None:
            boxes = pose_res[0].boxes
            kpts = pose_res[0].keypoints
            xy = kpts.xy.cpu().numpy() if hasattr(kpts.xy, "cpu") else kpts.xy.numpy()
            conf = kpts.conf
            conf_np = conf.cpu().numpy() if conf is not None and hasattr(conf, "cpu") else None

            for i in range(len(boxes)):
                box = boxes[i]
                xyxy = box.xyxy[0].cpu().numpy()
                x1, y1, x2, y2 = map(float, xyxy)
                w, h = x2 - x1, y2 - y1
                area = w * h
                cx = (x1 + x2) / 2.0
                persons.append((area, i, (cx, x1, y1, x2, y2)))

            persons.sort(key=lambda x: -x[0])
            role_by_index: dict[int, str] = {}

            if len(persons) >= 2:
                (_, i0, (cx0, _, _, _, _)) = persons[0]
                (_, i1, (cx1, _, _, _, _)) = persons[1]
                left_idx = i0 if cx0 < cx1 else i1
                right_idx = i1 if cx0 < cx1 else i0
                if self._bowler_on_left:
                    role_by_index[left_idx] = "Bowler"
                    role_by_index[right_idx] = "Batsman"
                else:
                    role_by_index[right_idx] = "Bowler"
                    role_by_index[left_idx] = "Batsman"
            elif len(persons) == 1:
                (_, idx, (cx, _, _, _, _)) = persons[0]
                on_bowler = (cx < mid_x) if self._bowler_on_left else (cx >= mid_x)
                role_by_index[idx] = "Bowler" if on_bowler else "Batsman"

            out.num_persons = len(persons)

            for rank, (_, i, (_, x1, y1, x2, y2)) in enumerate(persons):
                role = role_by_index.get(i, "Batsman" if rank else "Bowler")
                out.bounding_boxes.append(
                    {
                        "x": float(x1),
                        "y": float(y1),
                        "w": float(x2 - x1),
                        "h": float(y2 - y1),
                        "label": role,
                        "confidence": float(boxes[i].conf[0].item()),
                    }
                )
                if i < xy.shape[0]:
                    kconf_row = conf_np[i] if conf_np is not None else None
                    for ki in range(xy.shape[1]):
                        kx, ky = float(xy[i, ki, 0]), float(xy[i, ki, 1])
                        if kconf_row is not None and ki < len(kconf_row) and float(kconf_row[ki]) < 0.25:
                            continue
                        name = COCO_KEYPOINT_NAMES[ki] if ki < len(COCO_KEYPOINT_NAMES) else f"kpt_{ki}"
                        out.keypoints.append(
                            {
                                "x": kx,
                                "y": ky,
                                "label": name,
                                "person_id": i,
                                "role": role,
                            }
                        )
                        if role == "Bowler" and name == "right_wrist":
                            out.bowler_wrist_y = ky
                        elif role == "Bowler" and name == "left_wrist" and out.bowler_wrist_y is None:
                            out.bowler_wrist_y = ky

        if det_res and det_res[0].boxes is not None:
            dboxes = det_res[0].boxes
            best_conf = -1.0
            best_center: tuple[float, float] | None = None
            best_box: tuple[float, float, float, float] | None = None
            for j in range(len(dboxes)):
                cls_id = int(dboxes.cls[j].item())
                if cls_id != COCO_SPORTS_BALL_CLASS_ID:
                    continue
                c = float(dboxes.conf[j].item())
                if c < best_conf:
                    continue
                xyxy = dboxes.xyxy[j].cpu().numpy()
                bx1, by1, bx2, by2 = map(float, xyxy)
                best_conf = c
                best_center = ((bx1 + bx2) / 2.0, (by1 + by2) / 2.0)
                best_box = (bx1, by1, bx2, by2)
            if best_box is not None and best_center is not None:
                bx1, by1, bx2, by2 = best_box
                out.bounding_boxes.append(
                    {
                        "x": bx1,
                        "y": by1,
                        "w": bx2 - bx1,
                        "h": by2 - by1,
                        "label": "Ball",
                        "confidence": float(best_conf),
                    }
                )
            out.ball_center = best_center
            out.ball_confidence = float(best_conf) if best_conf >= 0 else 0.0

        return out


def make_trajectory_deque() -> deque[dict[str, float]]:
    maxlen = int(os.environ.get("CRICKET_TRAJECTORY_LEN", "20"))
    return deque(maxlen=maxlen)
