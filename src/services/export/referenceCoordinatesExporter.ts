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

  // GeoJSON polygons commonly repeat the first point as the last point.
  // The reference-coordinate arrays must contain each physical vertex once.
  if (
    result.length > 1 &&
    samePoint(result[0], result[result.length - 1])
  ) {
    result.pop();
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
  const robot = uniquePolygonPoints(floor.polygon);

  if (robot.length < 3) {
    throw new Error(
      'Reference Floor must contain at least 3 unique vertices.',
    );
  }

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

  return YAML.stringify(
    {
      reference_coordinates: {
        [reference.mapName]: {
          rmf: reference.rmf.map(point => [
            point.x,
            point.y,
          ]),
          robot: reference.robot.map(point => [
            point.x,
            point.y,
          ]),
        },
      },
    },
    {
      lineWidth: 0,
    },
  );
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
