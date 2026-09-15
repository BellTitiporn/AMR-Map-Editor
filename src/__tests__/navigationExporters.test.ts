import { expect, it } from 'vitest';
import { navigationPayload } from '../services/export/navigationExporters';

it('preserves waypoint yaw and exposes heading degrees in navigation JSON', () => {
  const metadata = {
    id: 'm',
    name: 'Map',
    width: 100,
    height: 100,
    resolution: 0.05,
    originX: 0,
    originY: 0,
    originYaw: 0,
  };

  const payload = navigationPayload(
    metadata,
    [{
      id: 'CHARGE-01',
      name: 'Charge',
      type: 'charging_station',
      x: 2,
      y: 3,
      yaw: Math.PI / 2,
      enabled: true,
      metadata: {},
    }],
    [],
    [],
    [],
  );

  expect(payload.waypoints[0].yaw).toBeCloseTo(Math.PI / 2);
  expect(payload.waypoints[0].headingDegrees).toBeCloseTo(90);
});
