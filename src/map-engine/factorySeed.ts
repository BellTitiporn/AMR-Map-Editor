export interface PixelRect { x:number; y:number; width:number; height:number }

// Lightweight occupancy geometry used by the seed factory map and validation.
// A real imported occupancy raster can replace this adapter later.
export const factoryObstacleRects: PixelRect[] = [
  {x:28,y:33,width:794,height:6}, {x:28,y:583,width:794,height:6},
  {x:28,y:33,width:6,height:556}, {x:818,y:33,width:6,height:556},
  {x:30,y:187,width:218,height:6}, {x:242,y:35,width:6,height:158},
  {x:527,y:35,width:6,height:158}, {x:530,y:187,width:292,height:6},
  {x:342,y:317,width:6,height:272}, {x:612,y:317,width:6,height:272},
  ...[120,170,220,270,320,370,420].map(x=>({x:x-5,y:250,width:10,height:220})),
]
