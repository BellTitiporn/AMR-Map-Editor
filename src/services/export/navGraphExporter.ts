import JSZip from 'jszip';
import YAML from 'yaml';
import type {
  BuildingData,
  MapMetadata,
  NavigationObject,
  NavigationPath,
  Point2D,
} from '../../models';
import { worldToReferenceImage } from './buildingExporter';
import { downloadBlob, downloadTextFile, exportBaseName } from '../../utils/files';

/**
 * RMF nav_graph exporter.
 *
 * The emitted YAML intentionally follows the compact format produced by
 * rmf_building_map_tools / building_map_generator nav, for example:
 *
 * building_name: my_map
 * levels:
 *   L1:
 *     lanes:
 *     - - 0
 *       - 1
 *       - {speed_limit: 1}
 *     vertices:
 *     - - 1.23
 *       - -4.56
 *       - {amr_object_type: waypoint, name: WP-01}
 *
 * Each editor path has graphIndex (RMF graph_idx). Paths are grouped by
 * graphIndex and exported to nav_graphs/<graphIndex>.yaml.
 */

const MERGE_EPSILON_M = 0.02;
const EPS = 1e-9;

type NavScalar = string | number | boolean;
type NavParams = Record<string, NavScalar>;
type NavVertex = [number, number, NavParams];
type NavLane = [number, number, NavParams];

type MutableVertex = {
  point: Point2D;
  params: NavParams;
};

