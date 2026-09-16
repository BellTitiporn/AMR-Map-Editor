import YAML from 'yaml';
import type {
  BuildingData,
  BuildingFloor,
  MapMetadata,
  Point2D,
} from '../../models';
import { worldToReferenceImage } from './buildingExporter';
import {
  downloadTextFile,
  exportBaseName,
} from '../../utils/files';

export interface GeneratedReferenceCoordinates {
  mapName: string;
  sourceFloorId: string;
  sourceFloorName: string;
  robot: Point2D[];
  rmf: Point2D[];
}

const EPS = 1e-6;

function samePoint(a: Point2D, b: Point2D): boolean {
  return Math.abs(a.x - b.x) <= EPS &&
    Math.abs(a.y - b.y) <= EPS;
}

function uniquePolygonPoints(points: Point2D[]): Point2D[] {
  const result: Point2D[] = [];

  for (const point of points) {
    if (!result.some(existing => samePoint(existing, point))) {
      result.push({ x: point.x, y: point.y });
    }
  }

  return result;
}

function polygonArea(points: Point2D[]): number {
  if (points.length < 3) return 0;

  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }

  return Math.abs(sum) / 2;
}

/**
 * Pick exactly four principal corners from a Floor polygon.
 *
 * World/robot coordinates use +Y upward:
 *   TL = min(x - y)
 *   TR = max(x + y)
 *   BR = max(x - y)
 *   BL = min(x + y)
 *
 * This keeps only the outer four map corners even when the Floor polygon
 * contains many intermediate wall/shape vertices.
 *
 * Output order:
 *   0 = top-left
 *   1 = top-right
 *   2 = bottom-right
 *   3 = bottom-left
 */
export function selectFourPrincipalCorners(
  points: Point2D[],
): Point2D[] {
  const unique = uniquePolygonPoints(points);

  if (unique.length < 4) {
    throw new Error(
      'Reference Floor must contain at least 4 unique vertices to generate four map corners.',
    );
  }

  const candidates = [
    {
      name: 'top-left',
      score: (p: Point2D) => p.x - p.y,
      mode: 'min' as const,
    },
    {
      name: 'top-right',
      score: (p: Point2D) => p.x + p.y,
      mode: 'max' as const,
    },
    {
      name: 'bottom-right',
      score: (p: Point2D) => p.x - p.y,
      mode: 'max' as const,
    },
    {
      name: 'bottom-left',
      score: (p: Point2D) => p.x + p.y,
      mode: 'min' as const,
    },
  ];

  const selected: Point2D[] = [];
  const used = new Set<number>();

  for (const candidate of candidates) {
    let bestIndex = -1;
    let bestScore =
      candidate.mode === 'min'
        ? Number.POSITIVE_INFINITY
        : Number.NEGATIVE_INFINITY;

    for (let i = 0; i < unique.length; i += 1) {
      if (used.has(i)) continue;

      const value = candidate.score(unique[i]);
      const better =
        candidate.mode === 'min'
          ? value < bestScore
          : value > bestScore;

      if (better) {
        bestScore = value;
        bestIndex = i;
      }
    }

    if (bestIndex < 0) {
      throw new Error(
        `Unable to resolve ${candidate.name} reference corner.`,
      );
    }

    used.add(bestIndex);
    selected.push(unique[bestIndex]);
  }

  return selected;
}

/**
 * Automatically choose the enabled Floor polygon that represents the largest
 * area. This makes the reference points deterministic and avoids using random
 * waypoint/path vertices.
 */
export function selectReferenceFloor(
  building: BuildingData,
): BuildingFloor {
  const candidates = building.floors
    .filter(floor => floor.enabled)
    .map(floor => ({
      floor,
      points: uniquePolygonPoints(floor.polygon),
    }))
    .filter(item => item.points.length >= 3)
    .sort(
      (a, b) =>
        polygonArea(b.points) - polygonArea(a.points),
    );

  if (!candidates.length) {
    throw new Error(
      'Cannot generate reference coordinates: create/enable a Floor polygon with at least 3 vertices first.',
    );
  }

  return candidates[0].floor;
}

/**
 * Build coordinate pairs from ONE shared source geometry.
 *
 * robot[] = the exact Floor/world coordinates used by GeoJSON.
 * rmf[]   = the same physical points converted using the exact
 *           worldToReferenceImage() function used by building.yaml.
 *
 * Therefore:
 *   robot[i] <-> rmf[i]
 * always represents the same physical vertex.
 */
export function generateReferenceCoordinates(
  metadata: MapMetadata,
  building: BuildingData,
): GeneratedReferenceCoordinates {
  const floor = selectReferenceFloor(building);

  // Keep exactly four principal outer corners only.
  const robot = selectFourPrincipalCorners(
    floor.polygon,
  );

  const rmf = robot.map(point =>
    worldToReferenceImage(point, metadata),
  );

  return {
    mapName:
      building.config.buildingName ||
      metadata.name ||
      'map',
    sourceFloorId: floor.id,
    sourceFloorName: floor.name || floor.id,
    robot,
    rmf,
  };
}

export function generateReferenceCoordinatesYaml(
  metadata: MapMetadata,
  building: BuildingData,
): string {
  const reference =
    generateReferenceCoordinates(metadata, building);

  const formatNumber = (value: number): string => {
    // Preserve meaningful precision while avoiding scientific notation for normal map values.
    if (!Number.isFinite(value)) {
      throw new Error('Reference coordinate contains a non-finite number.');
    }

    const rounded = Number(value.toFixed(12));
    return String(rounded);
  };

  const formatPair = (point: Point2D): string =>
    `[${formatNumber(point.x)}, ${formatNumber(point.y)}]`;

  const lines: string[] = [
    'reference_coordinates:',
    `  ${reference.mapName}:`,
    '    rmf:',
    ...reference.rmf.map(
      point => `      - ${formatPair(point)}`,
    ),
    '    robot:',
    ...reference.robot.map(
      point => `      - ${formatPair(point)}`,
    ),
    '',
  ];

  return lines.join('\n');
}

export function downloadReferenceCoordinatesYaml(
  metadata: MapMetadata,
  building: BuildingData,
  fileName = 'map',
): void {
  const base = exportBaseName(fileName, 'map');

  downloadTextFile(
    generateReferenceCoordinatesYaml(
      metadata,
      building,
    ),
    `${base}-reference-coordinates.yaml`,
    'application/yaml;charset=utf-8',
  );
}
