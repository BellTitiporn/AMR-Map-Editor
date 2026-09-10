export type Point={x:number;y:number};
export const distance=(a:Point,b:Point)=>Math.hypot(b.x-a.x,b.y-a.y);
export const polylineLength=(pts:Point[])=>pts.slice(1).reduce((s,p,i)=>s+distance(pts[i],p),0);
