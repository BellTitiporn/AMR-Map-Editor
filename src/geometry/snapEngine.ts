import type { BuildingWall, NavigationObject, NavigationPath, Point2D } from '../models';
import { closestPointOnSegment, DEFAULT_PATH_SNAP_DISTANCE_M } from './pathTopology';

export type SnapKind = 'object' | 'path_vertex' | 'path_segment' | 'wall_endpoint' | 'wall_segment';

export interface SnapTarget {
  kind: SnapKind;
  point: Point2D;
  distance: number;
  label: string;
  targetId: string;
  endpoint?: 'start' | 'end';
  segmentIndex?: number;
}

export interface SnapSources {
  objects?: NavigationObject[];
  paths?: NavigationPath[];
  walls?: BuildingWall[];
}

export interface SnapOptions {
  maxDistance?: number;
  kinds?: SnapKind[];
  excludeWall?: { wallId: string; endpoint?: 'start' | 'end' };
  wallId?: string;
}

const distance = (a: Point2D, b: Point2D) => Math.hypot(a.x - b.x, a.y - b.y);
const priority: Record<SnapKind, number> = {
  object: 0,
  wall_endpoint: 1,
  path_vertex: 2,
  wall_segment: 3,
  path_segment: 4,
};

export function findSnapTarget(
  point: Point2D,
  sources: SnapSources,
  options: SnapOptions = {},
): SnapTarget | null {
  const maxDistance = options.maxDistance ?? DEFAULT_PATH_SNAP_DISTANCE_M;
  const allowed = new Set<SnapKind>(options.kinds ?? ['object', 'path_vertex', 'path_segment', 'wall_endpoint', 'wall_segment']);
  const candidates: SnapTarget[] = [];

  if (allowed.has('object')) {
    for (const object of sources.objects ?? []) {
      if (!object.enabled) continue;
      const target = { x: object.x, y: object.y };
      const d = distance(point, target);
      if (d <= maxDistance) candidates.push({ kind: 'object', point: target, distance: d, label: object.name, targetId: object.id });
    }
  }

  for (const path of sources.paths ?? []) {
    if (!path.enabled) continue;
    if (allowed.has('path_vertex')) {
      path.points.forEach((vertex, index) => {
        const d = distance(point, vertex);
        if (d <= maxDistance) candidates.push({
          kind: 'path_vertex', point: { ...vertex }, distance: d,
          label: `${path.name} • P${index + 1}`, targetId: path.id, segmentIndex: index,
        });
      });
    }
    if (allowed.has('path_segment')) {
      for (let i = 0; i < path.points.length - 1; i += 1) {
        const segmentStart = path.points[i];
        const segmentEnd = path.points[i + 1];
        const projected = closestPointOnSegment(point, segmentStart, segmentEnd);

        // A nearby real path vertex must win over a projected segment point.
        // Otherwise snapping close to an endpoint can create two almost-overlapping
        // junction vertices.
        if (distance(point, segmentStart) <= maxDistance || distance(point, segmentEnd) <= maxDistance) continue;
        if (projected.t <= 1e-6 || projected.t >= 1 - 1e-6) continue;

        if (projected.distance <= maxDistance) candidates.push({
          kind: 'path_segment', point: projected.point, distance: projected.distance,
          label: `${path.name} • segment`, targetId: path.id, segmentIndex: i,
        });
      }
    }
  }

  for (const wall of sources.walls ?? []) {
    if (!wall.enabled || (options.wallId && wall.id !== options.wallId)) continue;
    if (allowed.has('wall_endpoint')) {
      for (const endpoint of ['start', 'end'] as const) {
        const excluded = options.excludeWall?.wallId === wall.id &&
          (!options.excludeWall.endpoint || options.excludeWall.endpoint === endpoint);
        if (excluded) continue;
        const target = wall[endpoint];
        const d = distance(point, target);
        if (d <= maxDistance) candidates.push({
          kind: 'wall_endpoint', point: { ...target }, distance: d,
          label: `${wall.name || wall.id} • ${endpoint.toUpperCase()}`,
          targetId: wall.id, endpoint,
        });
      }
    }
    if (allowed.has('wall_segment')) {
      const projected = closestPointOnSegment(point, wall.start, wall.end);
      if (projected.distance <= maxDistance) candidates.push({
        kind: 'wall_segment', point: projected.point, distance: projected.distance,
        label: `${wall.name || wall.id} • WALL`, targetId: wall.id,
      });
    }
  }

  candidates.sort((a, b) => Math.abs(a.distance - b.distance) > 1e-9
    ? a.distance - b.distance
    : priority[a.kind] - priority[b.kind]);
  return candidates[0] ?? null;
}

export function findPathDrawSnap(point: Point2D, objects: NavigationObject[], paths: NavigationPath[], maxDistance = DEFAULT_PATH_SNAP_DISTANCE_M) {
  return findSnapTarget(point, { objects, paths }, { maxDistance, kinds: ['object', 'path_vertex', 'path_segment'] });
}

export function findWallEndpointSnap(point: Point2D, walls: BuildingWall[], options: SnapOptions = {}) {
  return findSnapTarget(point, { walls }, { ...options, kinds: ['wall_endpoint'] });
}

/** Snap a door point onto a wall line. Endpoints win over wall segments. */
export function findDoorWallSnap(point: Point2D, walls: BuildingWall[], options: SnapOptions = {}) {
  return findSnapTarget(point, { walls }, { ...options, kinds: ['wall_endpoint', 'wall_segment'] });
}

/** Project to one specific wall; used to keep both door endpoints collinear. */
export function projectToWall(point: Point2D, wall: BuildingWall): Point2D {
  return closestPointOnSegment(point, wall.start, wall.end).point;
}
