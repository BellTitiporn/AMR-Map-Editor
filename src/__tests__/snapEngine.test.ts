import { describe, expect, it } from 'vitest';
import { findDoorWallSnap, findPathDrawSnap, findWallEndpointSnap, projectToWall } from '../geometry/snapEngine';
import type { BuildingWall, NavigationObject, NavigationPath } from '../models';

const wall: BuildingWall = {
  id: 'W1', name: 'Wall 1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, enabled: true,
  alpha: 1, textureName: 'wall', textureScale: 1, textureWidth: 1, textureHeight: 2.5,
};

it('snaps wall endpoint to another wall endpoint', () => {
  const target = findWallEndpointSnap({ x: 9.9, y: 0.05 }, [wall], { maxDistance: 0.25 });
  expect(target?.kind).toBe('wall_endpoint');
  expect(target?.point).toEqual({ x: 10, y: 0 });
});

it('snaps a door point to the wall segment', () => {
  const target = findDoorWallSnap({ x: 4, y: 0.1 }, [wall], { maxDistance: 0.25 });
  expect(target?.point.x).toBeCloseTo(4);
  expect(target?.point.y).toBeCloseTo(0);
});

it('projects door second point to the same wall for auto alignment', () => {
  expect(projectToWall({ x: 7, y: 0.4 }, wall)).toEqual({ x: 7, y: 0 });
});

it('prioritizes navigation object for path drawing', () => {
  const objects: NavigationObject[] = [{ id:'P1', name:'Pickup', type:'pickup', x:2, y:2, yaw:0, enabled:true, metadata:{} }];
  const paths: NavigationPath[] = [{ id:'Path1', name:'Path 1', type:'normal', points:[{x:2.1,y:2},{x:5,y:2}], enabled:true }];
  const target = findPathDrawSnap({ x:2.02, y:2 }, objects, paths, 0.25);
  expect(target?.kind).toBe('object');
  expect(target?.targetId).toBe('P1');
});
