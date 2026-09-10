import { describe,expect,it } from 'vitest';import { pixelToWorld,worldToPixel } from '../map-engine/coordinates';
const map={id:'m',name:'m',width:1000,height:800,resolution:.05,originX:-10,originY:-8,originYaw:0};
describe('coordinate conversion',()=>{it('round trips pixel/world with ROS Y inversion',()=>{const p={x:123.25,y:456.5},w=pixelToWorld(p.x,p.y,map),q=worldToPixel(w.x,w.y,map);expect(q.x).toBeCloseTo(p.x,8);expect(q.y).toBeCloseTo(p.y,8)})});
