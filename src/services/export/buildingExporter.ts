import YAML from 'yaml';
import type { BuildingData, MapMetadata, NavigationObject, NavigationPath, Point2D } from '../../models';
import { downloadTextFile, exportBaseName } from '../../utils/files';

type RmfParam = [1 | 2 | 3 | 4, string | number | boolean];
type RmfVertex = [number, number, number, string, Record<string, RmfParam>];
type RmfLane = [number, number, Record<string, RmfParam>];
type RmfEdge = [number, number, Record<string, RmfParam>];

const STRING = 1 as const;
const INT = 2 as const;
const DOUBLE = 3 as const;
const BOOL = 4 as const;
const EPS = 1e-4;

function vertexParams(object: NavigationObject): Record<string, RmfParam> {
  const params: Record<string, RmfParam> = {};
  if (object.type === 'charging_station') params.is_charger = [BOOL, true];
  if (object.type === 'parking') params.is_parking_spot = [BOOL, true];
  if (object.type === 'waiting') params.is_holding_point = [BOOL, true];
  if (object.type === 'docking_station') params.dock_name = [STRING, object.name];
  if (object.type === 'pickup') params.pickup_dispenser = [STRING, object.name];
  if (object.type === 'dropoff') params.dropoff_ingestor = [STRING, object.name];
  if (Math.abs(object.yaw) > EPS) params.amr_yaw = [DOUBLE, object.yaw];
  params.amr_object_type = [STRING, object.type];
  return params;
}

function samePoint(a: Point2D, b: Point2D) {
  return Math.abs(a.x - b.x) <= EPS && Math.abs(a.y - b.y) <= EPS;
}

/**
 * Convert ROS/world coordinates (meters) into Traffic Editor reference-image pixels.
 *
 * ROS occupancy map convention:
 * - origin = pose of the lower-left map corner in world coordinates
 * - image pixels use top-left origin and +Y downward
 *
 * originYaw is handled by applying the inverse map-origin rotation before converting
 * meters to pixels.
 */
export function worldToReferenceImage(point: Point2D, metadata: MapMetadata): Point2D {
  const resolution = metadata.resolution;
  if (!(resolution > 0)) {
    throw new Error('RMF export requires map resolution > 0.');
  }

  const dx = point.x - metadata.originX;
  const dy = point.y - metadata.originY;
  const c = Math.cos(metadata.originYaw);
  const s = Math.sin(metadata.originYaw);

  // Rotate world delta by -originYaw to recover map-local Cartesian coordinates.
  const localX = c * dx + s * dy;
  const localY = -s * dx + c * dy;

  return {
    x: localX / resolution,
    y: metadata.height - (localY / resolution),
  };
}

/**
 * A world yaw expressed in ROS Cartesian coordinates becomes a clockwise/image-space
 * yaw after removing map origin rotation and flipping the image Y axis.
 */
export function worldYawToReferenceImage(yaw: number, metadata: MapMetadata) {
  return -(yaw - metadata.originYaw);
}

export interface BuildingYamlOptions {
  buildingName?: string;
  levelName?: string;
  referenceLevelName?: string;
  elevation?: number;
  drawingFilename?: string;
}

/**
 * Generate an Open-RMF Traffic Editor building file using reference-image coordinates.
 *
 * Why reference_image:
 * - Traffic Editor's base drawing is an image measured in pixels.
 * - AMR Map Editor stores navigation/building geometry in ROS/world meters.
 * - Exporting meter vertices next to an unscaled PNG drawing causes the scale mismatch
 *   visible in Traffic Editor.
 *
 * This exporter converts every geometry point back into the exact source-map pixel frame
 * and emits a full-width measurement whose real distance is width * resolution. Traffic
 * Editor can therefore recover the correct meters-per-pixel scale from the drawing.
 */
