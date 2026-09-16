import YAML from 'yaml';
import type { MapMetadata, NavigationObject, NavigationPath } from '../../models';
import { downloadTextFile, exportBaseName } from '../../utils/files';

/**
 * Open-RMF / Traffic Editor native-style building.yaml exporter.
 *
 * Main differences from the old exporter:
 * - coordinate_system: reference_image
 * - world coordinates are converted back to reference-image coordinates
 * - includes crowd_sim + graphs + Traffic Editor style level sections
 * - exports floors / walls / doors / models / measurements when present
 * - preserves RMF lane orientation: '', 'forward', 'backward'
 * - keeps backward-compatible 4-argument APIs and the newer 5-argument APIs
 */

type RmfParam = [1 | 2 | 3 | 4, string | number | boolean];
type RmfVertex = [number, number, number, string] | [number, number, number, string, Record<string, RmfParam>];
type RmfLane = [number, number, Record<string, RmfParam>];
type XY = { x: number; y: number };

type BuildingLike = {
  config?: {
    buildingName?: string;
    levelName?: string;
    referenceLevelName?: string;
    elevation?: number;
  };
  walls?: any[];
  doors?: any[];
  floors?: any[];
  models?: any[];
  measurements?: any[];
};

export interface BuildingYamlOptions {
  buildingName?: string;
  levelName?: string;
  referenceLevelName?: string;
  elevation?: number;
  drawingFilename?: string;
  scanLayerName?: string;
  includeScanLayer?: boolean;
  includeCrowdSim?: boolean;
  includeScaleMeasurement?: boolean;
  navmeshFilename?: string;
}

const STRING = 1 as const;
const INT = 2 as const;
const DOUBLE = 3 as const;
const BOOL = 4 as const;
const EPS = 1e-6;

/**
 * Traffic Editor should see one graph vertex at a connected lane junction.
 *
 * Path endpoints in the editor are stored as floating-point world coordinates.
 * Small numerical differences can make two visually connected endpoints export
 * as two separate Traffic Editor vertices.
 *
 * 0.02 m = 2 cm: large enough to absorb floating-point / drag noise, but small
 * enough to avoid merging normal navigation vertices that are intentionally
 * separated.
 */
const LANE_VERTEX_MERGE_EPSILON_M = 0.02;

function isBuildingLike(value: unknown): value is BuildingLike {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return !!(
    'config' in v || 'walls' in v || 'doors' in v || 'floors' in v ||
    'models' in v || 'measurements' in v
  );
}

function finite(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function pointFrom(value: any, fallback?: XY): XY {
  if (value && Number.isFinite(value.x) && Number.isFinite(value.y)) {
    return { x: Number(value.x), y: Number(value.y) };
  }
  if (Array.isArray(value) && value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1])) {
    return { x: Number(value[0]), y: Number(value[1]) };
  }
  return fallback ?? { x: 0, y: 0 };
}

/**
 * Convert editor world coordinates (metres, +Y up) into Traffic Editor
 * reference_image coordinates (pixels, +Y down).
 */
export function worldToReferenceImage(
  point: XY,
  metadata: MapMetadata,
): XY {
  const resolution = finite(metadata.resolution, 0.05);
  const safeResolution = resolution > 0 ? resolution : 0.05;
  const originX = finite(metadata.originX, 0);
  const originY = finite(metadata.originY, 0);
  const height = finite(metadata.height, 0);

  return {
    x: (point.x - originX) / safeResolution,
    y: height - (point.y - originY) / safeResolution,
  };
}

export function referenceImageToWorld(
  point: XY,
  metadata: MapMetadata,
): XY {
  const resolution = finite(metadata.resolution, 0.05);
  const safeResolution = resolution > 0 ? resolution : 0.05;
  const originX = finite(metadata.originX, 0);
  const originY = finite(metadata.originY, 0);
  const height = finite(metadata.height, 0);

  return {
    x: originX + point.x * safeResolution,
    y: originY + (height - point.y) * safeResolution,
  };
}

