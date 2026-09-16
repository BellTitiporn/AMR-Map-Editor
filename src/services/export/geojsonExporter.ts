import type {
  BuildingData,
  MapMetadata,
  MapZone,
  NavigationObject,
  NavigationPath,
} from '../../models';
import { downloadTextFile, exportBaseName } from '../../utils/files';

type Position = [number, number];

type GeoJsonGeometry =
  | { type: 'Point'; coordinates: Position }
  | { type: 'LineString'; coordinates: Position[] }
  | { type: 'Polygon'; coordinates: Position[][] };

type GeoJsonFeature = {
  type: 'Feature';
  id?: string;
  properties: Record<string, unknown>;
  geometry: GeoJsonGeometry;
};

export type AMRGeoJsonFeatureCollection = {
  type: 'FeatureCollection';
  name: string;
  properties: {
    source: 'AMR Map Editor';
    coordinateSystem: 'local_cartesian_meters';
    frame: 'map';
    units: 'meters';
    map: {
      id: string;
      name: string;
      width: number;
      height: number;
      resolution: number;
      origin: [number, number, number];
    };
  };
  features: GeoJsonFeature[];
};

function point(x: number, y: number): Position {
  return [x, y];
}

function closedRing(points: { x: number; y: number }[]): Position[] {
  const coordinates = points.map(p => point(p.x, p.y));
  if (!coordinates.length) return coordinates;

  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    coordinates.push([first[0], first[1]]);
  }
  return coordinates;
}

function objectFeature(object: NavigationObject): GeoJsonFeature {
  return {
    type: 'Feature',
    id: object.id,
    properties: {
      entity: 'navigation_object',
      id: object.id,
      name: object.name,
      objectType: object.type,
      yaw: object.yaw,
      headingDegrees: object.yaw * 180 / Math.PI,
      description: object.description ?? '',
      enabled: object.enabled,
      metadata: object.metadata,
    },
    geometry: {
      type: 'Point',
      coordinates: point(object.x, object.y),
    },
  };
}

function pathFeature(path: NavigationPath): GeoJsonFeature {
  return {
    type: 'Feature',
    id: path.id,
    properties: {
      entity: 'navigation_path',
      id: path.id,
      name: path.name,
      pathType: path.type,
      orientation: path.orientation ?? '',
      bidirectional: path.type !== 'one_way',
      maxSpeed: path.maxSpeed ?? null,
      width: path.width ?? null,
      safetyClearance: path.safetyClearance ?? null,
      priority: path.priority ?? null,
      robotTypes: path.robotTypes ?? [],
      enabled: path.enabled,
    },
    geometry: {
      type: 'LineString',
      coordinates: path.points.map(p => point(p.x, p.y)),
    },
  };
}

function zoneFeature(zone: MapZone): GeoJsonFeature {
  return {
    type: 'Feature',
    id: zone.id,
    properties: {
      entity: 'zone',
      id: zone.id,
      name: zone.name,
      zoneType: zone.type,
      maxSpeed: zone.maxSpeed ?? null,
      robotTypes: zone.robotTypes ?? [],
      enabled: zone.enabled,
      metadata: zone.metadata,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [closedRing(zone.polygon)],
    },
  };
}

