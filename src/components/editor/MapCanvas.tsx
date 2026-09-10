import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Line, Circle, Text, Arrow, Group, Image as KonvaImage } from 'react-konva';
import { useEditorStore } from '../../state/editorStore';
import { useProjectStore } from '../../state/projectStore';
import { screenToWorld, worldToPixel, pixelToWorld, clampZoom } from '../../map-engine/coordinates';
import { factoryObstacleRects } from '../../map-engine/factorySeed';
import { distance, polylineLength } from '../../geometry/distance';
import { polygonArea } from '../../geometry/polygon';
import { headingLabel, normalizeAngle, radiansToDegrees } from '../../geometry/angles';
import { paintOccupancy, paintOccupancyShape } from '../../services/mapEditing/occupancyEditor';
import type { MapMetadata, NavigationPath } from '../../models';

const zoneFill: Record<string, string> = {
  no_go:'rgba(239,68,68,.22)', slow:'rgba(245,158,11,.20)', restricted:'rgba(168,85,247,.20)', parking:'rgba(59,130,246,.18)',
  loading:'rgba(14,165,233,.18)', unloading:'rgba(6,182,212,.18)', human_traffic:'rgba(250,204,21,.18)', safety:'rgba(34,197,94,.18)'
};
type Point = { x: number; y: number };
type BrushDrag = { kind: 'line' | 'rectangle'; start: Point; end: Point };
const brushSizes = [1, 3, 5, 10, 20, 50];