function samePoint(a: XY, b: XY): boolean {
  return Math.abs(a.x - b.x) <= 1e-4 && Math.abs(a.y - b.y) <= 1e-4;
}

function vertexParams(object: NavigationObject): Record<string, RmfParam> {
  const params: Record<string, RmfParam> = {};

  if (object.type === 'charging_station') params.is_charger = [BOOL, true];
  if (object.type === 'parking') params.is_parking_spot = [BOOL, true];
  if (object.type === 'waiting') params.is_holding_point = [BOOL, true];
  if (object.type === 'docking_station') params.dock_name = [STRING, object.name || object.id];
  if (object.type === 'pickup') params.pickup_dispenser = [STRING, object.name || object.id];
  if (object.type === 'dropoff') params.dropoff_ingestor = [STRING, object.name || object.id];

  // Keep AMR-specific metadata. Traffic Editor will preserve unknown parameters.
  if (Math.abs(finite((object as any).yaw, 0)) > EPS) {
    params.amr_yaw = [DOUBLE, finite((object as any).yaw, 0)];
  }
  params.amr_object_type = [STRING, object.type];

  return params;
}

function wallParams(wall: any): Record<string, RmfParam> {
  return {
    alpha: [DOUBLE, finite(wall?.alpha, 1)],
    texture_height: [DOUBLE, finite(wall?.textureHeight ?? wall?.texture_height, 2.5)],
    texture_name: [STRING, String(wall?.textureName ?? wall?.texture_name ?? 'default')],
    texture_scale: [DOUBLE, finite(wall?.textureScale ?? wall?.texture_scale, 1)],
    texture_width: [DOUBLE, finite(wall?.textureWidth ?? wall?.texture_width, 1)],
  };
}

function floorParams(floor: any): Record<string, RmfParam> {
  return {
    ceiling_scale: [DOUBLE, finite(floor?.ceilingScale ?? floor?.ceiling_scale, 1)],
    ceiling_texture: [STRING, String(floor?.ceilingTexture ?? floor?.ceiling_texture ?? 'blue_linoleum')],
    indoor: [INT, floor?.indoor === false ? 0 : 1],
    texture_name: [STRING, String(floor?.textureName ?? floor?.texture_name ?? 'blue_linoleum')],
    texture_rotation: [DOUBLE, finite(floor?.textureRotation ?? floor?.texture_rotation, 0)],
    texture_scale: [DOUBLE, finite(floor?.textureScale ?? floor?.texture_scale, 1)],
  };
}

function doorParams(door: any): Record<string, RmfParam> {
  const params: Record<string, RmfParam> = {
    name: [STRING, String(door?.name ?? door?.id ?? 'door')],
    type: [STRING, String(door?.type ?? door?.doorType ?? 'sliding')],
    motion_axis: [STRING, String(door?.motionAxis ?? door?.motion_axis ?? 'start')],
    motion_degrees: [DOUBLE, finite(door?.motionDegrees ?? door?.motion_degrees, 90)],
    motion_direction: [INT, finite(door?.motionDirection ?? door?.motion_direction, 1)],
  };
  if (door?.plugin != null) params.plugin = [STRING, String(door.plugin)];
  if (door?.rightLeftRatio != null || door?.right_left_ratio != null) {
    params.right_left_ratio = [DOUBLE, finite(door?.rightLeftRatio ?? door?.right_left_ratio, 1)];
  }
  return params;
}

function getSegment(entity: any): [XY, XY] {
  const a = pointFrom(entity?.start ?? entity?.a ?? entity?.p1 ?? entity?.points?.[0]);
  const b = pointFrom(entity?.end ?? entity?.b ?? entity?.p2 ?? entity?.points?.[1], a);
  return [a, b];
}

