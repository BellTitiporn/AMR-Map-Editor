import { describe, expect, it } from 'vitest';
import type { NavigationObject, NavigationPath } from '../models';
import { connectPathEndpoint, endpointConnectionStatus, findNearestMergeCandidate, mergeWithNearestPath } from '../geometry/pathTopology';

const path = (id: string, points: {x:number;y:number}[], type: NavigationPath['type'] = 'bidirectional'): NavigationPath => ({ id, name:id, type, points, enabled:true });
const object = (id: string, x: number, y: number): NavigationObject => ({ id, name:id, type:'waypoint', x, y, yaw:0, enabled:true, metadata:{} });

describe('path topology', () => {
  it('snaps an endpoint to a navigation object', () => {
    const paths = [path('A', [{x:0,y:0},{x:0.9,y:0}])];
    const objects = [object('WP-1', 1, 0)];
    const result = connectPathEndpoint(paths, objects, 'A', 'end', 0.25);
    expect(result.candidate?.kind).toBe('object');
    expect(result.paths[0].points.at(-1)).toEqual({x:1,y:0});
    expect(endpointConnectionStatus(result.paths, objects, 'A', 'end').connected).toBe(true);
  });

  it('creates a junction vertex when endpoint snaps to the middle of another path', () => {
    const paths = [
      path('A', [{x:0,y:0},{x:1,y:0.1}]),
      path('B', [{x:1,y:-1},{x:1,y:1}]),
    ];
    const result = connectPathEndpoint(paths, [], 'A', 'end', 0.25);
    const a = result.paths.find(x => x.id === 'A')!;
    const b = result.paths.find(x => x.id === 'B')!;
    expect(a.points.at(-1)).toEqual({x:1,y:0.1});
    expect(b.points.some(p => Math.abs(p.x-1)<1e-9 && Math.abs(p.y-0.1)<1e-9)).toBe(true);
    expect(endpointConnectionStatus(result.paths, [], 'A', 'end').connected).toBe(true);
  });

  it('merges compatible paths sharing nearby endpoints', () => {
    const paths = [
      path('A', [{x:0,y:0},{x:1,y:0}]),
      path('B', [{x:1.1,y:0},{x:2,y:0}]),
    ];
    const candidate = findNearestMergeCandidate(paths, 'A', 0.25);
    expect(candidate?.compatible).toBe(true);
    const result = mergeWithNearestPath(paths, 'A', 0.25)!;
    expect(result.paths).toHaveLength(1);
    expect(result.paths[0].id).toBe('A');
    expect(result.paths[0].points).toHaveLength(3);
  });

  it('does not merge paths with different routing types', () => {
    const paths = [
      path('A', [{x:0,y:0},{x:1,y:0}], 'one_way'),
      path('B', [{x:1,y:0},{x:2,y:0}], 'bidirectional'),
    ];
    const candidate = findNearestMergeCandidate(paths, 'A', 0.25);
    expect(candidate?.compatible).toBe(false);
    expect(mergeWithNearestPath(paths, 'A', 0.25)).toBeNull();
  });
});