function buildingFeatures(building: BuildingData): GeoJsonFeature[] {
  const features: GeoJsonFeature[] = [];

  for (const wall of building.walls.filter(x => x.enabled)) {
    features.push({
      type: 'Feature',
      id: wall.id,
      properties: {
        entity: 'building_wall',
        id: wall.id,
        name: wall.name,
        alpha: wall.alpha,
        textureName: wall.textureName,
        textureScale: wall.textureScale,
        textureWidth: wall.textureWidth,
        textureHeight: wall.textureHeight,
        enabled: wall.enabled,
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          point(wall.start.x, wall.start.y),
          point(wall.end.x, wall.end.y),
        ],
      },
    });
  }

  for (const door of building.doors.filter(x => x.enabled)) {
    features.push({
      type: 'Feature',
      id: door.id,
      properties: {
        entity: 'building_door',
        id: door.id,
        name: door.name,
        doorType: door.type,
        motionAxis: door.motionAxis,
        motionDegrees: door.motionDegrees,
        motionDirection: door.motionDirection,
        plugin: door.plugin,
        rightLeftRatio: door.rightLeftRatio,
        enabled: door.enabled,
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          point(door.start.x, door.start.y),
          point(door.end.x, door.end.y),
        ],
      },
    });
  }

  for (const floor of building.floors.filter(x => x.enabled && x.polygon.length >= 3)) {
    features.push({
      type: 'Feature',
      id: floor.id,
      properties: {
        entity: 'building_floor',
        id: floor.id,
        name: floor.name,
        textureName: floor.textureName,
        textureScale: floor.textureScale,
        textureRotation: floor.textureRotation,
        ceilingTexture: floor.ceilingTexture,
        ceilingScale: floor.ceilingScale,
        indoor: floor.indoor,
        enabled: floor.enabled,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [closedRing(floor.polygon)],
      },
    });
  }

  for (const model of building.models.filter(x => x.enabled)) {
    features.push({
      type: 'Feature',
      id: model.id,
      properties: {
        entity: 'building_model',
        id: model.id,
        name: model.name,
        modelName: model.modelName,
        yaw: model.yaw,
        z: model.z,
        static: model.static,
        dispensable: model.dispensable,
        enabled: model.enabled,
      },
      geometry: {
        type: 'Point',
        coordinates: point(model.x, model.y),
      },
    });
  }

  for (const measurement of building.measurements.filter(x => x.enabled)) {
    features.push({
      type: 'Feature',
      id: measurement.id,
      properties: {
        entity: 'building_measurement',
        id: measurement.id,
        name: measurement.name,
        distance: measurement.distance,
        enabled: measurement.enabled,
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          point(measurement.start.x, measurement.start.y),
          point(measurement.end.x, measurement.end.y),
        ],
      },
    });
  }

  return features;
}

/**
 * GeoJSON export uses the editor's local map/world coordinates in metres.
 *
 * Note: RFC 7946 normally assumes WGS84 longitude/latitude. AMR factory maps are
 * local Cartesian maps, so this exporter intentionally records local coordinates
 * and declares that fact in the FeatureCollection's foreign `properties` member.
 */
export function generateGeoJson(
  metadata: MapMetadata,
  objects: NavigationObject[],
  paths: NavigationPath[],
  zones: MapZone[],
  building: BuildingData,
): AMRGeoJsonFeatureCollection {
  const features: GeoJsonFeature[] = [
    ...objects.filter(x => x.enabled).map(objectFeature),
    ...paths.filter(x => x.enabled && x.points.length >= 2).map(pathFeature),
    ...zones.filter(x => x.enabled && x.polygon.length >= 3).map(zoneFeature),
    ...buildingFeatures(building),
  ];

  return {
    type: 'FeatureCollection',
    name: metadata.name || 'AMR_Map',
    properties: {
      source: 'AMR Map Editor',
      coordinateSystem: 'local_cartesian_meters',
      frame: 'map',
      units: 'meters',
      map: {
        id: metadata.id,
        name: metadata.name,
        width: metadata.width,
        height: metadata.height,
        resolution: metadata.resolution,
        origin: [metadata.originX, metadata.originY, metadata.originYaw],
      },
    },
    features,
  };
}

export function downloadGeoJson(
  metadata: MapMetadata,
  objects: NavigationObject[],
  paths: NavigationPath[],
  zones: MapZone[],
  building: BuildingData,
  fileName = 'map',
): void {
  const base = exportBaseName(fileName, 'map');
  const geojson = generateGeoJson(metadata, objects, paths, zones, building);
  downloadTextFile(
    JSON.stringify(geojson, null, 2),
    `${base}.geojson`,
    'application/geo+json;charset=utf-8',
  );
}
