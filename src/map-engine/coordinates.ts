import type { MapMetadata,Point2D } from '../models';
export interface Viewport { x:number; y:number; scale:number; }
export type ScreenCoordinate=Point2D;export type CanvasCoordinate=Point2D;export type PixelCoordinate=Point2D;export type WorldCoordinate=Point2D;
// ROS map world Y increases upward while browser pixel Y increases downward. Keep that inversion here only.
export const worldToPixel=(x:number,y:number,m:MapMetadata):PixelCoordinate=>({x:(x-m.originX)/m.resolution,y:m.height-(y-m.originY)/m.resolution});
export const pixelToWorld=(px:number,py:number,m:MapMetadata):WorldCoordinate=>({x:m.originX+px*m.resolution,y:m.originY+(m.height-py)*m.resolution});
export const worldToScreen=(x:number,y:number,m:MapMetadata,v:Viewport)=>{const p=worldToPixel(x,y,m);return{x:v.x+p.x*v.scale,y:v.y+p.y*v.scale}};
export const screenToWorld=(sx:number,sy:number,m:MapMetadata,v:Viewport)=>pixelToWorld((sx-v.x)/v.scale,(sy-v.y)/v.scale,m);
export const clampZoom=(z:number)=>Math.max(.05,Math.min(10,z));
export const degreesToRadians=(d:number)=>d*Math.PI/180;export const radiansToDegrees=(r:number)=>r*180/Math.PI;export const normalizeAngle=(r:number)=>Math.atan2(Math.sin(r),Math.cos(r));