export function pathGraphIndex(path: NavigationPath): number {
  const value = path.graphIndex ?? 0;
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

export function collectNavGraphIndices(paths: NavigationPath[]): number[] {
  return Array.from(new Set(
    paths
      .filter(path => path.enabled !== false && path.points.length >= 2)
      .map(pathGraphIndex),
  )).sort((a, b) => a - b);
}

function finite(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function distance(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * building_map_generator nav uses metric coordinates derived from the
 * reference image. Reference-image +Y points downward, while RMF nav graph Y
 * is emitted with the opposite sign. Therefore:
 *
 *   rmf_x =  reference_x_px * resolution
 *   rmf_y = -reference_y_px * resolution
 */
export function worldToRmfNavPoint(point: Point2D, metadata: MapMetadata): Point2D {
  const ref = worldToReferenceImage(point, metadata);
  const resolution = Math.max(finite(metadata.resolution, 0.05), EPS);
  return {
    x: ref.x * resolution,
    y: -ref.y * resolution,
  };
}

function reverseOrientation(value: string): string {
  if (value === 'forward') return 'backward';
  if (value === 'backward') return 'forward';
  return value;
}

/** Sort parameter keys to match the stable/plain mapping style normally seen
 * in PyYAML output from rmf_building_map_tools. */
function sortedParams(params: NavParams): NavParams {
  return Object.fromEntries(
    Object.entries(params).sort(([a], [b]) => a.localeCompare(b)),
  ) as NavParams;
}

function objectParams(object: NavigationObject): NavParams {
  const params: NavParams = {
    amr_object_type: object.type,
  };

  const yaw = finite(object.yaw, 0);
  if (Math.abs(yaw) > EPS) params.amr_yaw = yaw;

  if (object.type === 'charging_station') params.is_charger = true;
  if (object.type === 'parking') params.is_parking_spot = true;
  if (object.type === 'waiting') params.is_holding_point = true;
  if (object.type === 'docking_station') params.dock_name = object.name || object.id;

  // Keep the object name exactly like the nav graph produced from the editor's
  // building vertex names.
  params.name = object.name || object.id;

  if (object.type === 'pickup') {
    params.pickup_dispenser =
      typeof object.metadata?.pickup_dispenser === 'string'
        ? object.metadata.pickup_dispenser
        : object.name || object.id;
  }

  if (object.type === 'dropoff') {
    params.dropoff_ingestor =
      typeof object.metadata?.dropoff_ingestor === 'string'
        ? object.metadata.dropoff_ingestor
        : object.name || object.id;
  }

  // Preserve additional primitive metadata that is not already represented.
  for (const [key, value] of Object.entries(object.metadata ?? {})) {
    if (key in params) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      params[key] = value;
    }
  }

  return sortedParams(params);
}

function pathOrientation(path: NavigationPath): string {
  return path.orientation === 'forward' || path.orientation === 'backward'
    ? path.orientation
    : '';
}

function segmentIntersection(a: Point2D, b: Point2D, c: Point2D, d: Point2D): boolean {
  const cross = (p: Point2D, q: Point2D, r: Point2D) =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);

  const c1 = cross(a, b, c);
  const c2 = cross(a, b, d);
  const c3 = cross(c, d, a);
  const c4 = cross(c, d, b);
  const eps = 1e-8;

  return ((c1 > eps && c2 < -eps) || (c1 < -eps && c2 > eps)) &&
    ((c3 > eps && c4 < -eps) || (c3 < -eps && c4 > eps));
}

export interface NavGraphPayload {
  building_name: string;
  levels: Record<string, {
    lanes: NavLane[];
    vertices: NavVertex[];
  }>;
}

export function generateNavGraphPayload(
  metadata: MapMetadata,
  objects: NavigationObject[],
  paths: NavigationPath[],
  building: BuildingData,
  graphIndex = 0,
): NavGraphPayload {
  const levelName = building.config.levelName || 'L1';
  const buildingName = building.config.buildingName || metadata.name || 'AMR_Map';

  const vertices: MutableVertex[] = [];

  const findOrAdd = (world: Point2D): number => {
    const point = worldToRmfNavPoint(world, metadata);
    const existing = vertices.findIndex(v => distance(v.point, point) <= MERGE_EPSILON_M);
    if (existing >= 0) return existing;

    vertices.push({
      point,
      params: { name: '' },
    });
    return vertices.length - 1;
  };

  const doors = (building.doors ?? [])
    .filter(door => door.enabled !== false)
    .map(door => ({
      name: door.name || door.id,
      start: worldToRmfNavPoint(door.start, metadata),
      end: worldToRmfNavPoint(door.end, metadata),
    }));

  const lanes: NavLane[] = [];

  for (const path of paths.filter(p => p.enabled !== false && p.points.length >= 2 && pathGraphIndex(p) === graphIndex)) {
    for (let i = 0; i < path.points.length - 1; i += 1) {
      const start = findOrAdd(path.points[i]);
      const end = findOrAdd(path.points[i + 1]);
      if (start === end) continue;

      const params: NavParams = {};
      const orientation = pathOrientation(path);

      if (orientation) params.orientation_constraint = orientation;

      const speedLimit = finite(path.maxSpeed, 0);
      if (speedLimit > 0) params.speed_limit = speedLimit;

      // Keep door_name on the directed lane when a lane crosses an RMF door.
      // This is a lane property, not a top-level nav_graph section.
      const crossingDoor = doors.find(door =>
        segmentIntersection(vertices[start].point, vertices[end].point, door.start, door.end),
      );
      if (crossingDoor) params.door_name = crossingDoor.name;

      const forwardParams = sortedParams(params);

      if (path.type === 'one_way') {
        lanes.push([start, end, forwardParams]);
      } else {
        // building_map_generator nav represents a bidirectional building lane
        // as two directed nav-graph lanes.
        lanes.push([start, end, forwardParams]);

        const reverseParams: NavParams = { ...params };
        if (orientation) {
          reverseParams.orientation_constraint = reverseOrientation(orientation);
        }
        lanes.push([end, start, sortedParams(reverseParams)]);
      }
    }
  }

  // A nav graph only carries vertices used by lanes. Attach object properties
  // when an enabled object occupies the same logical lane vertex.
  for (const object of objects.filter(o => o.enabled !== false)) {
    const navPoint = worldToRmfNavPoint({ x: object.x, y: object.y }, metadata);
    const index = vertices.findIndex(v => distance(v.point, navPoint) <= MERGE_EPSILON_M);
    if (index < 0) continue;

    vertices[index].params = objectParams(object);
  }

  // Dock/undock names are emitted on lanes that enter/leave a dock vertex.
  for (const lane of lanes) {
    const startParams = vertices[lane[0]].params;
    const endParams = vertices[lane[1]].params;

    if (typeof endParams.dock_name === 'string' && endParams.dock_name) {
      lane[2] = sortedParams({ ...lane[2], dock_name: endParams.dock_name });
    }
    if (typeof startParams.dock_name === 'string' && startParams.dock_name) {
      lane[2] = sortedParams({ ...lane[2], undock_name: startParams.dock_name });
    }
  }

  const navVertices: NavVertex[] = vertices.map(vertex => [
    vertex.point.x,
    vertex.point.y,
    sortedParams(vertex.params),
  ]);

  // Property insertion order is intentional: it matches the user's
  // building_map_generator output (lanes first, then vertices).
  return {
    building_name: buildingName,
    levels: {
      [levelName]: {
        lanes,
        vertices: navVertices,
      },
    },
  };
}

export function generateNavGraphYaml(
  metadata: MapMetadata,
  objects: NavigationObject[],
  paths: NavigationPath[],
  building: BuildingData,
  graphIndex = 0,
): string {
  if (!paths.some(path => path.enabled !== false && path.points.length >= 2 && pathGraphIndex(path) === graphIndex)) {
    throw new Error(`Nav graph ${graphIndex} export requires at least one enabled path with 2 or more points.`);
  }

  const payload = generateNavGraphPayload(metadata, objects, paths, building, graphIndex);

  // Match rmf_building_map_tools / PyYAML output style exactly enough for
  // nav_graph files: sequence items stay in block style, while the parameter
  // mapping at index 2 is always rendered as a compact flow mapping, e.g.
  //   - - 0
  //     - 1
  //     - {speed_limit: 1}
  // and
  //   - - 1.23
  //     - -4.56
  //     - {amr_object_type: waypoint, name: WP-01}
  const scalar = (value: NavScalar): string =>
    YAML.stringify(value, { defaultStringType: 'PLAIN' }).trim();

  const flowMap = (params: NavParams): string => {
    const entries = Object.entries(params);
    if (!entries.length) return '{}';
    return `{${entries.map(([key, value]) => `${key}: ${scalar(value)}`).join(', ')}}`;
  };

  const lines: string[] = [];
  lines.push(`building_name: ${scalar(payload.building_name)}`);
  lines.push('levels:');

  for (const [levelName, level] of Object.entries(payload.levels)) {
    lines.push(`  ${levelName}:`);
    lines.push('    lanes:');
    for (const lane of level.lanes) {
      lines.push(`    - - ${lane[0]}`);
      lines.push(`      - ${lane[1]}`);
      lines.push(`      - ${flowMap(lane[2])}`);
    }

    lines.push('    vertices:');
    for (const vertex of level.vertices) {
      lines.push(`    - - ${vertex[0]}`);
      lines.push(`      - ${vertex[1]}`);
      lines.push(`      - ${flowMap(vertex[2])}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

export function downloadNavGraphYaml(
  metadata: MapMetadata,
  objects: NavigationObject[],
  paths: NavigationPath[],
  building: BuildingData,
  graphIndex = 0,
  fileName = `${graphIndex}.yaml`,
): void {
  downloadTextFile(
    generateNavGraphYaml(metadata, objects, paths, building, graphIndex),
    fileName,
    'application/yaml;charset=utf-8',
  );
}

export async function exportNavGraphsZip(
  metadata: MapMetadata,
  objects: NavigationObject[],
  paths: NavigationPath[],
  building: BuildingData,
  fileName = 'map',
): Promise<void> {
  const base = exportBaseName(fileName, 'map');
  const zip = new JSZip();
  const graphIndices = collectNavGraphIndices(paths);

  if (!graphIndices.length) {
    throw new Error('Nav graph export requires at least one enabled path with 2 or more points.');
  }

  for (const graphIndex of graphIndices) {
    zip.file(
      `nav_graphs/${graphIndex}.yaml`,
      generateNavGraphYaml(metadata, objects, paths, building, graphIndex),
    );
  }

  zip.file(
    'README.txt',
    [
      'AMR Map Editor - RMF Nav Graphs',
      '',
      `Generated graph indices: ${graphIndices.join(', ')}`,
      '',
      ...graphIndices.flatMap(index => [
        `nav_graphs/${index}.yaml`,
        `  RMF navigation graph generated from paths where Graph Index = ${index}.`,
        '',
      ]),
      'Bidirectional paths are emitted as two directed lane entries.',
      'RMF nav Y uses -reference_image_y * resolution.',
      'Graph Index is also exported to .building.yaml as lane parameter graph_idx.',
    ].join('\n'),
  );

  downloadBlob(
    await zip.generateAsync({ type: 'blob' }),
    `${base}-nav-graphs.zip`,
  );
}
