import YAML from 'yaml';
import type { MapMetadata, NavigationObject, NavigationPath } from '../../models';
import { downloadTextFile, exportBaseName } from '../../utils/files';

type RmfParam = [1 | 2 | 3 | 4, string | number | boolean];
type RmfVertex =
  | [number, number, number, string]
  | [number, number, number, string, Record<string, RmfParam>];
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
  includeCrowdSim?: boolean;
  includeScaleMeasurement?: boolean;
  navmeshFilename?: string;
}

const STRING = 1 as const;
const INT = 2 as const;
const DOUBLE = 3 as const;
const BOOL = 4 as const;
const EPS = 1e-6;

function finite(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function isBuildingLike(value: unknown): value is BuildingLike {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    'config' in v ||
    'walls' in v ||
    'doors' in v ||
    'floors' in v ||
    'models' in v ||
    'measurements' in v
  );
}

function pointFrom(value: any, fallback?: XY): XY {
  if (value && Number.isFinite(value.x) && Number.isFinite(value.y)) {
    return { x: Number(value.x), y: Number(value.y) };
  }

  if (
    Array.isArray(value) &&
    value.length >= 2 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  ) {
    return { x: Number(value[0]), y: Number(value[1]) };
  }

  return fallback ?? { x: 0, y: 0 };
}

/**
 * Convert ROS/world metres to Traffic Editor reference_image coordinates.
 *
 * ROS map convention:
 * world = origin + R(originYaw) * local_map_metres
 *
 * reference_image convention:
 * x = image pixel X
 * y = image pixel Y, increasing downward
 */
export function worldToReferenceImage(
  point: XY,
  metadata: MapMetadata,
): XY {
  const resolution = Math.max(finite(metadata.resolution, 0.05), EPS);
  const originX = finite(metadata.originX, 0);
  const originY = finite(metadata.originY, 0);
  const yaw = finite(metadata.originYaw, 0);
  const height = finite(metadata.height, 0);

  const dx = point.x - originX;
  const dy = point.y - originY;

  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);

  // R(-yaw) * [dx, dy]
  const localX = cos * dx + sin * dy;
  const localY = -sin * dx + cos * dy;

  return {
    x: localX / resolution,
    y: height - localY / resolution,
  };
}

export function referenceImageToWorld(
  point: XY,
  metadata: MapMetadata,
): XY {
  const resolution = Math.max(finite(metadata.resolution, 0.05), EPS);
  const originX = finite(metadata.originX, 0);
  const originY = finite(metadata.originY, 0);
  const yaw = finite(metadata.originYaw, 0);
  const height = finite(metadata.height, 0);

  const localX = point.x * resolution;
  const localY = (height - point.y) * resolution;

  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);

  return {
    x: originX + cos * localX - sin * localY,
    y: originY + sin * localX + cos * localY,
  };
}

function samePoint(a: XY, b: XY): boolean {
  return Math.abs(a.x - b.x) <= 1e-4 && Math.abs(a.y - b.y) <= 1e-4;
}

/**
 * Only standard Traffic Editor/RMF parameters are exported.
 * Custom AMR fields such as amr_yaw/amr_object_type are intentionally omitted
 * so the YAML stays close to the provided reference file.
 */
function vertexParams(object: NavigationObject): Record<string, RmfParam> {
  const params: Record<string, RmfParam> = {};

  if (object.type === 'charging_station') {
    params.is_charger = [BOOL, true];
  }

  if (object.type === 'parking') {
    params.is_parking_spot = [BOOL, true];
  }

  if (object.type === 'waiting') {
    params.is_holding_point = [BOOL, true];
  }

  if (object.type === 'docking_station') {
    params.dock_name = [STRING, object.name || object.id];
  }

  if (object.type === 'pickup') {
    params.pickup_dispenser = [STRING, object.name || object.id];
  }

  if (object.type === 'dropoff') {
    params.dropoff_ingestor = [STRING, object.name || object.id];
  }

  return params;
}