function getPolygon(entity: any): XY[] {
  const raw = entity?.vertices ?? entity?.points ?? entity?.polygon ?? [];
  return Array.isArray(raw) ? raw.map((p: any) => pointFrom(p)) : [];
}

function makeCrowdSim(navmeshFilename: string) {
  return {
    agent_groups: [
      {
        agents_name: [], agents_number: 0, group_id: 0,
        profile_selector: 'external_agent', state_selector: 'external_static',
        x: 0, y: 0,
      },
    ],
    agent_profiles: [
      {
        ORCA_tau: 1,
        ORCA_tauObst: 0.4,
        class: 1,
        max_accel: 0,
        max_angle_vel: 0,
        max_neighbors: 10,
        max_speed: 0,
        name: 'external_agent',
        neighbor_dist: 5,
        obstacle_set: 1,
        pref_speed: 0,
        r: 0.25,
      },
    ],
    enable: 0,
    goal_sets: [],
    model_types: [],
    obstacle_set: { class: 1, file_name: navmeshFilename, type: 'nav_mesh' },
    states: [
      { final: 1, goal_set: -1, name: 'external_static', navmesh_file_name: '' },
    ],
    transitions: [],
    update_time_step: 0.1,
  };
}

function normalizeArgs(
  metadata: MapMetadata,
  buildingOrOptions?: BuildingLike | BuildingYamlOptions,
  maybeOptions?: BuildingYamlOptions,
): { building: BuildingLike; options: BuildingYamlOptions } {
  if (isBuildingLike(buildingOrOptions)) {
    return { building: buildingOrOptions, options: maybeOptions ?? {} };
  }
  return { building: {}, options: (buildingOrOptions as BuildingYamlOptions | undefined) ?? {} };
}

