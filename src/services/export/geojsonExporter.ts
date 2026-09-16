import type {
  BuildingData,
  MapMetadata,
  MapZone,
  NavigationObject,
  NavigationPath,
} from '../../models';
import {
  downloadTextFile,
  exportBaseName,
} from '../../utils/files';

type XY = {
  x: number;
  y: number;
};

type GraphPointFeature = {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    frame: '';
    id: number;
    name?: string;
    pickup_dispenser?: string;
    dropoff_ingestor?: string;
  };
};

type GraphEdgeFeature = {
  type: 'Feature';
  geometry: {
    type: 'MultiLineString';
  };
  properties: {
    id: number;
    startid: number;
    endid: number;
    cost: 0;
    overridable: true;
  };
};

export type ReferenceGraphGeoJson = {
  crs: {
    type: 'name';
    properties: {
      name: 'urn:ogc:def:crs:EPSG::3857';
    };
  };
  type: 'FeatureCollection';
  name: 'graph';
  features: Array<GraphPointFeature | GraphEdgeFeature>;
};

const EPS = 1e-6;

function samePoint(a: XY, b: XY): boolean {
  return (
    Math.abs(a.x - b.x) <= EPS &&
    Math.abs(a.y - b.y) <= EPS
  );
}

/**
 * Reference geojson format:
 *
 * - top-level CRS EPSG:3857
 * - FeatureCollection name = "graph"
 * - every graph/building vertex is a Point Feature
 * - path segments are represented as MultiLineString Feature records
 *   with startid/endid instead of a coordinate array
 * - bidirectional paths create 2 directed edge records
 *
 * This intentionally matches the supplied reference structure and does not
 * add AMR-specific properties such as pathType/orientation/maxSpeed.
 */
export function generateGeoJson(
  _metadata: MapMetadata,
  objects: NavigationObject[],
  paths: NavigationPath[],
  _zones: MapZone[],
  building: BuildingData,
): ReferenceGraphGeoJson {
  type PointProperties = {
    name?: string;
    pickup_dispenser?: string;
    dropoff_ingestor?: string;
  };

  type PointRecord = XY & {
    properties: PointProperties;
  };

  const points: PointRecord[] = [];

  const findOrAddPoint = (
    point: XY,
    properties: PointProperties = {},
  ): number => {
    const existing = points.findIndex(
      p => samePoint(p, point),
    );

    if (existing >= 0) {
      points[existing] = {
        ...points[existing],
        properties: {
          ...points[existing].properties,
          ...properties,
        },
      };
      return existing;
    }

    points.push({
      x: point.x,
      y: point.y,
      properties: { ...properties },
    });

    return points.length - 1;
  };

  /**
   * Match the reference graph style by collecting the shared vertex pool,
   * while leaving entity-specific metadata out.
   */

  for (const measurement of building.measurements) {
    if (!measurement.enabled) continue;

    findOrAddPoint(measurement.start);
    findOrAddPoint(measurement.end);
  }

  for (const wall of building.walls) {
    if (!wall.enabled) continue;

    findOrAddPoint(wall.start);
    findOrAddPoint(wall.end);
  }

  for (const door of building.doors) {
    if (!door.enabled) continue;

    findOrAddPoint(door.start);
    findOrAddPoint(door.end);
  }

  for (const floor of building.floors) {
    if (!floor.enabled) continue;

    for (const point of floor.polygon) {
      findOrAddPoint(point);
    }
  }

  for (const model of building.models) {
    if (!model.enabled) continue;

    findOrAddPoint({
      x: model.x,
      y: model.y,
    });
  }

  for (const object of objects) {
    if (!object.enabled) continue;

    const pointProperties: {
      name?: string;
      pickup_dispenser?: string;
      dropoff_ingestor?: string;
    } = {
      name: object.name || object.id,
    };

    if (object.type === 'pickup') {
      pointProperties.pickup_dispenser =
        typeof object.metadata?.pickup_dispenser === 'string' &&
        object.metadata.pickup_dispenser.trim()
          ? object.metadata.pickup_dispenser.trim()
          : object.name || object.id;
    }

    if (object.type === 'dropoff') {
      pointProperties.dropoff_ingestor =
        typeof object.metadata?.dropoff_ingestor === 'string' &&
        object.metadata.dropoff_ingestor.trim()
          ? object.metadata.dropoff_ingestor.trim()
          : object.name || object.id;
    }

    findOrAddPoint(
      {
        x: object.x,
        y: object.y,
      },
      pointProperties,
    );
  }

  /**
   * Add path vertices after all explicit project vertices.
   * Shared coordinates reuse the same point ID.
   */
  for (const path of paths) {
    if (!path.enabled) continue;

    for (const point of path.points) {
      findOrAddPoint(point);
    }
  }

  const features: Array<
    GraphPointFeature | GraphEdgeFeature
  > = points.map(
    (point, id): GraphPointFeature => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [
          point.x,
          point.y,
        ],
      },
      properties: {
        frame: '',
        id,
        ...(point.properties.name ? { name: point.properties.name } : {}),
        ...(point.properties.pickup_dispenser
          ? { pickup_dispenser: point.properties.pickup_dispenser }
          : {}),
        ...(point.properties.dropoff_ingestor
          ? { dropoff_ingestor: point.properties.dropoff_ingestor }
          : {}),
      },
    }),
  );

  let nextFeatureId = points.length;

  const addEdge = (
    startid: number,
    endid: number,
  ) => {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'MultiLineString',
      },
      properties: {
        id: nextFeatureId++,
        startid,
        endid,
        cost: 0,
        overridable: true,
      },
    });
  };

  for (const path of paths) {
    if (
      !path.enabled ||
      path.points.length < 2
    ) {
      continue;
    }

    for (
      let i = 0;
      i < path.points.length - 1;
      i += 1
    ) {
      const startid = findOrAddPoint(
        path.points[i],
      );

      const endid = findOrAddPoint(
        path.points[i + 1],
      );

      if (startid === endid) {
        continue;
      }

      // Forward edge always follows the stored path point order.
      addEdge(startid, endid);

      // Reference graph stores bidirectional travel as a separate reverse edge.
      if (path.type !== 'one_way') {
        addEdge(endid, startid);
      }
    }
  }

  return {
    crs: {
      type: 'name',
      properties: {
        name: 'urn:ogc:def:crs:EPSG::3857',
      },
    },
    type: 'FeatureCollection',
    name: 'graph',
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
  const base = exportBaseName(
    fileName,
    'map',
  );

  const geojson = generateGeoJson(
    metadata,
    objects,
    paths,
    zones,
    building,
  );

  downloadTextFile(
    JSON.stringify(
      geojson,
      null,
      2,
    ),
    `${base}.geojson`,
    'application/geo+json;charset=utf-8',
  );
}