function wallParams(wall: any): Record<string, RmfParam> {
  return {
    alpha: [DOUBLE, finite(wall?.alpha, 1)],
    texture_height: [
      DOUBLE,
      finite(wall?.textureHeight ?? wall?.texture_height, 2.5),
    ],
    texture_name: [
      STRING,
      String(wall?.textureName ?? wall?.texture_name ?? 'default'),
    ],
    texture_scale: [
      DOUBLE,
      finite(wall?.textureScale ?? wall?.texture_scale, 1),
    ],
    texture_width: [
      DOUBLE,
      finite(wall?.textureWidth ?? wall?.texture_width, 1),
    ],
  };
}

function floorParams(floor: any): Record<string, RmfParam> {
  return {
    ceiling_scale: [
      DOUBLE,
      finite(floor?.ceilingScale ?? floor?.ceiling_scale, 1),
    ],
    ceiling_texture: [
      STRING,
      String(floor?.ceilingTexture ?? floor?.ceiling_texture ?? 'blue_linoleum'),
    ],
    indoor: [INT, floor?.indoor === false ? 0 : 1],
    texture_name: [
      STRING,
      String(floor?.textureName ?? floor?.texture_name ?? 'blue_linoleum'),
    ],
    texture_rotation: [
      DOUBLE,
      finite(floor?.textureRotation ?? floor?.texture_rotation, 0),
    ],
    texture_scale: [
      DOUBLE,
      finite(floor?.textureScale ?? floor?.texture_scale, 1),
    ],
  };
}

function doorParams(door: any): Record<string, RmfParam> {
  const params: Record<string, RmfParam> = {
    name: [STRING, String(door?.name ?? door?.id ?? 'door')],
    type: [STRING, String(door?.type ?? door?.doorType ?? 'sliding')],
    motion_axis: [
      STRING,
      String(door?.motionAxis ?? door?.motion_axis ?? 'start'),
    ],
    motion_degrees: [
      DOUBLE,
      finite(door?.motionDegrees ?? door?.motion_degrees, 90),
    ],
    motion_direction: [
      INT,
      finite(door?.motionDirection ?? door?.motion_direction, 1),
    ],
  };

  if (door?.plugin != null && String(door.plugin) !== '') {
    params.plugin = [STRING, String(door.plugin)];
  }

  if (door?.rightLeftRatio != null || door?.right_left_ratio != null) {
    params.right_left_ratio = [
      DOUBLE,
      finite(door?.rightLeftRatio ?? door?.right_left_ratio, 1),
    ];
  }

  return params;
}

function getSegment(entity: any): [XY, XY] {
  const a = pointFrom(
    entity?.start ?? entity?.a ?? entity?.p1 ?? entity?.points?.[0],
  );
  const b = pointFrom(
    entity?.end ?? entity?.b ?? entity?.p2 ?? entity?.points?.[1],
    a,
  );
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
        agents_name: [],
        agents_number: 0,
        group_id: 0,
        profile_selector: 'external_agent',
        state_selector: 'external_static',
        x: 0,
        y: 0,
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
    obstacle_set: {
      class: 1,
      file_name: navmeshFilename,
      type: 'nav_mesh',
    },
    states: [
      {
        final: 1,
        goal_set: -1,
        name: 'external_static',
        navmesh_file_name: '',
      },
    ],
    transitions: [],
    update_time_step: 0.1,
  };
}

function normalizeArgs(
  buildingOrOptions?: BuildingLike | BuildingYamlOptions,
  maybeOptions?: BuildingYamlOptions,
): { building: BuildingLike; options: BuildingYamlOptions } {
  if (isBuildingLike(buildingOrOptions)) {
    return {
      building: buildingOrOptions,
      options: maybeOptions ?? {},
    };
  }

  return {
    building: {},
    options: (buildingOrOptions as BuildingYamlOptions | undefined) ?? {},
  };
}