export function buildingPayload(
  metadata: MapMetadata,
  objects: NavigationObject[],
  paths: NavigationPath[],
  building: BuildingData,
  options: BuildingYamlOptions = {},
) {
  const levelName = options.levelName || building.config.levelName || 'L1';
  const vertices: RmfVertex[] = [];

  const toImage = (point: Point2D) => worldToReferenceImage(point, metadata);

  const findOrAddImage = (
    point: Point2D,
    name = '',
    params: Record<string, RmfParam> = {},
  ) => {
    const existing = vertices.findIndex(v => samePoint({ x: v[0], y: v[1] }, point));
    if (existing >= 0) {
      if (name && !vertices[existing][3]) vertices[existing][3] = name;
      vertices[existing][4] = { ...vertices[existing][4], ...params };
      return existing;
    }

    vertices.push([point.x, point.y, 0, name, params]);
    return vertices.length - 1;
  };

  const findOrAddWorld = (
    point: Point2D,
    name = '',
    params: Record<string, RmfParam> = {},
  ) => findOrAddImage(toImage(point), name, params);

  for (const object of objects.filter(o => o.enabled)) {
    findOrAddWorld(object, object.name || object.id, vertexParams(object));
  }

  const lanes: RmfLane[] = [];
  for (const path of paths.filter(p => p.enabled && p.points.length >= 2)) {
    for (let i = 0; i < path.points.length - 1; i += 1) {
      const start = findOrAddWorld(path.points[i]);
      const end = findOrAddWorld(path.points[i + 1]);
      if (start === end) continue;

      const params: Record<string, RmfParam> = {
        bidirectional: [BOOL, path.type !== 'one_way'],
        graph_idx: [INT, 0],
        orientation: [STRING, path.orientation ?? ''],
        speed_limit: [DOUBLE, path.maxSpeed ?? 0],
        amr_path_type: [STRING, path.type],
        amr_path_id: [STRING, path.id],
      };
      lanes.push([start, end, params]);
    }
  }

  const walls: RmfEdge[] = building.walls.filter(w => w.enabled).map(w => [
    findOrAddWorld(w.start),
    findOrAddWorld(w.end),
    {
      alpha: [DOUBLE, w.alpha],
      texture_height: [DOUBLE, w.textureHeight],
      texture_name: [STRING, w.textureName],
      texture_scale: [DOUBLE, w.textureScale],
      texture_width: [DOUBLE, w.textureWidth],
      amr_wall_id: [STRING, w.id],
    },
  ]);

  const doors: RmfEdge[] = building.doors.filter(d => d.enabled).map(d => [
    findOrAddWorld(d.start),
    findOrAddWorld(d.end),
    {
      motion_axis: [STRING, d.motionAxis],
      motion_degrees: [DOUBLE, d.motionDegrees],
      motion_direction: [INT, d.motionDirection],
      name: [STRING, d.name],
      plugin: [STRING, d.plugin],
      right_left_ratio: [DOUBLE, d.rightLeftRatio],
      type: [STRING, d.type],
      amr_door_id: [STRING, d.id],
    },
  ]);

  const floors = building.floors
    .filter(f => f.enabled && f.polygon.length >= 3)
    .map(f => ({
      parameters: {
        ceiling_scale: [DOUBLE, f.ceilingScale] as RmfParam,
        ceiling_texture: [STRING, f.ceilingTexture] as RmfParam,
        indoor: [INT, f.indoor ? 1 : 0] as RmfParam,
        texture_name: [STRING, f.textureName] as RmfParam,
        texture_rotation: [DOUBLE, f.textureRotation] as RmfParam,
        texture_scale: [DOUBLE, f.textureScale] as RmfParam,
        amr_floor_name: [STRING, f.name] as RmfParam,
      },
      vertices: f.polygon.map(point => findOrAddWorld(point)),
    }));

  // Keep user-defined measurements, but transform endpoints to image pixels.
  const measurements: RmfEdge[] = building.measurements
    .filter(m => m.enabled && m.distance > 0)
    .map(m => [
      findOrAddWorld(m.start),
      findOrAddWorld(m.end),
      {
        distance: [DOUBLE, m.distance],
        amr_measurement_name: [STRING, m.name],
      },
    ]);

  // Always include one long reference measurement so Traffic Editor gets the exact
  // occupancy-map resolution even if the user has no manual measurement.
  //
  // Pixel endpoints are placed along the bottom edge of the image:
  // (0, H) -> (W, H)
  // Real distance = W * resolution meters.
  if (metadata.width > 0 && metadata.resolution > 0) {
    const a = findOrAddImage({ x: 0, y: metadata.height });
    const b = findOrAddImage({ x: metadata.width, y: metadata.height });
    measurements.push([
      a,
      b,
      {
        distance: [DOUBLE, metadata.width * metadata.resolution],
        amr_measurement_name: [STRING, '__AMR_MAP_RESOLUTION__'],
      },
    ]);
  }

  const models = building.models.filter(m => m.enabled).map(m => {
    const p = toImage({ x: m.x, y: m.y });
    return {
      dispensable: m.dispensable,
      model_name: m.modelName,
      name: m.name,
      static: m.static,
      x: p.x,
      y: p.y,
      yaw: worldYawToReferenceImage(m.yaw, metadata),
      z: m.z,
    };
  });

  return {
    name: options.buildingName || building.config.buildingName || metadata.name || 'AMR_Map',
    reference_level_name:
      options.referenceLevelName || building.config.referenceLevelName || levelName,
    coordinate_system: 'reference_image',
    levels: {
      [levelName]: {
        elevation: options.elevation ?? building.config.elevation ?? 0,
        drawing: { filename: options.drawingFilename || '' },
        doors,
        fiducials: [],
        floors,
        lanes,
        layers: {},
        measurements,
        models,
        vertices,
        walls,
      },
    },
    lifts: {},
  };
}

export function generateBuildingYaml(
  metadata: MapMetadata,
  objects: NavigationObject[],
  paths: NavigationPath[],
  building: BuildingData,
  options: BuildingYamlOptions = {},
) {
  return YAML.stringify(buildingPayload(metadata, objects, paths, building, options));
}

export function downloadBuildingYaml(
  metadata: MapMetadata,
  objects: NavigationObject[],
  paths: NavigationPath[],
  building: BuildingData,
  fileName = 'map',
) {
  const base = exportBaseName(fileName, 'map');
  const text = generateBuildingYaml(metadata, objects, paths, building, {
    buildingName: building.config.buildingName || metadata.name || base,
    levelName: building.config.levelName || 'L1',
    referenceLevelName:
      building.config.referenceLevelName || building.config.levelName || 'L1',
    elevation: building.config.elevation,
    drawingFilename: `${base}.png`,
  });

  downloadTextFile(
    text,
    `${base}.building.yaml`,
    'application/yaml;charset=utf-8',
  );
}
