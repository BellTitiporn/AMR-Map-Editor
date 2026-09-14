import type { Point2D } from '../models';

export const DEFAULT_DRAW_ENDPOINT_SNAP_DISTANCE_M = 0.25;
export const ENDPOINT_DEDUPE_EPSILON_M = 1e-5;

export interface EndpointSnapCandidate {
  point: Point2D;
  sourceId: string;
  sourceKind: 'path' | 'wall' | 'object';
  endpoint: 'start' | 'end' | 'point';
  label?: string;
}

export interface EndpointSnapResult {
  point: Point2D;
  candidate: EndpointSnapCandidate | null;
  distance: number;
}

const pointDistance = (a: Point2D, b: Point2D) => Math.hypot(a.x - b.x, a.y - b.y);

export function dedupeEndpointCandidates(
  candidates: EndpointSnapCandidate[],
  epsilon = ENDPOINT_DEDUPE_EPSILON_M,
): EndpointSnapCandidate[] {
  const unique: EndpointSnapCandidate[] = [];
  for (const candidate of candidates) {
    if (!unique.some(item => pointDistance(item.point, candidate.point) <= epsilon)) {
      unique.push(candidate);
    }
  }
  return unique;
}

export function snapPointToEndpointCandidates(
  point: Point2D,
  candidates: EndpointSnapCandidate[],
  maxDistance = DEFAULT_DRAW_ENDPOINT_SNAP_DISTANCE_M,
): EndpointSnapResult {
  let nearest: EndpointSnapCandidate | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const distance = pointDistance(point, candidate.point);
    if (distance <= maxDistance && distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }

  return nearest
    ? { point: { ...nearest.point }, candidate: nearest, distance: nearestDistance }
    : { point: { ...point }, candidate: null, distance: Number.POSITIVE_INFINITY };
}