export function buildingPayload(
  metadata: MapMetadata,
  objects: NavigationObject[],
  paths: NavigationPath[],
  buildingOrOptions: BuildingLike | BuildingYamlOptions = {},
  maybeOptions: BuildingYamlOptions = {},
) {
  const { building, options } = normalizeArgs(metadata, buildingOrOptions, maybeOptions);
  const cfg = building.config ?? {};

  const buildingName = options.buildingName || cfg.buildingName || metadata.name || 'AMR_Map';
  const levelName = options.levelName || cfg.levelName || 'L1';
  const referenceLevelName = options.referenceLevelName || cfg.referenceLevelName || levelName;
  const elevation = finite(options.elevation ?? cfg.elevation, 0);
  const drawingFilename = options.drawingFilename || `${exportBaseName(buildingName, 'map')}.png`;
  const scanLayerName = options.scanLayerName || 'scan';
  const includeScanLayer = options.includeScanLayer !== false;
  const includeCrowdSim = options.includeCrowdSim !== false;
  const includeScaleMeasurement = options.includeScaleMeasurement !== false;
  const navmeshFilename = options.navmeshFilename || `${exportBaseName(levelName, 'L1')}_navmesh.nav`;

  const vertices: RmfVertex[] = [];
  const vertexXY: XY[] = [];
  const vertexWorldXY: XY[] = [];

  const worldDistance = (a: XY, b: XY) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  const findOrAddRefVertex = (
    world: XY,
    name = '',
    params: Record<string, RmfParam> = {},
    mergeToleranceM = 1e-6,
  ): number => {
    const ref = worldToReferenceImage(world, metadata);

    // First compare in WORLD METRES. This is the important check for lane
    // topology because two connected path endpoints may differ by tiny
    // floating-point amounts before conversion to reference-image pixels.
    let existing = vertexWorldXY.findIndex(
      v => worldDistance(v, world) <= mergeToleranceM,
    );

    // Keep the old reference-image equality check as a fallback for exact
    // geometry imported through other building entities.
    if (existing < 0) {
      existing = vertexXY.findIndex(v => samePoint(v, ref));
    }

    if (existing >= 0) {
      const current = vertices[existing];

      if (name && !current[3]) {
        current[3] = name;
      }

      if (Object.keys(params).length) {
        const oldParams = current.length >= 5 ? current[4] : {};
        vertices[existing] = [
          current[0],
          current[1],
          current[2],
          current[3],
          { ...oldParams, ...params },
        ];
      }

      return existing;
    }

    const row: RmfVertex = Object.keys(params).length
      ? [ref.x, ref.y, 0, name, params]
      : [ref.x, ref.y, 0, name];

    vertices.push(row);
    vertexXY.push(ref);
    vertexWorldXY.push({ ...world });

    return vertices.length - 1;
  };

  // Traffic Editor reference_image maps need scale information. When the project
  // has no user measurement, create a 1-metre calibration segment.
  const measurements: any[] = [];
  const buildingMeasurements = (building.measurements ?? []).filter((m: any) => m?.enabled !== false);
  if (buildingMeasurements.length) {
    for (const m of buildingMeasurements) {
      const [a, b] = getSegment(m);
      const ia = findOrAddRefVertex(a);
      const ib = findOrAddRefVertex(b);
      const d = finite(m?.distance, Math.hypot(b.x - a.x, b.y - a.y));
      measurements.push([ia, ib, { distance: [DOUBLE, d] }]);
    }
  } else if (includeScaleMeasurement) {
    const originWorld = { x: finite(metadata.originX, 0), y: finite(metadata.originY, 0) };
    const oneMetreWorld = { x: originWorld.x + 1, y: originWorld.y };
    const ia = findOrAddRefVertex(originWorld);
    const ib = findOrAddRefVertex(oneMetreWorld);
    measurements.push([ia, ib, { distance: [DOUBLE, 1] }]);
  }

  // Navigation objects become named graph vertices.
  for (const object of objects.filter(o => o.enabled !== false)) {
    findOrAddRefVertex(
      { x: finite((object as any).x), y: finite((object as any).y) },
      object.name || object.id,
      vertexParams(object),
      LANE_VERTEX_MERGE_EPSILON_M,
    );
  }

  // Building geometry shares the same Traffic Editor vertex table.
  const walls: any[] = [];
  for (const wall of (building.walls ?? []).filter((x: any) => x?.enabled !== false)) {
    const [a, b] = getSegment(wall);
    const ia = findOrAddRefVertex(a);
    const ib = findOrAddRefVertex(b);
    if (ia !== ib) walls.push([ia, ib, wallParams(wall)]);
  }

  const doors: any[] = [];
  for (const door of (building.doors ?? []).filter((x: any) => x?.enabled !== false)) {
    const [a, b] = getSegment(door);
    const ia = findOrAddRefVertex(a);
    const ib = findOrAddRefVertex(b);
    if (ia !== ib) doors.push([ia, ib, doorParams(door)]);
  }

  const floors: any[] = [];
  for (const floor of (building.floors ?? []).filter((x: any) => x?.enabled !== false)) {
    const points = getPolygon(floor);
    if (points.length < 3) continue;
    const indices = points.map(p => findOrAddRefVertex(p));
    floors.push({ parameters: floorParams(floor), vertices: indices });
  }

  const models: any[] = [];
  for (const model of (building.models ?? []).filter((x: any) => x?.enabled !== false)) {
    const ref = worldToReferenceImage(pointFrom(model), metadata);
    const params: Record<string, RmfParam> = {
      is_static: [BOOL, model?.isStatic ?? model?.static ?? true],
      dispensable: [BOOL, model?.dispensable ?? false],
    };
    models.push([
      ref.x,
      ref.y,
      finite(model?.yaw, 0),
      String(model?.name ?? model?.id ?? ''),
      String(model?.modelName ?? model?.model_name ?? ''),
      params,
    ]);
  }

  const lanes: RmfLane[] = [];
  for (const path of paths.filter(p => p.enabled !== false && p.points.length >= 2)) {
    for (let i = 0; i < path.points.length - 1; i += 1) {
      const start = findOrAddRefVertex(
        path.points[i],
        '',
        {},
        LANE_VERTEX_MERGE_EPSILON_M,
      );
      const end = findOrAddRefVertex(
        path.points[i + 1],
        '',
        {},
        LANE_VERTEX_MERGE_EPSILON_M,
      );
      if (start === end) continue;

      const orientation = (path as any).orientation;
      const normalizedOrientation = orientation === 'forward' || orientation === 'backward' ? orientation : '';

      lanes.push([
        start,
        end,
        {
          bidirectional: [BOOL, path.type !== 'one_way'],
          demo_mock_floor_name: [STRING, ''],
          demo_mock_lift_name: [STRING, ''],
          graph_idx: [INT, 0],
          orientation: [STRING, normalizedOrientation],
          speed_limit: [DOUBLE, finite(path.maxSpeed, 0)],
        },
      ]);
    }
  }

  const layers: Record<string, any> = {};
  if (includeScanLayer && drawingFilename) {
    layers[scanLayerName] = {
      color: [1, 0, 0, 0.5],
      features: [],
      filename: drawingFilename,
      transform: {
        scale: finite(metadata.resolution, 0.05),
        translation_x: 0,
        translation_y: 0,
        yaw: finite((metadata as any).originYaw, 0),
      },
      visible: true,
    };
  }

  const level = {
    constraints: [],
    drawing: { filename: drawingFilename },
    elevation,
    features: [],
    floors,
    lanes,
    layers,
    measurements,
    models,
    vertices,
    walls,
    ...(doors.length ? { doors } : {}),
  };

  return {
    coordinate_system: 'reference_image',
    ...(includeCrowdSim ? { crowd_sim: makeCrowdSim(navmeshFilename) } : {}),
    graphs: {},
    levels: { [levelName]: level },
    lifts: {},
    name: buildingName,
    // Traffic Editor accepts reference_level_name in newer generated files;
    // keep it out by default to more closely match classic reference_image files.
    ...(referenceLevelName && referenceLevelName !== levelName
      ? { reference_level_name: referenceLevelName }
      : {}),
  };
}

