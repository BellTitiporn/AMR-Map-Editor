import type { MapMetadata, MapZone } from '../models';
import type { PixelRect } from '../map-engine/factorySeed';
import { worldToPixel } from '../map-engine/coordinates';
import { segmentsIntersect } from './polygon';

export type Point={x:number;y:number};
export const pointInPolygon=(p:Point, poly:Point[])=>{
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[i],b=poly[j];
    const hit=((a.y>p.y)!==(b.y>p.y)) && p.x < (b.x-a.x)*(p.y-a.y)/(b.y-a.y || Number.EPSILON)+a.x;
    if(hit)inside=!inside;
  }
  return inside;
};
export const segmentIntersectsPolygon=(a:Point,b:Point,poly:Point[])=>{
  if(pointInPolygon(a,poly)||pointInPolygon(b,poly))return true;
  for(let i=0;i<poly.length;i++) if(segmentsIntersect(a,b,poly[i],poly[(i+1)%poly.length])) return true;
  return false;
};
export const pointInPixelRect=(p:Point,r:PixelRect,m:MapMetadata)=>{
  const q=worldToPixel(p.x,p.y,m);
  return q.x>=r.x&&q.x<=r.x+r.width&&q.y>=r.y&&q.y<=r.y+r.height;
};
export const segmentIntersectsPixelRect=(a:Point,b:Point,r:PixelRect,m:MapMetadata)=>{
  const pa=worldToPixel(a.x,a.y,m),pb=worldToPixel(b.x,b.y,m);
  if(pa.x>=r.x&&pa.x<=r.x+r.width&&pa.y>=r.y&&pa.y<=r.y+r.height)return true;
  if(pb.x>=r.x&&pb.x<=r.x+r.width&&pb.y>=r.y&&pb.y<=r.y+r.height)return true;
  const tl={x:r.x,y:r.y},tr={x:r.x+r.width,y:r.y},br={x:r.x+r.width,y:r.y+r.height},bl={x:r.x,y:r.y+r.height};
  return segmentsIntersect(pa,pb,tl,tr)||segmentsIntersect(pa,pb,tr,br)||segmentsIntersect(pa,pb,br,bl)||segmentsIntersect(pa,pb,bl,tl);
};
export const polygonsOverlap=(a:Point[],b:Point[])=>a.some(p=>pointInPolygon(p,b))||b.some(p=>pointInPolygon(p,a))||a.some((p,i)=>segmentIntersectsPolygon(p,a[(i+1)%a.length],b));
export const zoneContains=(z:MapZone,p:Point)=>pointInPolygon(p,z.polygon);
