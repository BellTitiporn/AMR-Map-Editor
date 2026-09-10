import type { NavigationObject, NavigationPath, Point2D } from '../models';

export const PATH_CONNECT_EPSILON_M = 1e-4;
export const DEFAULT_PATH_SNAP_DISTANCE_M = 0.25;

export type PathEndpoint = 'start' | 'end';

export type SnapCandidate =
  | { kind: 'object'; targetId: string; targetName: string; point: Point2D; distance: number }
  | { kind: 'path_vertex'; targetId: string; targetName: string; point: Point2D; distance: number; vertexIndex: number }
  | { kind: 'path_segment'; targetId: string; targetName: string; point: Point2D; distance: number; segmentIndex: number };

export interface EndpointConnectionStatus {
  connected: boolean;
  labels: string[];
}

export interface ConnectEndpointResult {
  paths: NavigationPath[];
  candidate: SnapCandidate | null;
}

export interface MergeCandidate {
  pathId: string;
  pathName: string;
  selectedEndpoint: PathEndpoint;
  otherEndpoint: PathEndpoint;
  distance: number;
  compatible: boolean;
  reason?: string;
}

export interface MergeResult {
  paths: NavigationPath[];
  removedPathId: string;
  mergedPathId: string;
  candidate: MergeCandidate;
}

const dist = (a: Point2D, b: Point2D) => Math.hypot(a.x - b.x, a.y - b.y);

function endpointIndex(path: NavigationPath, endpoint: PathEndpoint): number {
  return endpoint === 'start' ? 0 : path.points.length - 1;
}

function endpointPoint(path: NavigationPath, endpoint: PathEndpoint): Point2D {
  return path.points[endpointIndex(path, endpoint)];
}

export function closestPointOnSegment(point: Point2D, a: Point2D, b: Point2D): { point: Point2D; t: number; distance: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 <= Number.EPSILON) return { point: { ...a }, t: 0, distance: dist(point, a) };
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / len2));
  const projected = { x: a.x + dx * t, y: a.y + dy * t };
  return { point: projected, t, distance: dist(point, projected) };
}

export function findNearestSnapCandidate(
  paths: NavigationPath[],
  objects: NavigationObject[],
  pathId: string,
  endpoint: PathEndpoint,
  maxDistance = DEFAULT_PATH_SNAP_DISTANCE_M,
): SnapCandidate | null {
  const path = paths.find(item => item.id === pathId);
  if (!path || path.points.length < 2) return null;
  const source = endpointPoint(path, endpoint);
  const candidates: SnapCandidate[] = [];

  for (const object of objects) {
    const point = { x: object.x, y: object.y };
    const distance = dist(source, point);
    if (distance <= maxDistance) candidates.push({ kind: 'object', targetId: object.id, targetName: object.name, point, distance });
  }

  for (const other of paths) {
    if (other.id === pathId || other.points.length === 0) continue;
    other.points.forEach((point, vertexIndex) => {
      const distance = dist(source, point);
      if (distance <= maxDistance) candidates.push({ kind: 'path_vertex', targetId: other.id, targetName: other.name, point: { ...point }, distance, vertexIndex });
    });

    for (let segmentIndex = 0; segmentIndex < other.points.length - 1; segmentIndex += 1) {
      const projected = closestPointOnSegment(source, other.points[segmentIndex], other.points[segmentIndex + 1]);
      // Endpoint/vertex candidates are preferred over segment candidates when the projection is effectively at a vertex.
      if (projected.t <= 1e-6 || projected.t >= 1 - 1e-6) continue;
      if (projected.distance <= maxDistance) {
        candidates.push({
          kind: 'path_segment',
          targetId: other.id,
          targetName: other.name,
          point: projected.point,
          distance: projected.distance,
          segmentIndex,
        });
      }
    }
  }

  candidates.sort((a, b) => {
    const distanceDiff = a.distance - b.distance;
    if (Math.abs(distanceDiff) > 1e-9) return distanceDiff;
    const priority = { object: 0, path_vertex: 1, path_segment: 2 } as const;
    return priority[a.kind] - priority[b.kind];
  });
  return candidates[0] ?? null;
}

export function connectPathEndpoint(
  paths: NavigationPath[],
  objects: NavigationObject[],
  pathId: string,
  endpoint: PathEndpoint,
  maxDistance = DEFAULT_PATH_SNAP_DISTANCE_M,
): ConnectEndpointResult {
  const candidate = findNearestSnapCandidate(paths, objects, pathId, endpoint, maxDistance);
  if (!candidate) return { paths, candidate: null };

  const next = paths.map(path => ({ ...path, points: path.points.map(point => ({ ...point })) }));
  const sourcePath = next.find(path => path.id === pathId);
  if (!sourcePath) return { paths, candidate: null };
  sourcePath.points[endpointIndex(sourcePath, endpoint)] = { ...candidate.point };

  if (candidate.kind === 'path_segment') {
    const target = next.find(path => path.id === candidate.targetId);
    if (target) {
      const alreadyVertex = target.points.some(point => dist(point, candidate.point) <= PATH_CONNECT_EPSILON_M);
      if (!alreadyVertex) target.points.splice(candidate.segmentIndex + 1, 0, { ...candidate.point });
    }
  }

  return { paths: next, candidate };
}

