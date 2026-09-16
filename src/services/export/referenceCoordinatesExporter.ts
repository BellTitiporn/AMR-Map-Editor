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

function samePoint(
  a: Point2D,
  b: Point2D,
): boolean {
  return (
    Math.abs(a.x - b.x) <= EPS &&
    Math.abs(a.y - b.y) <= EPS
  );
}

function uniquePolygonPoints(
  points: Point2D[],
): Point2D[] {
  const result: Point2D[] = [];

  for (const point of points) {
    if (
      !result.some(existing =>
        samePoint(existing, point),
      )
    ) {
      result.push({
        x: point.x,
        y: point.y,
      });
    }
  }

  return result;
}

function polygonArea(
  points: Point2D[],
): number {
  if (points.length < 3) {
    return 0;
  }

  let sum = 0;

  for (
    let i = 0;
    i < points.length;
    i += 1
  ) {
    const a = points[i];

    const b =
      points[
        (i + 1) % points.length
      ];

    sum +=
      a.x * b.y -
      b.x * a.y;
  }

  return Math.abs(sum) / 2;
}

/**
 * Select exactly 4 principal outer corners.
 *
 * World / Robot coordinate convention:
 * +X = right
 * +Y = up
 *
 * Output order:
 *
 * 0 = Top-left
 * 1 = Top-right
 * 2 = Bottom-right
 * 3 = Bottom-left
 */
export function selectFourPrincipalCorners(
  points: Point2D[],
): Point2D[] {
  const unique =
    uniquePolygonPoints(points);

  if (unique.length < 4) {
    throw new Error(
      'Reference Floor must contain at least 4 unique vertices.',
    );
  }

  /*
   * For normal map geometry:
   *
   * Top-left:
   * smallest x - y
   *
   * Top-right:
   * largest x + y
   *
   * Bottom-right:
   * largest x - y
   *
   * Bottom-left:
   * smallest x + y
   */

  const definitions = [
    {
      name: 'top-left',
      mode: 'min' as const,
      score: (p: Point2D) =>
        p.x - p.y,
    },

    {
      name: 'top-right',
      mode: 'max' as const,
      score: (p: Point2D) =>
        p.x + p.y,
    },

    {
      name: 'bottom-right',
      mode: 'max' as const,
      score: (p: Point2D) =>
        p.x - p.y,
    },

    {
      name: 'bottom-left',
      mode: 'min' as const,
      score: (p: Point2D) =>
        p.x + p.y,
    },
  ];

  const selected: Point2D[] = [];

  const used =
    new Set<number>();

  for (const definition of definitions) {
    let bestIndex = -1;

    let bestScore =
      definition.mode === 'min'
        ? Number.POSITIVE_INFINITY
        : Number.NEGATIVE_INFINITY;

    for (
      let i = 0;
      i < unique.length;
      i += 1
    ) {
      if (used.has(i)) {
        continue;
      }

      const value =
        definition.score(
          unique[i],
        );

      const better =
        definition.mode === 'min'
          ? value < bestScore
          : value > bestScore;

      if (better) {
        bestScore = value;
        bestIndex = i;
      }
    }

    if (bestIndex < 0) {
      throw new Error(
        `Unable to resolve ${definition.name} reference corner.`,
      );
    }

    used.add(bestIndex);

    selected.push({
      x: unique[bestIndex].x,
      y: unique[bestIndex].y,
    });
  }

  return selected;
}

/**
 * Automatically select the largest enabled Floor.
 *
 * This avoids picking path vertices,
 * waypoints, wall intermediate points, etc.
 */
export function selectReferenceFloor(
  building: BuildingData,
): BuildingFloor {
  const candidates =
    building.floors

      .filter(
        floor =>
          floor.enabled &&
          floor.polygon.length >= 4,
      )

      .map(floor => ({
        floor,

        points:
          uniquePolygonPoints(
            floor.polygon,
          ),
      }))

      .filter(
        item =>
          item.points.length >= 4,
      )

      .sort(
        (a, b) =>
          polygonArea(b.points) -
          polygonArea(a.points),
      );

  if (!candidates.length) {
    throw new Error(
      'Cannot generate reference coordinates. Create and enable a Floor polygon with at least 4 vertices first.',
    );
  }

  return candidates[0].floor;
}

/**
 * Generate exactly 4 RMF <-> Robot
 * reference coordinate pairs.
 *
 * Robot:
 * original world coordinates.
 *
 * RMF:
 * the SAME physical points converted
 * through building.yaml's
 * worldToReferenceImage().
 */
export function generateReferenceCoordinates(
  metadata: MapMetadata,
  building: BuildingData,
): GeneratedReferenceCoordinates {
  const floor =
    selectReferenceFloor(
      building,
    );

  const robot =
    selectFourPrincipalCorners(
      floor.polygon,
    );

  if (robot.length !== 4) {
    throw new Error(
      'Reference coordinate generation must return exactly 4 Robot corners.',
    );
  }

  const rmf =
    robot.map(point =>
      worldToReferenceImage(
        point,
        metadata,
      ),
    );

  if (rmf.length !== 4) {
    throw new Error(
      'Reference coordinate generation must return exactly 4 RMF corners.',
    );
  }

  return {
    mapName:
      building.config.buildingName ||
      metadata.name ||
      'map',

    sourceFloorId:
      floor.id,

    sourceFloorName:
      floor.name ||
      floor.id,

    robot,

    rmf,
  };
}

/**
 * Format number for YAML.
 *
 * Limits long floating-point noise while
 * keeping enough precision for mapping.
 */
function formatNumber(
  value: number,
): string {
  if (!Number.isFinite(value)) {
    throw new Error(
      'Reference coordinate contains a non-finite number.',
    );
  }

  const rounded =
    Number(
      value.toFixed(12),
    );

  return String(rounded);
}

/**
 * Format one coordinate exactly as:
 *
 * [x, y]
 */
function formatPair(
  point: Point2D,
): string {
  return (
    '[' +
    formatNumber(point.x) +
    ', ' +
    formatNumber(point.y) +
    ']'
  );
}

/**
 * Export format:
 *
 * reference_coordinates:
 *   map_name:
 *     rmf:
 *       - [x, y]
 *       - [x, y]
 *       - [x, y]
 *       - [x, y]
 *     robot:
 *       - [x, y]
 *       - [x, y]
 *       - [x, y]
 *       - [x, y]
 *
 * IMPORTANT:
 * We intentionally do NOT use
 * YAML.stringify() here.
 *
 * That prevents output like:
 *
 * - - 10
 *   - 20
 *
 * and forces:
 *
 * - [10, 20]
 */
export function generateReferenceCoordinatesYaml(
  metadata: MapMetadata,
  building: BuildingData,
): string {
  const reference =
    generateReferenceCoordinates(
      metadata,
      building,
    );

  if (
    reference.rmf.length !== 4 ||
    reference.robot.length !== 4
  ) {
    throw new Error(
      'Reference coordinate YAML requires exactly 4 RMF points and 4 Robot points.',
    );
  }

  const lines: string[] = [
    'reference_coordinates:',

    `  ${reference.mapName}:`,

    '    rmf:',

    ...reference.rmf.map(
      point =>
        `      - ${formatPair(point)}`,
    ),

    '    robot:',

    ...reference.robot.map(
      point =>
        `      - ${formatPair(point)}`,
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
  const base =
    exportBaseName(
      fileName,
      'map',
    );

  const yaml =
    generateReferenceCoordinatesYaml(
      metadata,
      building,
    );

  downloadTextFile(
    yaml,

    `${base}-reference-coordinates.yaml`,

    'application/yaml;charset=utf-8',
  );
}