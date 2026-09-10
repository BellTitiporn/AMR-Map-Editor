import YAML from 'yaml';
import type { MapMetadata, NavigationObject, NavigationPath } from '../../models';
import { downloadTextFile, exportBaseName } from '../../utils/files';

type RmfParam = [1 | 2 | 3 | 4, string | number | boolean];
type RmfVertex = [number, number, number, string, Record<string, RmfParam>];
type RmfLane = [number, number, Record<string, RmfParam>];

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

function samePoint(a: {x:number;y:number}, b: {x:number;y:number}) {
  return Math.abs(a.x - b.x) <= EPS && Math.abs(a.y - b.y) <= EPS;
}

export interface BuildingYamlOptions {
  buildingName?: string;
  levelName?: string;
  drawingFilename?: string;
}

/**
 * Generate an Open-RMF Traffic Editor style .building.yaml navigation skeleton.
 * Coordinates are exported directly in meters using coordinate_system: cartesian_meters.
 * Navigation objects become named vertices and each path segment becomes a lane.
 */
export function buildingPayload(
  metadata: MapMetadata,
  objects: NavigationObject[],
  paths: NavigationPath[],
  options: BuildingYamlOptions = {},
) {
  const levelName = options.levelName || 'L1';
  const vertices: RmfVertex[] = [];

  const findOrAdd = (point: {x:number;y:number}, name = '', params: Record<string, RmfParam> = {}) => {
    const existing = vertices.findIndex(v => samePoint({x:v[0],y:v[1]}, point));
    if (existing >= 0) {
      if (name && !vertices[existing][3]) vertices[existing][3] = name;
      vertices[existing][4] = { ...vertices[existing][4], ...params };
      return existing;
    }
    vertices.push([point.x, point.y, 0, name, params]);
    return vertices.length - 1;
  };

  for (const object of objects.filter(o => o.enabled)) {
    findOrAdd(object, object.name || object.id, vertexParams(object));
  }

  const lanes: RmfLane[] = [];
  for (const path of paths.filter(p => p.enabled && p.points.length >= 2)) {
    for (let i = 0; i < path.points.length - 1; i += 1) {
      const start = findOrAdd(path.points[i]);
      const end = findOrAdd(path.points[i + 1]);
      if (start === end) continue;
      const params: Record<string, RmfParam> = {
        bidirectional: [BOOL, path.type !== 'one_way'],
        graph_idx: [INT, 0],
        orientation: [STRING, ''],
        speed_limit: [DOUBLE, path.maxSpeed ?? 0],
        amr_path_type: [STRING, path.type],
        amr_path_id: [STRING, path.id],
      };
      lanes.push([start, end, params]);
    }
  }

  return {
    name: options.buildingName || metadata.name || 'AMR_Map',
    reference_level_name: levelName,
    coordinate_system: 'cartesian_meters',
    levels: {
      [levelName]: {
        elevation: 0,
        drawing: { filename: options.drawingFilename || '' },
        doors: [],
        fiducials: [],
        floors: [],
        lanes,
        layers: {},
        measurements: [],
        models: [],
        vertices,
        walls: [],
      },
    },
    lifts: {},
  };
}

export function generateBuildingYaml(
  metadata: MapMetadata,
  objects: NavigationObject[],
  paths: NavigationPath[],
  options: BuildingYamlOptions = {},
) {
  return YAML.stringify(buildingPayload(metadata, objects, paths, options));
}

export function downloadBuildingYaml(
  metadata: MapMetadata,
  objects: NavigationObject[],
  paths: NavigationPath[],
  fileName = 'map',
) {
  const base = exportBaseName(fileName, 'map');
  const text = generateBuildingYaml(metadata, objects, paths, {
    buildingName: metadata.name || base,
    levelName: 'L1',
    drawingFilename: `${base}.png`,
  });
  downloadTextFile(text, `${base}.building.yaml`, 'application/yaml;charset=utf-8');
}