export function buildingPayload(
  metadata: MapMetadata,
  objects: NavigationObject[],
  paths: NavigationPath[],
  buildingOrOptions: BuildingLike | BuildingYamlOptions = {},
  maybeOptions: BuildingYamlOptions = {},
) {
  const { building, options } = normalizeArgs(
    buildingOrOptions,
    maybeOptions,
  );

  const cfg = building.config ?? {};

  const buildingName =
    options.buildingName ||
    cfg.buildingName ||
    metadata.name ||
    'AMR_Map';

  const levelName =
    options.levelName ||
    cfg.levelName ||
    'L1';

  const elevation = finite(
    options.elevation ?? cfg.elevation,
    0,
  );

  const drawingFilename =
    options.drawingFilename ||
    `${exportBaseName(buildingName, 'map')}.png`;

  const includeCrowdSim = options.includeCrowdSim !== false;
  const includeScaleMeasurement =
    options.includeScaleMeasurement !== false;

  const navmeshFilename =
    options.navmeshFilename ||
    `${exportBaseName(levelName, 'L1')}_navmesh.nav`;

  const scanLayerName =
    options.scanLayerName || 'scan';

  const vertices: RmfVertex[] = [];
  const vertexXY: XY[] = [];

  const findOrAddRefVertex = (
    world: XY,
    name = '',
    params: Record<string, RmfParam> = {},
  ): number => {
    const ref = worldToReferenceImage(world, metadata);

    const existing = vertexXY.findIndex(v => samePoint(v, ref));

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

    const row: RmfVertex =
      Object.keys(params).length > 0
        ? [ref.x, ref.y, 0, name, params]
        : [ref.x, ref.y, 0, name];

    vertices.push(row);
    vertexXY.push(ref);

    return vertices.length - 1;
  };

  /**
   * Reference file contains a calibration measurement.
   * Prefer a real project measurement. If there is none, generate one across
   * the full image width so its value exactly matches width * resolution.
   */
  const measurements: any[] = [];

  const projectMeasurements =
    (building.measurements ?? [])
      .filter((m: any) => m?.enabled !== false);

  if (projectMeasurements.length) {
    for (const measurement of projectMeasurements) {
      const [a, b] = getSegment(measurement);
      const start = findOrAddRefVertex(a);
      const end = findOrAddRefVertex(b);

      measurements.push([
        start,
        end,
        {
          distance: [
            DOUBLE,
            finite(
              measurement?.distance,
              Math.hypot(b.x - a.x, b.y - a.y),
            ),
          ],
        },
      ]);
    }
  } else if (includeScaleMeasurement) {
    const leftBottom = referenceImageToWorld(
      { x: 0, y: finite(metadata.height, 0) },
      metadata,
    );

    const rightBottom = referenceImageToWorld(
      {
        x: finite(metadata.width, 0),
        y: finite(metadata.height, 0),
      },
      metadata,
    );

    const start = findOrAddRefVertex(leftBottom);
    const end = findOrAddRefVertex(rightBottom);

    measurements.push([
      start,
      end,
      {
        distance: [
          DOUBLE,
          finite(metadata.width, 0) *
            Math.max(finite(metadata.resolution, 0.05), EPS),
        ],
      },
    ]);
  }

  for (const object of objects.filter(x => x.enabled !== false)) {
    findOrAddRefVertex(
      {
        x: finite(object.x, 0),
        y: finite(object.y, 0),
      },
      object.name || object.id,
      vertexParams(object),
    );
  }

  const walls: any[] = [];

  for (
    const wall of
    (building.walls ?? [])
      .filter((x: any) => x?.enabled !== false)
  ) {
    const [a, b] = getSegment(wall);
    const start = findOrAddRefVertex(a);
    const end = findOrAddRefVertex(b);

    if (start !== end) {
      walls.push([
        start,
        end,
        wallParams(wall),
      ]);
    }
  }

  const doors: any[] = [];

  for (
    const door of
    (building.doors ?? [])
      .filter((x: any) => x?.enabled !== false)
  ) {
    const [a, b] = getSegment(door);
    const start = findOrAddRefVertex(a);
    const end = findOrAddRefVertex(b);

    if (start !== end) {
      doors.push([
        start,
        end,
        doorParams(door),
      ]);
    }
  }

  const floors: any[] = [];

  for (
    const floor of
    (building.floors ?? [])
      .filter((x: any) => x?.enabled !== false)
  ) {
    const polygon = getPolygon(floor);

    if (polygon.length < 3) continue;

    floors.push({
      parameters: floorParams(floor),
      vertices: polygon.map(p => findOrAddRefVertex(p)),
    });
  }

  const models: any[] = [];

  for (
    const model of
    (building.models ?? [])
      .filter((x: any) => x?.enabled !== false)
  ) {
    const ref = worldToReferenceImage(
      {
        x: finite(model?.x, 0),
        y: finite(model?.y, 0),
      },
      metadata,
    );

    models.push([
      ref.x,
      ref.y,
      finite(model?.yaw, 0),
      String(model?.name ?? model?.id ?? ''),
      String(model?.modelName ?? model?.model_name ?? ''),
      {
        is_static: [
          BOOL,
          model?.isStatic ?? model?.static ?? true,
        ],
        dispensable: [
          BOOL,
          model?.dispensable ?? false,
        ],
      },
    ]);
  }

  const lanes: RmfLane[] = [];

  for (
    const path of
    paths.filter(
      p => p.enabled !== false && p.points.length >= 2,
    )
  ) {
    for (let i = 0; i < path.points.length - 1; i += 1) {
      const start = findOrAddRefVertex(path.points[i]);
      const end = findOrAddRefVertex(path.points[i + 1]);

      if (start === end) continue;

      const orientation =
        path.orientation === 'forward' ||
        path.orientation === 'backward'
          ? path.orientation
          : '';

      lanes.push([
        start,
        end,
        {
          bidirectional: [
            BOOL,
            path.type !== 'one_way',
          ],
          demo_mock_floor_name: [STRING, ''],
          demo_mock_lift_name: [STRING, ''],
          graph_idx: [INT, 0],
          orientation: [STRING, orientation],
          speed_limit: [
            DOUBLE,
            finite(path.maxSpeed, 0),
          ],
        },
      ]);
    }
  }

  /**
   * The reference contains a scan layer. Keep only the fields that can be
   * derived reliably from the project; no synthetic feature/constraint IDs.
   */
  const layers = {
    [scanLayerName]: {
      color: [1, 0, 0, 0.5],
      features: [],
      filename: drawingFilename,
      transform: {
        scale: Math.max(
          finite(metadata.resolution, 0.05),
          EPS,
        ),
        translation_x: 0,
        translation_y: 0,
        yaw: finite(metadata.originYaw, 0),
      },
      visible: true,
    },
  };

  const level: Record<string, unknown> = {
    constraints: [],
    drawing: {
      filename: drawingFilename,
    },
    elevation,
    features: [],
    floors,
    lanes,
    layers,
    measurements,
    vertices,
    walls,
  };

  // Keep optional sections only when data actually exists.
  if (doors.length) {
    level.doors = doors;
  }

  if (models.length) {
    level.models = models;
  }

  return {
    coordinate_system: 'reference_image',
    ...(includeCrowdSim
      ? {
          crowd_sim: makeCrowdSim(navmeshFilename),
        }
      : {}),
    graphs: {},
    levels: {
      [levelName]: level,
    },
    lifts: {},
    name: buildingName,
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
    buildingPayload(
      metadata,
      objects,
      paths,
      buildingOrOptions,
      maybeOptions,
    ),
    {
      lineWidth: 0,
    },
  );
}

export function downloadBuildingYaml(
  metadata: MapMetadata,
  objects: NavigationObject[],
  paths: NavigationPath[],
  buildingOrFileName: BuildingLike | string = {},
  maybeFileName = 'map',
): void {
  const building =
    typeof buildingOrFileName === 'string'
      ? {}
      : buildingOrFileName;

  const requestedName =
    typeof buildingOrFileName === 'string'
      ? buildingOrFileName
      : maybeFileName;

  const base = exportBaseName(
    requestedName,
    'map',
  );

  const text = generateBuildingYaml(
    metadata,
    objects,
    paths,
    building,
    {
      buildingName:
        building.config?.buildingName ||
        metadata.name ||
        base,
      levelName:
        building.config?.levelName ||
        'L1',
      elevation:
        building.config?.elevation ?? 0,
      drawingFilename: `${base}.png`,
      navmeshFilename: `${base}_navmesh.nav`,
    },
  );

  downloadTextFile(
    text,
    `${base}.building.yaml`,
    'application/yaml;charset=utf-8',
  );
}