export function generateBuildingYaml(
  metadata: MapMetadata,
  objects: NavigationObject[],
  paths: NavigationPath[],
  buildingOrOptions: BuildingLike | BuildingYamlOptions = {},
  maybeOptions: BuildingYamlOptions = {},
): string {
  return YAML.stringify(
    buildingPayload(metadata, objects, paths, buildingOrOptions, maybeOptions),
    { lineWidth: 0 },
  );
}

/**
 * Supports both:
 *   downloadBuildingYaml(metadata, objects, paths, 'map')
 * and the v0.11+ call:
 *   downloadBuildingYaml(metadata, objects, paths, building, 'map')
 */
export function downloadBuildingYaml(
  metadata: MapMetadata,
  objects: NavigationObject[],
  paths: NavigationPath[],
  buildingOrFileName: BuildingLike | string = {},
  maybeFileName = 'map',
): void {
  const building = typeof buildingOrFileName === 'string' ? {} : buildingOrFileName;
  const requestedName = typeof buildingOrFileName === 'string' ? buildingOrFileName : maybeFileName;
  const base = exportBaseName(requestedName, 'map');

  const text = generateBuildingYaml(metadata, objects, paths, building, {
    buildingName: building.config?.buildingName || metadata.name || base,
    levelName: building.config?.levelName || 'L1',
    referenceLevelName: building.config?.referenceLevelName || building.config?.levelName || 'L1',
    drawingFilename: `${base}.png`,
    navmeshFilename: `${base}_navmesh.nav`,
  });

  downloadTextFile(text, `${base}.building.yaml`, 'application/yaml;charset=utf-8');
}