export function MapCanvas() {
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 620 });
  const e = useEditorStore();
  const p = useProjectStore();
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const painting = useRef(false);
  const paintBusy = useRef(false);
  const clipboard = useRef<{kind:'object'|'path'|'zone'; value: unknown} | null>(null);
  const [drawing, setDrawing] = useState<{kind:'path'|'zone'; points: Point[]} | null>(null);
  const [brushDrag, setBrushDrag] = useState<BrushDrag | null>(null);
  const [brushPolygon, setBrushPolygon] = useState<Point[]>([]);
  const [measure, setMeasure] = useState<Point[]>([]);
  const [hover, setHover] = useState<Point | null>(null);

  useEffect(() => {
    const ro = new ResizeObserver(([x]) => setSize({ w: x.contentRect.width, h: x.contentRect.height }));
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => { if (e.tool !== 'measure') setMeasure([]); }, [e.tool]);
  useEffect(() => {
    if (e.tool !== 'brush') { setBrushDrag(null); setBrushPolygon([]); }
  }, [e.tool]);
  useEffect(() => {
    if (!p.image) { setMapImage(null); return; }
    const img = new Image();
    img.onload = () => setMapImage(img);
    img.src = p.image.dataUrl;
    return () => { img.onload = null; };
  }, [p.image]);

  const finishPathOrZone = () => {
    if (!drawing) return;
    if (drawing.kind === 'path' && drawing.points.length > 1) {
      p.commit();
      const id = 'P-' + crypto.randomUUID().slice(0, 8);
      p.addPath({ id, name: 'New Path', type: e.pathType, points: drawing.points, width: 1, maxSpeed: 1, enabled: true });
      e.setSelection([id]);
    } else if (drawing.kind === 'zone' && drawing.points.length > 2) {
      p.commit();
      const id = 'Z-' + crypto.randomUUID().slice(0, 8);
      p.addZone({ id, name: 'New Zone', type: e.zoneType, polygon: drawing.points, enabled: true, metadata: {} });
      e.setSelection([id]);
    }
    setDrawing(null);
    e.setTool('select');
  };

  const finishBrushPolygon = async () => {
    if (e.tool !== 'brush' || e.brushShape !== 'polygon' || brushPolygon.length < 3 || paintBusy.current) return;
    paintBusy.current = true;
    try {
      p.commit();
      const points = brushPolygon.map(q => worldToPixel(q.x, q.y, p.metadata));
      p.updateMapImage(await paintOccupancyShape(p.image, p.metadata, { shape: 'polygon', points }, 'obstacle'));
      setBrushPolygon([]);
    } finally {
      paintBusy.current = false;
    }
  };

  useEffect(() => {
    const duplicate = () => {
      const id = e.selection[0];
      if (!id) return;
      const o = p.objects.find(q => q.id === id), path = p.paths.find(q => q.id === id), zone = p.zones.find(q => q.id === id);
      p.commit();
      if (o) {
        const c = {...structuredClone(o), id:o.id+'-'+crypto.randomUUID().slice(0,4), name:o.name+' Copy', x:o.x+.5, y:o.y+.5};
        p.addObject(c); e.setSelection([c.id]);
      } else if (path) {
        const c = {...structuredClone(path), id:path.id+'-'+crypto.randomUUID().slice(0,4), name:path.name+' Copy', points:path.points.map(q=>({x:q.x+.5,y:q.y+.5}))};
        p.addPath(c); e.setSelection([c.id]);
      } else if (zone) {
        const c = {...structuredClone(zone), id:zone.id+'-'+crypto.randomUUID().slice(0,4), name:zone.name+' Copy', polygon:zone.polygon.map(q=>({x:q.x+.5,y:q.y+.5}))};
        p.addZone(c); e.setSelection([c.id]);
      }
    };
    const key = (x: KeyboardEvent) => {
      const tag = (x.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const m = x.metaKey || x.ctrlKey, keyName = x.key.toLowerCase();
      if (m && keyName === 's') { x.preventDefault(); void p.saveLocal(); }
      else if (m && keyName === 'z') { x.preventDefault(); x.shiftKey ? p.redoAction() : p.undoAction(); }
      else if (m && keyName === 'd') { x.preventDefault(); duplicate(); }
      else if (m && keyName === 'c') {
        const id=e.selection[0], o=p.objects.find(q=>q.id===id), pa=p.paths.find(q=>q.id===id), z=p.zones.find(q=>q.id===id);
        clipboard.current=o?{kind:'object',value:structuredClone(o)}:pa?{kind:'path',value:structuredClone(pa)}:z?{kind:'zone',value:structuredClone(z)}:null;
      } else if (m && keyName === 'v' && clipboard.current) {
        x.preventDefault(); const c=clipboard.current; p.commit();
        if (c.kind==='object') { const o=structuredClone(c.value) as typeof p.objects[number]; o.id=o.id+'-'+crypto.randomUUID().slice(0,4);o.name+=' Copy';o.x+=.5;o.y+=.5;p.addObject(o);e.setSelection([o.id]); }
        else if(c.kind==='path') { const pa=structuredClone(c.value) as typeof p.paths[number];pa.id=pa.id+'-'+crypto.randomUUID().slice(0,4);pa.name+=' Copy';pa.points=pa.points.map(q=>({x:q.x+.5,y:q.y+.5}));p.addPath(pa);e.setSelection([pa.id]); }
        else { const z=structuredClone(c.value) as typeof p.zones[number];z.id=z.id+'-'+crypto.randomUUID().slice(0,4);z.name+=' Copy';z.polygon=z.polygon.map(q=>({x:q.x+.5,y:q.y+.5}));p.addZone(z);e.setSelection([z.id]); }
      } else if (x.key === 'Enter') {
        if (e.tool === 'brush' && e.brushShape === 'polygon') void finishBrushPolygon();
        else finishPathOrZone();
      } else if (x.key === 'Delete' && e.selection.length) {
        p.commit(); p.deleteIds(e.selection); e.setSelection([]);
      } else if (x.key === 'Escape') {
        setDrawing(null); setMeasure([]); setBrushDrag(null); setBrushPolygon([]); e.setTool('select');
      } else if (!m) {
        const map: Record<string, typeof e.tool> = {v:'select',h:'pan',b:'brush',e:'eraser',p:'path',z:'zone',m:'measure'};
        const t = map[keyName]; if (t) e.setTool(t);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [drawing, brushPolygon, e, p]);

  const pointerWorld = (evt: any) => {
    const st = evt.target.getStage(), pos = st.getPointerPosition();
    return screenToWorld(pos.x, pos.y, p.metadata, e.viewport);
  };

  const paintPoint = async (evt: any) => {
    if (paintBusy.current) return;
    paintBusy.current = true;
    try {
      const w = pointerWorld(evt), px = worldToPixel(w.x, w.y, p.metadata);
      p.updateMapImage(await paintOccupancy(p.image, p.metadata, px.x, px.y, e.tool === 'eraser' ? 'erase' : 'obstacle', e.brushSize));
    } finally { paintBusy.current = false; }
  };

  const applyBrushDrag = async (draft: BrushDrag) => {
    if (paintBusy.current) return;
    paintBusy.current = true;
    try {
      const from = worldToPixel(draft.start.x, draft.start.y, p.metadata);
      const to = worldToPixel(draft.end.x, draft.end.y, p.metadata);
      const command = draft.kind === 'line'
        ? { shape: 'line' as const, from, to, size: e.brushSize }
        : { shape: 'rectangle' as const, from, to };
      p.updateMapImage(await paintOccupancyShape(p.image, p.metadata, command, 'obstacle'));
    } finally { paintBusy.current = false; }
  };

  const click = (evt: any) => {
    const w = pointerWorld(evt); e.setCursor(w);
    if (e.tool === 'brush' && e.brushShape === 'polygon') {
      setBrushPolygon(points => [...points, w]);
      return;
    }
    if (e.placementObject) {
      p.commit();
      const prefix=e.placementObject==='waypoint'?'WP':e.placementObject.toUpperCase();
      const id=`${prefix}-${crypto.randomUUID().slice(0,6)}`;
      p.addObject({id,name:id,type:e.placementObject,x:w.x,y:w.y,yaw:0,enabled:true,metadata:{}});e.setSelection([id]);e.setPlacementObject(null);
    } else if (e.tool==='path'||e.tool==='zone') {
      setDrawing(d=>d&&d.kind===e.tool?{...d,points:[...d.points,w]}:{kind:e.tool as 'path'|'zone',points:[w]});
    } else if(e.tool==='measure') setMeasure(m=>[...m,w]);
    else if(evt.target===evt.target.getStage()) e.setSelection([]);
  };

  const dbl = () => {
    if (e.tool === 'brush' && e.brushShape === 'polygon') { void finishBrushPolygon(); return; }
    finishPathOrZone();
  };

  const wheel = (evt: any) => {
    evt.evt.preventDefault();
    const st=evt.target.getStage(),pt=st.getPointerPosition(),old=e.viewport.scale;
    const next=clampZoom(old*(evt.evt.deltaY>0?.88:1.12));
    const mouse={x:(pt.x-e.viewport.x)/old,y:(pt.y-e.viewport.y)/old};
    e.setViewport({scale:next,x:pt.x-mouse.x*next,y:pt.y-mouse.y*next});
  };

  const pan=e.tool==='pan';
  const selectedObject=p.objects.find(o=>e.selection.includes(o.id));
  const measurementPoints=hover&&e.tool==='measure'&&measure.length?[...measure,hover]:measure;
  const measurementTotal=e.measureMode==='area'&&measure.length>=3?polygonArea(measure):polylineLength(measure);

  const brushPreviewPoints = brushPolygon.length
    ? [...brushPolygon, ...(hover && e.tool === 'brush' && e.brushShape === 'polygon' ? [hover] : [])]
    : [];

  return <div ref={wrap} className="canvaswrap"
    onDragOver={ev=>{ev.preventDefault();setDragOver(true)}}
    onDragLeave={()=>setDragOver(false)}
    onDrop={ev=>{ev.preventDefault();setDragOver(false);const files=Array.from(ev.dataTransfer.files);if(files.length)window.dispatchEvent(new CustomEvent('amr-import-files',{detail:files}))}}>
    <Stage width={size.w} height={size.h} x={e.viewport.x} y={e.viewport.y} scaleX={e.viewport.scale} scaleY={e.viewport.scale} draggable={pan}
      onDragEnd={x=>{if(x.target===x.target.getStage())e.setViewport({...e.viewport,x:x.target.x(),y:x.target.y()})}}
      onWheel={wheel} onClick={click} onDblClick={dbl}
      onMouseDown={x=>{
        if (e.tool === 'eraser' || (e.tool === 'brush' && e.brushShape === 'freehand')) { painting.current=true;p.commit();void paintPoint(x); }
        else if (e.tool === 'brush' && (e.brushShape === 'line' || e.brushShape === 'rectangle')) { const w=pointerWorld(x);p.commit();setBrushDrag({kind:e.brushShape,start:w,end:w}); }
      }}
      onMouseUp={()=>{
        painting.current=false;
        if (brushDrag) { const draft=brushDrag;setBrushDrag(null);void applyBrushDrag(draft); }
      }}
      onMouseLeave={()=>{painting.current=false}}
      onMouseMove={x=>{
        const w=pointerWorld(x);setHover(w);e.setCursor(w);
        if(painting.current&&(e.tool==='eraser'||(e.tool==='brush'&&e.brushShape==='freehand')))void paintPoint(x);
        if(brushDrag)setBrushDrag({...brushDrag,end:w});
      }}>
      <Layer listening={false}>
        <Rect width={p.metadata.width} height={p.metadata.height} fill="#e8ecef" stroke="#555f69" strokeWidth={1/e.viewport.scale}/>
        {e.layers.occupancy.visible&&mapImage?<KonvaImage image={mapImage} width={p.metadata.width} height={p.metadata.height}/>:!p.image&&<Factory scale={e.viewport.scale}/>}
        {e.layers.grid.visible&&<Grid width={p.metadata.width} height={p.metadata.height} scale={e.viewport.scale}/>}
        <Origin scale={e.viewport.scale}/>
      </Layer>

      {e.layers.zones.visible&&<Layer>{p.zones.map(z=>{const pts=z.polygon.flatMap(q=>{const v=worldToPixel(q.x,q.y,p.metadata);return[v.x,v.y]});return <Group key={z.id}><Line points={pts} closed fill={zoneFill[z.type]} stroke={e.selection.includes(z.id)?'#0ea5e9':'#8b5e34'} strokeWidth={(e.selection.includes(z.id)?3:1.5)/e.viewport.scale} onClick={ev=>{ev.cancelBubble=true;e.setSelection([z.id])}}/>{e.layers.labels.visible&&<Text x={pts[0]+5} y={pts[1]+5} text={z.name} fontSize={11/e.viewport.scale} fill="#684c2e"/>}{e.selection.includes(z.id)&&!e.layers.zones.locked&&z.polygon.map((q,i)=>{const v=worldToPixel(q.x,q.y,p.metadata);return <Circle key={i} x={v.x} y={v.y} radius={5/e.viewport.scale} fill="#fff" stroke="#0ea5e9" strokeWidth={2/e.viewport.scale} draggable onDragStart={()=>p.commit()} onDragEnd={ev=>{const poly=[...z.polygon];poly[i]=pixelToWorld(ev.target.x(),ev.target.y(),p.metadata);p.updateZone(z.id,{polygon:poly})}}/>})}</Group>})}</Layer>}

      {e.layers.paths.visible&&<Layer>{p.paths.map(path=>{const pts=path.points.flatMap(q=>{const v=worldToPixel(q.x,q.y,p.metadata);return[v.x,v.y]});return <Group key={path.id}><Line points={pts} stroke={e.selection.includes(path.id)?'#0ea5e9':path.type==='restricted'?'#ef4444':'#475569'} strokeWidth={(e.selection.includes(path.id)?4:2.5)/e.viewport.scale} lineCap="round" lineJoin="round" hitStrokeWidth={12/e.viewport.scale} onClick={ev=>{ev.cancelBubble=true;e.setSelection([path.id])}}/><PathDirectionOverlay path={path} metadata={p.metadata} scale={e.viewport.scale} showBadge={e.layers.labels.visible} />{e.selection.includes(path.id)&&!e.layers.paths.locked&&path.points.map((q,i)=>{const v=worldToPixel(q.x,q.y,p.metadata);return <Circle key={i} x={v.x} y={v.y} radius={5/e.viewport.scale} fill="#fff" stroke="#0ea5e9" strokeWidth={2/e.viewport.scale} draggable onDragStart={()=>p.commit()} onDragEnd={ev=>{const pp=[...path.points];pp[i]=pixelToWorld(ev.target.x(),ev.target.y(),p.metadata);p.updatePath(path.id,{points:pp})}}/>})}</Group>})}{drawing?.kind==='path'&&<Line points={drawing.points.flatMap(q=>{const v=worldToPixel(q.x,q.y,p.metadata);return[v.x,v.y]})} stroke="#0ea5e9" dash={[6,4]} strokeWidth={2/e.viewport.scale}/>}</Layer>}

      <Layer>{p.objects.map(o=>{const station=['charging_station','docking_station'].includes(o.type);if(station&&!e.layers.stations.visible)return null;if(!station&&!e.layers.waypoints.visible)return null;const v=worldToPixel(o.x,o.y,p.metadata),selected=e.selection.includes(o.id),locked=station?e.layers.stations.locked:e.layers.waypoints.locked;return <Group key={o.id} x={v.x} y={v.y} rotation={-o.yaw*180/Math.PI} draggable={e.tool==='select'&&!locked} onDragStart={()=>p.commit()} onDragEnd={ev=>p.updateObject(o.id,pixelToWorld(ev.target.x(),ev.target.y(),p.metadata))} onClick={ev=>{ev.cancelBubble=true;e.setSelection([o.id])}}><Circle radius={(station?8:6)/e.viewport.scale} fill={station?'#14b8a6':o.type==='home'?'#3b82f6':'#f8fafc'} stroke={selected?'#0ea5e9':'#26313b'} strokeWidth={(selected?3:1.5)/e.viewport.scale}/><Arrow points={[0,0,16/e.viewport.scale,0]} pointerLength={5/e.viewport.scale} pointerWidth={5/e.viewport.scale} stroke="#26313b" fill="#26313b" strokeWidth={1.5/e.viewport.scale}/>{e.layers.labels.visible&&<Text text={o.name} x={8/e.viewport.scale} y={-18/e.viewport.scale} fontSize={10/e.viewport.scale} fill="#1e293b" rotation={o.yaw*180/Math.PI}/>}</Group>})}{drawing?.kind==='zone'&&<Line points={drawing.points.flatMap(q=>{const v=worldToPixel(q.x,q.y,p.metadata);return[v.x,v.y]})} closed={drawing.points.length>2} fill="rgba(14,165,233,.12)" stroke="#0ea5e9" dash={[6,4]} strokeWidth={2/e.viewport.scale}/>}</Layer>

      {selectedObject && e.tool === 'select' && <Layer><RotationHandle object={selectedObject} scale={e.viewport.scale}/></Layer>}
      {(brushDrag || brushPreviewPoints.length > 0) && <Layer listening={false}><BrushPreview drag={brushDrag} polygon={brushPreviewPoints} scale={e.viewport.scale}/></Layer>}
      {e.layers.robot.visible&&selectedObject&&<Layer listening={false}><RobotFootprint object={selectedObject} scale={e.viewport.scale}/></Layer>}
      {e.layers.validation.visible&&<Layer listening={false}>{p.issues.filter(i=>i.position).map(i=>{const v=worldToPixel(i.position!.x,i.position!.y,p.metadata);return <Group key={i.id} x={v.x} y={v.y}><Circle radius={11/e.viewport.scale} stroke={i.severity==='error'?'#ef4444':'#f59e0b'} strokeWidth={3/e.viewport.scale}/><Line points={[-6/e.viewport.scale,-6/e.viewport.scale,6/e.viewport.scale,6/e.viewport.scale]} stroke={i.severity==='error'?'#ef4444':'#f59e0b'} strokeWidth={2/e.viewport.scale}/><Line points={[-6/e.viewport.scale,6/e.viewport.scale,6/e.viewport.scale,-6/e.viewport.scale]} stroke={i.severity==='error'?'#ef4444':'#f59e0b'} strokeWidth={2/e.viewport.scale}/></Group>})}</Layer>}
      {e.tool==='measure'&&measurementPoints.length>0&&<Layer listening={false}><Measurement points={measurementPoints} fixed={measure} mode={e.measureMode} scale={e.viewport.scale}/></Layer>}
    </Stage>

    {dragOver&&<div className="dropoverlay">Drop map files here</div>}
    {(e.tool==='brush'||e.tool==='eraser')&&<div className="brushbar">
      <span className="toolcaption">{e.tool==='eraser'?'Eraser':'Brush'}</span>
      {e.tool==='brush'&&<div className="brushshapes">
        {(['freehand','line','rectangle','polygon'] as const).map(shape=><button key={shape} className={e.brushShape===shape?'active':''} onClick={()=>{e.setBrushShape(shape);setBrushDrag(null);setBrushPolygon([])}}>{shape[0].toUpperCase()+shape.slice(1)}</button>)}
      </div>}
      <label>Size <select value={e.brushSize} onChange={ev=>e.setBrushSize(Number(ev.target.value))}>{brushSizes.map(s=><option key={s} value={s}>{s} px</option>)}</select></label>
      {e.tool==='brush'&&e.brushShape==='polygon'&&brushPolygon.length>0&&<button onClick={()=>void finishBrushPolygon()} disabled={brushPolygon.length<3}>Apply Polygon</button>}
      {e.tool==='brush'&&e.brushShape==='polygon'&&brushPolygon.length>0&&<button onClick={()=>setBrushPolygon([])}>Clear</button>}
    </div>}
    {e.tool==='measure'&&<div className="measurebar"><button className={e.measureMode==='distance'?'active':''} onClick={()=>{e.setMeasureMode('distance');setMeasure([])}}>Distance</button><button className={e.measureMode==='area'?'active':''} onClick={()=>{e.setMeasureMode('area');setMeasure([])}}>Area</button><span>{e.measureMode==='area'?`Area: ${measurementTotal.toFixed(2)} m²`:`Total: ${measurementTotal.toFixed(2)} m`}</span><button onClick={()=>setMeasure([])}>Clear</button></div>}
    <div className="canvas-hint">{canvasHint(e.tool,e.brushShape,e.brushSize,e.placementObject,e.measureMode)}</div>
  </div>;
}


function PathDirectionOverlay({ path, metadata, scale, showBadge }: { path: NavigationPath; metadata: MapMetadata; scale: number; showBadge: boolean }) {
  if (path.type !== 'one_way' && path.type !== 'bidirectional') return null;
  const stroke = path.type === 'one_way' ? '#075985' : '#17643b';
  const arrows = path.points.slice(0, -1).flatMap((q, i) => {
    const a = worldToPixel(q.x, q.y, metadata);
    const b = worldToPixel(path.points[i + 1].x, path.points[i + 1].y, metadata);
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const nx = -uy, ny = ux;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const half = Math.min(15 / scale, len * .16);
    if (path.type === 'one_way') {
      return [<Arrow key={`one-${i}`} points={[mx-ux*half,my-uy*half,mx+ux*half,my+uy*half]} pointerLength={6/scale} pointerWidth={6/scale} stroke={stroke} fill={stroke} strokeWidth={1.6/scale}/>];
    }
    const off = 4 / scale;
    return [
      <Arrow key={`two-f-${i}`} points={[mx-ux*half+nx*off,my-uy*half+ny*off,mx+ux*half+nx*off,my+uy*half+ny*off]} pointerLength={5.5/scale} pointerWidth={5.5/scale} stroke={stroke} fill={stroke} strokeWidth={1.4/scale}/>,
      <Arrow key={`two-r-${i}`} points={[mx+ux*half-nx*off,my+uy*half-ny*off,mx-ux*half-nx*off,my-uy*half-ny*off]} pointerLength={5.5/scale} pointerWidth={5.5/scale} stroke={stroke} fill={stroke} strokeWidth={1.4/scale}/>
    ];
  });

  if (!showBadge || path.points.length < 2) return <>{arrows}</>;
  const segmentIndex = Math.min(path.points.length - 2, Math.floor((path.points.length - 1) / 2));
  const a = worldToPixel(path.points[segmentIndex].x, path.points[segmentIndex].y, metadata);
  const b = worldToPixel(path.points[segmentIndex + 1].x, path.points[segmentIndex + 1].y, metadata);
  const x = (a.x + b.x) / 2;
  const y = (a.y + b.y) / 2 - 18 / scale;
  const text = path.type === 'one_way' ? 'ONE-WAY  A → B' : 'TWO-WAY  A ↔ B';
  const width = (path.type === 'one_way' ? 88 : 90) / scale;
  return <>
    {arrows}
    <Group x={x-width/2} y={y} listening={false}>
      <Rect width={width} height={16/scale} fill="rgba(255,255,255,.94)" stroke={stroke} strokeWidth={1/scale} cornerRadius={2/scale}/>
      <Text width={width} height={16/scale} align="center" verticalAlign="middle" text={text} fontSize={8.5/scale} fontStyle="bold" fill={stroke}/>
    </Group>
  </>;
}

function canvasHint(tool: string, brushShape: string, brushSize: number, placement: string | null, measureMode: string) {
  if (tool==='path'||tool==='zone') return 'Click to add points • Double-click/Enter to finish • Esc to cancel';
  if (tool==='measure') return `${measureMode==='area'?'Area':'Distance'} measurement • Click points • Clear to restart`;
  if (tool==='pan') return 'Drag to pan • Wheel to zoom';
  if (tool==='eraser') return `Drag to restore original map pixels • ${brushSize} px`;
  if (tool==='brush') {
    if (brushShape==='freehand') return `Freehand obstacle brush • Drag to paint • ${brushSize} px`;
    if (brushShape==='line') return `Line brush • Drag start → end • ${brushSize} px`;
    if (brushShape==='rectangle') return 'Rectangle brush • Drag one corner → opposite corner';
    return 'Polygon brush • Click vertices • Double-click/Enter or Apply Polygon to fill';
  }
  if (placement) return `Click map to place ${placement.replaceAll('_',' ')}`;
  return 'Wheel to zoom • V Select • H Pan';
}

function BrushPreview({drag, polygon, scale}:{drag:BrushDrag|null;polygon:Point[];scale:number}) {
  const p=useProjectStore();
  if (drag) {
    const a=worldToPixel(drag.start.x,drag.start.y,p.metadata),b=worldToPixel(drag.end.x,drag.end.y,p.metadata);
    if (drag.kind==='line') return <Line points={[a.x,a.y,b.x,b.y]} stroke="#ef4444" dash={[6/scale,4/scale]} strokeWidth={Math.max(2/scale, useEditorStore.getState().brushSize)} lineCap="round" opacity={.7}/>;
    return <Rect x={Math.min(a.x,b.x)} y={Math.min(a.y,b.y)} width={Math.abs(b.x-a.x)} height={Math.abs(b.y-a.y)} fill="rgba(239,68,68,.18)" stroke="#ef4444" dash={[6/scale,4/scale]} strokeWidth={2/scale}/>;
  }
  if (polygon.length) {
    const pts=polygon.flatMap(q=>{const v=worldToPixel(q.x,q.y,p.metadata);return[v.x,v.y]});
    return <Line points={pts} closed={polygon.length>2} fill={polygon.length>2?'rgba(239,68,68,.16)':undefined} stroke="#ef4444" dash={[6/scale,4/scale]} strokeWidth={2/scale}/>;
  }
  return null;
}

function Grid({width,height,scale}:{width:number;height:number;scale:number}) { return <>{Array.from({length:Math.ceil(width/100)+1},(_,i)=><Line key={'v'+i} points={[i*100,0,i*100,height]} stroke="#b9c0c6" strokeWidth={.6/scale}/>)}{Array.from({length:Math.ceil(height/100)+1},(_,i)=><Line key={'h'+i} points={[0,i*100,width,i*100]} stroke="#b9c0c6" strokeWidth={.6/scale}/>)}</>; }
function Origin({scale}:{scale:number}) { const p=useProjectStore(),v=worldToPixel(0,0,p.metadata);return <><Circle x={v.x} y={v.y} radius={5/scale} fill="#ef4444"/><Text x={v.x+8/scale} y={v.y-15/scale} text="ORIGIN" fontSize={10/scale} fill="#991b1b"/></>; }
function Factory({scale}:{scale:number}) { return <>{factoryObstacleRects.map((r,i)=><Rect key={i} x={r.x} y={r.y} width={r.width} height={r.height} fill={i<10?'#414b55':'#7b858f'}/>)}<Text x={52} y={58} text="CHARGING" fontSize={14/scale} fill="#63707c"/><Text x={585} y={65} text="LOADING" fontSize={14/scale} fill="#63707c"/><Text x={360} y={540} text="PRODUCTION" fontSize={14/scale} fill="#63707c"/><Text x={110} y={500} text="WAREHOUSE AISLES" fontSize={14/scale} fill="#63707c"/></>; }

function RotationHandle({object,scale}:{object:{id:string;x:number;y:number;yaw:number};scale:number}) {
  const p=useProjectStore();
  const e=useEditorStore();
  const station=['charging_station','docking_station'].includes((p.objects.find(o=>o.id===object.id)?.type) ?? '');
  const locked=station?e.layers.stations.locked:e.layers.waypoints.locked;
  if(locked)return null;
  const origin=worldToPixel(object.x,object.y,p.metadata);
  const distancePx=34/scale;
  const hx=origin.x+Math.cos(object.yaw)*distancePx;
  const hy=origin.y-Math.sin(object.yaw)*distancePx;
  const update=(x:number,y:number)=>{
    const dx=x-origin.x,dy=y-origin.y;
    if(Math.hypot(dx,dy)<1/scale)return;
    p.updateObject(object.id,{yaw:normalizeAngle(Math.atan2(-dy,dx))});
  };
  return <Group>
    <Line points={[origin.x,origin.y,hx,hy]} stroke="#0284c7" dash={[4/scale,3/scale]} strokeWidth={1.5/scale} listening={false}/>
    <Circle x={hx} y={hy} radius={7/scale} fill="#fff" stroke="#0284c7" strokeWidth={2/scale} draggable
      onMouseEnter={ev=>{const stage=ev.target.getStage();if(stage)stage.container().style.cursor='grab'}}
      onMouseLeave={ev=>{const stage=ev.target.getStage();if(stage)stage.container().style.cursor='default'}}
      onDragStart={ev=>{ev.cancelBubble=true;p.commit();const stage=ev.target.getStage();if(stage)stage.container().style.cursor='grabbing'}}
      onDragMove={ev=>{ev.cancelBubble=true;update(ev.target.x(),ev.target.y())}}
      onDragEnd={ev=>{ev.cancelBubble=true;update(ev.target.x(),ev.target.y());const stage=ev.target.getStage();if(stage)stage.container().style.cursor='grab'}}
      onClick={ev=>{ev.cancelBubble=true}}/>
    <Text x={origin.x+10/scale} y={origin.y+12/scale} text={`${headingLabel(object.yaw)}  ${radiansToDegrees(object.yaw).toFixed(1)}°`} fontSize={9/scale} fill="#0369a1" listening={false}/>
  </Group>;
}

function RobotFootprint({object,scale}:{object:{x:number;y:number;yaw:number};scale:number}) { const p=useProjectStore(),v=worldToPixel(object.x,object.y,p.metadata),px=1/p.metadata.resolution;const margin=p.robot.safetyMargin*px;const fp=p.robot.footprint;return <Group x={v.x} y={v.y} rotation={-object.yaw*180/Math.PI}>{fp.type==='circle'?<><Circle radius={fp.radius*px} fill="rgba(14,165,233,.10)" stroke="#0284c7" strokeWidth={2/scale}/><Circle radius={fp.radius*px+margin} stroke="#f59e0b" dash={[5/scale,4/scale]} strokeWidth={1.5/scale}/></>:<><Rect x={-(fp.type==='rectangle'?fp.length:p.robot.length)*px/2} y={-(fp.type==='rectangle'?fp.width:p.robot.width)*px/2} width={(fp.type==='rectangle'?fp.length:p.robot.length)*px} height={(fp.type==='rectangle'?fp.width:p.robot.width)*px} fill="rgba(14,165,233,.10)" stroke="#0284c7" strokeWidth={2/scale}/><Rect x={-(p.robot.length*px/2+margin)} y={-(p.robot.width*px/2+margin)} width={p.robot.length*px+margin*2} height={p.robot.width*px+margin*2} stroke="#f59e0b" dash={[5/scale,4/scale]} strokeWidth={1.5/scale}/></>}<Arrow points={[0,0,22/scale,0]} pointerLength={6/scale} pointerWidth={6/scale} stroke="#0284c7" fill="#0284c7" strokeWidth={2/scale}/></Group>; }
function Measurement({points,fixed,mode,scale}:{points:Point[];fixed:Point[];mode:'distance'|'area';scale:number}) { const p=useProjectStore();const px=points.flatMap(q=>{const v=worldToPixel(q.x,q.y,p.metadata);return[v.x,v.y]});return <><Line points={px} closed={mode==='area'&&points.length>2} stroke="#0ea5e9" fill={mode==='area'?'rgba(14,165,233,.10)':undefined} dash={[5/scale,3/scale]} strokeWidth={2/scale}/>{fixed.map((q,i)=>{const v=worldToPixel(q.x,q.y,p.metadata);const seg=i>0?distance(fixed[i-1],q):0;return <Group key={i} x={v.x} y={v.y}><Circle radius={4/scale} fill="#0ea5e9"/><Text x={6/scale} y={-15/scale} text={i?`${seg.toFixed(2)} m`:`P${i+1}`} fontSize={10/scale} fill="#075985"/></Group>})}</>; }