export function endpointConnectionStatus(
  paths: NavigationPath[],
  objects: NavigationObject[],
  pathId: string,
  endpoint: PathEndpoint,
  epsilon = PATH_CONNECT_EPSILON_M,
): EndpointConnectionStatus {
  const path = paths.find(item => item.id === pathId);
  if (!path || path.points.length < 2) return { connected: false, labels: [] };
  const source = endpointPoint(path, endpoint);
  const labels: string[] = [];

  for (const object of objects) {
    if (dist(source, { x: object.x, y: object.y }) <= epsilon) labels.push(object.name);
  }
  for (const other of paths) {
    if (other.id === pathId) continue;
    if (other.points.some(point => dist(source, point) <= epsilon)) labels.push(other.name);
  }

  return { connected: labels.length > 0, labels: [...new Set(labels)] };
}

export function collectPathJunctions(paths: NavigationPath[], objects: NavigationObject[], epsilon = PATH_CONNECT_EPSILON_M): Array<Point2D & { labels: string[] }> {
  const junctions: Array<Point2D & { labels: string[] }> = [];
  const add = (point: Point2D, label: string) => {
    const existing = junctions.find(item => dist(item, point) <= epsilon);
    if (existing) {
      if (!existing.labels.includes(label)) existing.labels.push(label);
    } else junctions.push({ ...point, labels: [label] });
  };

  for (const path of paths) {
    for (const point of path.points) add(point, path.name);
  }
  for (const object of objects) add({ x: object.x, y: object.y }, object.name);

  return junctions.filter(item => {
    const pathLabels = paths.filter(path => path.points.some(point => dist(point, item) <= epsilon)).map(path => path.name);
    const objectLabels = objects.filter(object => dist({ x: object.x, y: object.y }, item) <= epsilon).map(object => object.name);
    return new Set([...pathLabels, ...objectLabels]).size >= 2;
  });
}

export function findNearestMergeCandidate(paths: NavigationPath[], pathId: string, maxDistance = DEFAULT_PATH_SNAP_DISTANCE_M): MergeCandidate | null {
  const selected = paths.find(path => path.id === pathId);
  if (!selected || selected.points.length < 2) return null;
  const endpoints: PathEndpoint[] = ['start', 'end'];
  const candidates: MergeCandidate[] = [];

  for (const other of paths) {
    if (other.id === pathId || other.points.length < 2) continue;
    for (const selectedEndpoint of endpoints) {
      for (const otherEndpoint of endpoints) {
        const distance = dist(endpointPoint(selected, selectedEndpoint), endpointPoint(other, otherEndpoint));
        if (distance > maxDistance) continue;
        let compatible = selected.type === other.type;
        let reason = compatible ? undefined : `Path types differ (${selected.type} vs ${other.type}). Connect them instead to preserve routing rules.`;
        if (compatible && selected.type === 'one_way') {
          const directional = (selectedEndpoint === 'end' && otherEndpoint === 'start') || (selectedEndpoint === 'start' && otherEndpoint === 'end');
          compatible = directional;
          if (!directional) reason = 'One-way paths can only merge end → start without reversing their travel direction.';
        }
        candidates.push({ pathId: other.id, pathName: other.name, selectedEndpoint, otherEndpoint, distance, compatible, reason });
      }
    }
  }
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0] ?? null;
}

export function mergeWithNearestPath(paths: NavigationPath[], pathId: string, maxDistance = DEFAULT_PATH_SNAP_DISTANCE_M): MergeResult | null {
  const candidate = findNearestMergeCandidate(paths, pathId, maxDistance);
  if (!candidate || !candidate.compatible) return null;
  const selected = paths.find(path => path.id === pathId);
  const other = paths.find(path => path.id === candidate.pathId);
  if (!selected || !other) return null;

  let first: NavigationPath;
  let second: NavigationPath;
  let firstPoints: Point2D[];
  let secondPoints: Point2D[];

  if (selected.type === 'one_way') {
    if (candidate.selectedEndpoint === 'end' && candidate.otherEndpoint === 'start') {
      first = selected; second = other; firstPoints = selected.points; secondPoints = other.points;
    } else {
      first = other; second = selected; firstPoints = other.points; secondPoints = selected.points;
    }
  } else {
    first = selected;
    second = other;
    firstPoints = candidate.selectedEndpoint === 'end' ? selected.points : [...selected.points].reverse();
    secondPoints = candidate.otherEndpoint === 'start' ? other.points : [...other.points].reverse();
  }

  const a = firstPoints[firstPoints.length - 1];
  const b = secondPoints[0];
  const junction = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const mergedPoints = [
    ...firstPoints.slice(0, -1).map(point => ({ ...point })),
    junction,
    ...secondPoints.slice(1).map(point => ({ ...point })),
  ];
  const merged: NavigationPath = {
    ...selected,
    id: selected.id,
    name: selected.name,
    points: mergedPoints,
  };
  const next = paths.filter(path => path.id !== selected.id && path.id !== other.id);
  next.push(merged);
  return { paths: next, removedPathId: other.id, mergedPathId: selected.id, candidate };
}

export function segmentIntersectionPoint(a: Point2D, b: Point2D, c: Point2D, d: Point2D): Point2D | null {
  const r = { x: b.x - a.x, y: b.y - a.y };
  const s = { x: d.x - c.x, y: d.y - c.y };
  const cross = (u: Point2D, v: Point2D) => u.x * v.y - u.y * v.x;
  const rxs = cross(r, s);
  const qmp = { x: c.x - a.x, y: c.y - a.y };
  if (Math.abs(rxs) < 1e-12) return null;
  const t = cross(qmp, s) / rxs;
  const u = cross(qmp, r) / rxs;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: a.x + t * r.x, y: a.y + t * r.y };
}

export function pathHasVertexAt(path: NavigationPath, point: Point2D, epsilon = PATH_CONNECT_EPSILON_M): boolean {
  return path.points.some(vertex => dist(vertex, point) <= epsilon);
}
