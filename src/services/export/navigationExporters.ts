import type {
  MapMetadata,
  MapZone,
  NavigationObject,
  NavigationPath,
  RobotConfig,
} from '../../models';
import { downloadJSON } from '../../utils/files';

export interface NavigationJsonPayload {
  format: 'AMR_NAVIGATION';
  version: '1.0';
  frame: 'map';
  exportedAt: string;
  map: {
    id: string;
    name: string;
    widthPx: number;
    heightPx: number;
    resolution: number;
    worldWidth: number;
    worldHeight: number;
    origin: {
      x: number;
      y: number;
      yaw: number;
    };
  };
  waypoints: Array<{
    id: string;
    name: string;
    type: NavigationObject['type'];
    x: number;
    y: number;
    yaw: number;
    enabled: boolean;
    description?: string;
    metadata: Record<string, unknown>;
  }>;
  paths: NavigationPath[];
  zones: MapZone[];
  robotConfigs: RobotConfig[];
}

export const waypointPayload = (objects: NavigationObject[]) => ({
  version: '1.0',
  frame: 'map',
  waypoints: objects.map(({ id, name, type, x, y, yaw, enabled }) => ({
    id,
    name,
    type,
    x,
    y,
    yaw,
    enabled,
  })),
});

export const pathPayload = (paths: NavigationPath[]) => ({
  version: '1.0',
  frame: 'map',
  paths,
});

export const zonePayload = (zones: MapZone[]) => ({
  version: '1.0',
  frame: 'map',
  zones,
});

/**
 * Build the portable navigation file used by robot/fleet integrations.
 * All positions are world coordinates in meters in the `map` frame.
 */
export const navigationPayload = (
  metadata: MapMetadata,
  objects: NavigationObject[],
  paths: NavigationPath[],
  zones: MapZone[],
  robotConfigs: RobotConfig[] = [],
): NavigationJsonPayload => ({
  format: 'AMR_NAVIGATION',
  version: '1.0',
  frame: 'map',
  exportedAt: new Date().toISOString(),
  map: {
    id: metadata.id,
    name: metadata.name,
    widthPx: metadata.width,
    heightPx: metadata.height,
    resolution: metadata.resolution,
    worldWidth: metadata.width * metadata.resolution,
    worldHeight: metadata.height * metadata.resolution,
    origin: {
      x: metadata.originX,
      y: metadata.originY,
      yaw: metadata.originYaw,
    },
  },
  // "waypoints" intentionally contains every navigable point/station type.
  // Consumers can filter by the `type` field when they need only plain waypoints.
  waypoints: objects.map(({ id, name, type, x, y, yaw, enabled, description, metadata: objectMetadata }) => ({
    id,
    name,
    type,
    x,
    y,
    yaw,
    enabled,
    ...(description ? { description } : {}),
    metadata: objectMetadata,
  })),
  paths,
  zones,
  robotConfigs,
});

export function downloadWaypoints(objects: NavigationObject[], name = 'waypoints.json') {
  downloadJSON(waypointPayload(objects), name);
}

export function downloadPaths(paths: NavigationPath[], name = 'paths.json') {
  downloadJSON(pathPayload(paths), name);
}

export function downloadZones(zones: MapZone[], name = 'zones.json') {
  downloadJSON(zonePayload(zones), name);
}

export function downloadNavigation(
  metadata: MapMetadata,
  objects: NavigationObject[],
  paths: NavigationPath[],
  zones: MapZone[],
  robotConfigs: RobotConfig[] = [],
  name = 'navigation.json',
) {
  downloadJSON(navigationPayload(metadata, objects, paths, zones, robotConfigs), name);
}
