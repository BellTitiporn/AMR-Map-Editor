import { describe, expect, it } from 'vitest';
import { resizeWall, wallAngleDegrees, wallLength } from '../geometry/wall';

describe('wall geometry', () => {
  it('calculates length and angle', () => {
    expect(wallLength({x:0,y:0},{x:3,y:4})).toBeCloseTo(5);
    expect(wallAngleDegrees({x:0,y:0},{x:0,y:2})).toBeCloseTo(90);
  });

  it('extends from start', () => {
    const r=resizeWall({x:1,y:1},{x:2,y:1},5,0,'start');
    expect(r.start).toEqual({x:1,y:1});
    expect(r.end.x).toBeCloseTo(6);
    expect(r.end.y).toBeCloseTo(1);
  });

  it('extends around center', () => {
    const r=resizeWall({x:0,y:0},{x:2,y:0},4,0,'center');
    expect(r.start.x).toBeCloseTo(-1);
    expect(r.end.x).toBeCloseTo(3);
  });
});
