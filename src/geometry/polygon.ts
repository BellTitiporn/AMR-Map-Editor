export const polygonArea=(pts:{x:number;y:number}[])=>Math.abs(pts.reduce((s,p,i)=>{const q=pts[(i+1)%pts.length];return s+p.x*q.y-q.x*p.y},0)/2);
const ccw=(a:any,b:any,c:any)=>(c.y-a.y)*(b.x-a.x)>(b.y-a.y)*(c.x-a.x);
export const segmentsIntersect=(a:any,b:any,c:any,d:any)=>ccw(a,c,d)!==ccw(b,c,d)&&ccw(a,b,c)!==ccw(a,b,d);
export const selfIntersects=(pts:{x:number;y:number}[])=>{for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];for(let j=i+1;j<pts.length;j++){if(Math.abs(i-j)<=1||i===0&&j===pts.length-1)continue;const c=pts[j],d=pts[(j+1)%pts.length];if(segmentsIntersect(a,b,c,d))return true}}return false};
