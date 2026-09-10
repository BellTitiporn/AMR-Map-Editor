import { expect, it } from 'vitest';
import { navigationPayload, waypointPayload } from '../services/export/navigationExporters';
import { generateRosYaml } from '../services/export/rosExporter';

it('exports waypoint world coordinates unchanged', () => {
  const payload = waypointPayload([
    { id: 'WP-001', name: 'A', type: 'waypoint', x: 12.4, y: 8.1, yaw: 1.5708, enabled: true, metadata: {} },
  ]);
  expect(payload.waypoints[0].x).toBe(12.4);
});

it('exports one navigation JSON containing waypoints, paths and zones', () => {
  const payload = navigationPayload(
    { id: 'map-1', name: 'Factory', width: 1000, height: 500, resolution: 0.05, originX: -10, originY: -8, originYaw: 0 },
    [{ id: 'WP-001', name: 'Loading', type: 'waypoint', x: 12.4, y: 8.1, yaw: 1.5708, enabled: true, metadata: {} }],
    [{ id: 'PATH-001', name: 'Main', type: 'one_way', points: [{ x: 12.4, y: 8.1 }, { x: 14, y: 8.1 }], enabled: true }],
    [{ id: 'ZONE-001', name: 'Slow', type: 'slow', polygon: [{ x: 10, y: 10 }, { x: 15, y: 10 }, { x: 15, y: 14 }], enabled: true, metadata: {} }],
    [],
  );

  expect(payload.format).toBe('AMR_NAVIGATION');
  expect(payload.frame).toBe('map');
  expect(payload.waypoints).toHaveLength(1);
  expect(payload.paths).toHaveLength(1);
  expect(payload.zones).toHaveLength(1);
  expect(payload.map.worldWidth).toBe(50);
  expect(payload.map.origin.x).toBe(-10);
  expect(payload.paths[0].points[0].x).toBe(12.4);
});

it('generates ROS YAML from metadata', () => {
  const text = generateRosYaml(
    { id: 'm', name: 'm', width: 2, height: 2, resolution: 0.025, originX: -1, originY: -2, originYaw: 0.1 },
    { dataUrl: 'data:', mimeType: 'image/png', originalFilename: 'x.png', sourceFormat: 'png', negate: 0, occupiedThresh: 0.7, freeThresh: 0.2 },
  );
  expect(text).toContain('resolution: 0.025');
  expect(text).toContain('- -1');
});
