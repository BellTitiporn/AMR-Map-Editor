import type { Point2D } from '../models';

export type WallResizeAnchor = 'start' | 'end' | 'center';

export function wallLength(start: Point2D, end: Point2D): number {
  return Math.hypot(end.x - start.x, end.y - start.y);
}

export function wallAngleRadians(start: Point2D, end: Point2D): number {
  return Math.atan2(end.y - start.y, end.x - start.x);
}

export function wallAngleDegrees(start: Point2D, end: Point2D): number {
  return wallAngleRadians(start, end) * 180 / Math.PI;
}

export function resizeWall(
  start: Point2D,
  end: Point2D,
  length: number,
  angleDegrees: number,
  anchor: WallResizeAnchor = 'start',
): { start: Point2D; end: Point2D } {
  const safeLength = Math.max(0, length);
  const angle = angleDegrees * Math.PI / 180;
  const dx = Math.cos(angle) * safeLength;
  const dy = Math.sin(angle) * safeLength;

  if (anchor === 'end') {
    return {
      start: { x: end.x - dx, y: end.y - dy },
      end: { ...end },
    };
  }

  if (anchor === 'center') {
    const cx = (start.x + end.x) / 2;
    const cy = (start.y + end.y) / 2;
    return {
      start: { x: cx - dx / 2, y: cy - dy / 2 },
      end: { x: cx + dx / 2, y: cy + dy / 2 },
    };
  }

  return {
    start: { ...start },
    end: { x: start.x + dx, y: start.y + dy },
  };
}
