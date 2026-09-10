import { expect,it } from 'vitest';import { selfIntersects } from '../geometry/polygon';
it('detects self-intersection',()=>expect(selfIntersects([{x:0,y:0},{x:2,y:2},{x:0,y:2},{x:2,y:0}])).toBe(true));
