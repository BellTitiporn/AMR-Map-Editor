import { useEffect, useRef, useState } from 'react';
import { Arrow, Circle, Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from 'react-konva';
import { createUuid } from '../../utils/uuid';
import { useEditorStore } from '../../state/editorStore';
import { useProjectStore } from '../../state/projectStore';
import { pixelToWorld, worldToPixel } from '../../map-engine/coordinates';
import { factoryObstacleRects } from '../../map-engine/factorySeed';
import { distance, polylineLength } from '../../geometry/distance';
import { polygonArea } from '../../geometry/polygon';
import { headingLabel, normalizeAngle, radiansToDegrees } from '../../geometry/angles';
import { DEFAULT_PATH_SNAP_DISTANCE_M } from '../../geometry/pathTopology';
import { findDoorWallSnap, findPathDrawSnap, findWallEndpointSnap } from '../../geometry/snapEngine';
import { paintOccupancy, paintOccupancyShape } from '../../services/mapEditing/occupancyEditor';

import { BuildingLayer } from './layers/BuildingLayer';
import { ZoneLayer } from './layers/ZoneLayer';
import { PathLayer } from './layers/PathLayer';
import { ObjectLayer } from './layers/ObjectLayer';
import { ValidationLayer } from './layers/ValidationLayer';
import { SnapOverlay } from './overlays/SnapOverlay';
import { RobotFootprint } from './overlays/RobotFootprint';
import { useCanvasKeyboard } from './hooks/useCanvasKeyboard';
import { usePathDrawing } from './hooks/usePathDrawing';
import { useBuildingDrawing } from './hooks/useBuildingDrawing';
import { useCanvasPointer, type CanvasPoint } from './hooks/useCanvasPointer';

type BrushDrag = { kind: 'line' | 'rectangle'; start: CanvasPoint; end: CanvasPoint };
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
  const [brushDrag, setBrushDrag] = useState<BrushDrag | null>(null);
  const [brushPolygon, setBrushPolygon] = useState<CanvasPoint[]>([]);
  const [measure, setMeasure] = useState<CanvasPoint[]>([]);

  const { hover, setHover, pointerWorld, wheel } = useCanvasPointer();
  const { drawing, setDrawing, addDrawingPoint, finishPathOrZone } = usePathDrawing();
  const {
    buildingDrawing,
    setBuildingDrawing,
    doorAnchorWallId,
    setDoorAnchorWallId,
    finishBuildingFloor,
    addBuildingPoint,
  } = useBuildingDrawing();

  useEffect(() => {
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => { if (e.tool !== 'measure') setMeasure([]); }, [e.tool]);
  useEffect(() => {
    if (e.tool !== 'brush') {
      setBrushDrag(null);
      setBrushPolygon([]);
    }
  }, [e.tool]);
  useEffect(() => {
    if (!p.image) {
      setMapImage(null);
      return;
    }
    const img = new Image();
    img.onload = () => setMapImage(img);
    img.src = p.image.dataUrl;
    return () => { img.onload = null; };
  }, [p.image]);

  const finishBrushPolygon = async () => {
    if (e.tool !== 'brush' || e.brushShape !== 'polygon' || brushPolygon.length < 3 || paintBusy.current) return;
    paintBusy.current = true;
    try {
      p.commit();
      const points = brushPolygon.map(q => worldToPixel(q.x, q.y, p.metadata));
      p.updateMapImage(await paintOccupancyShape(p.image, p.metadata, { shape: 'polygon', points }, 'obstacle', e.brushColor));
      setBrushPolygon([]);
    } finally {
      paintBusy.current = false;
    }
  };

  useCanvasKeyboard({
    finishPathOrZone,
    finishBrushPolygon,
    finishBuildingFloor,
    setDrawing,
    setBuildingDrawing,
    setMeasure,
    setBrushDrag,
    setBrushPolygon,
  });

  const paintPoint = async (evt: any) => {
    if (paintBusy.current) return;
    paintBusy.current = true;
    try {
      const w = pointerWorld(evt);
      const px = worldToPixel(w.x, w.y, p.metadata);
      p.updateMapImage(await paintOccupancy(p.image, p.metadata, px.x, px.y, e.tool === 'eraser' ? 'erase' : 'obstacle', e.brushSize, e.brushColor));
    } finally {
      paintBusy.current = false;
    }
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
      p.updateMapImage(await paintOccupancyShape(p.image, p.metadata, command, 'obstacle', e.brushColor));
    } finally {
      paintBusy.current = false;
    }
  };

  const click = (evt: any) => {
    const raw = pointerWorld(evt);
    const pathSnap = e.tool === 'path' ? findPathDrawSnap(raw, p.objects, p.paths) : null;
    const wallSnap = e.tool === 'building' && e.buildingTool === 'wall' ? findWallEndpointSnap(raw, p.building.walls) : null;
    const doorSnap = e.tool === 'building' && e.buildingTool === 'door'
      ? findDoorWallSnap(raw, p.building.walls, {
          maxDistance: doorAnchorWallId ? DEFAULT_PATH_SNAP_DISTANCE_M * 3 : DEFAULT_PATH_SNAP_DISTANCE_M,
          wallId: doorAnchorWallId ?? undefined,
        })
      : null;
    const w = pathSnap?.point ?? wallSnap?.point ?? doorSnap?.point ?? raw;

    if (e.tool === 'building' && e.buildingTool === 'door' && !buildingDrawing?.points.length && doorSnap) {
      setDoorAnchorWallId(doorSnap.targetId);
    }

    e.setCursor(w);
    if (e.tool === 'building' && e.buildingTool) {
      addBuildingPoint(w);
      return;
    }
    if (e.tool === 'brush' && e.brushShape === 'polygon') {
      setBrushPolygon(points => [...points, w]);
      return;
    }
    if (e.placementObject) {
      p.commit();
      const prefix = e.placementObject === 'waypoint' ? 'WP' : e.placementObject.toUpperCase();
      const id = `${prefix}-${createUuid().slice(0, 6)}`;
      const objectMetadata = e.placementObject === 'pickup'
        ? { pickup_dispenser: id }
        : e.placementObject === 'dropoff'
          ? { dropoff_ingestor: id }
          : {};
      p.addObject({ id, name: id, type: e.placementObject, x: w.x, y: w.y, yaw: 0, enabled: true, metadata: objectMetadata });
      e.setSelection([id]);
      e.setPlacementObject(null);
    } else if (e.tool === 'path' || e.tool === 'zone') {
      addDrawingPoint(e.tool, w);
    } else if (e.tool === 'measure') {
      setMeasure(points => [...points, w]);
    } else if (evt.target === evt.target.getStage()) {
      e.setSelection([]);
    }
  };

  const dbl = () => {
    if (e.tool === 'brush' && e.brushShape === 'polygon') {
      void finishBrushPolygon();
      return;
    }
    if (e.tool === 'building' && e.buildingTool === 'floor') {
      finishBuildingFloor();
      return;
    }
    finishPathOrZone();
  };

  const pan = e.tool === 'pan';
  const selectedObject = p.objects.find(o => e.selection.includes(o.id));
  const measurementPoints = hover && e.tool === 'measure' && measure.length ? [...measure, hover] : measure;
  const measurementTotal = e.measureMode === 'area' && measure.length >= 3 ? polygonArea(measure) : polylineLength(measure);
  const brushPreviewPoints = brushPolygon.length ? [...brushPolygon, ...(hover && e.tool === 'brush' && e.brushShape === 'polygon' ? [hover] : [])] : [];

  return (
    <div
      ref={wrap}
      className="canvaswrap"
      onDragOver={event => { event.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={event => {
        event.preventDefault();
        setDragOver(false);
        const files = Array.from(event.dataTransfer.files);
        if (files.length) window.dispatchEvent(new CustomEvent('amr-import-files', { detail: files }));
      }}
    >
      <Stage
        width={size.w}
        height={size.h}
        x={e.viewport.x}
        y={e.viewport.y}
        scaleX={e.viewport.scale}
        scaleY={e.viewport.scale}
        draggable={pan}
        onDragEnd={event => {
          if (event.target === event.target.getStage()) {
            e.setViewport({ ...e.viewport, x: event.target.x(), y: event.target.y() });
          }
        }}
        onWheel={wheel}
        onClick={click}
        onDblClick={dbl}
        onMouseDown={event => {
          if (e.tool === 'eraser' || (e.tool === 'brush' && e.brushShape === 'freehand')) {
            painting.current = true;
            p.commit();
            void paintPoint(event);
          } else if (e.tool === 'brush' && (e.brushShape === 'line' || e.brushShape === 'rectangle')) {
            const w = pointerWorld(event);
            p.commit();
            setBrushDrag({ kind: e.brushShape, start: w, end: w });
          }
        }}
        onMouseUp={() => {
          painting.current = false;
          if (brushDrag) {
            const draft = brushDrag;
            setBrushDrag(null);
            void applyBrushDrag(draft);
          }
        }}
        onMouseLeave={() => { painting.current = false; }}
        onMouseMove={event => {
          const w = pointerWorld(event);
          setHover(w);
          e.setCursor(w);
          if (painting.current && (e.tool === 'eraser' || (e.tool === 'brush' && e.brushShape === 'freehand'))) void paintPoint(event);
          if (brushDrag) setBrushDrag({ ...brushDrag, end: w });
        }}
      >
        <Layer listening={false}>
          <Rect width={p.metadata.width} height={p.metadata.height} fill="#e8ecef" stroke="#555f69" strokeWidth={1 / e.viewport.scale} />
          {e.layers.occupancy.visible && mapImage ? <KonvaImage image={mapImage} width={p.metadata.width} height={p.metadata.height} /> : !p.image && <Factory scale={e.viewport.scale} />}
          {e.layers.grid.visible && <Grid width={p.metadata.width} height={p.metadata.height} scale={e.viewport.scale} />}
          <Origin scale={e.viewport.scale} />
        </Layer>

        <BuildingLayer buildingDrawing={buildingDrawing} />
        <ZoneLayer drawing={drawing} />
        <PathLayer drawing={drawing} />
        <SnapOverlay hover={hover} doorAnchorWallId={doorAnchorWallId} />
        <ObjectLayer />

        {selectedObject && e.tool === 'select' && <Layer><RotationHandle object={selectedObject} scale={e.viewport.scale} /></Layer>}
        {(brushDrag || brushPreviewPoints.length > 0) && <Layer listening={false}><BrushPreview drag={brushDrag} polygon={brushPreviewPoints} scale={e.viewport.scale} color={e.brushColor} /></Layer>}
        {e.layers.robot.visible && selectedObject && <Layer listening={false}><RobotFootprint object={selectedObject} scale={e.viewport.scale} /></Layer>}
        <ValidationLayer />
        {e.tool === 'measure' && measurementPoints.length > 0 && <Layer listening={false}><Measurement points={measurementPoints} fixed={measure} mode={e.measureMode} scale={e.viewport.scale} /></Layer>}
      </Stage>

      {dragOver && <div className="dropoverlay">Drop map files here</div>}
      {(e.tool === 'brush' || e.tool === 'eraser') && (
        <div className="brushbar">
          <span className="toolcaption">{e.tool === 'eraser' ? 'Eraser' : 'Brush'}</span>
          {e.tool === 'brush' && (
            <div className="brushshapes">
              {(['freehand', 'line', 'rectangle', 'polygon'] as const).map(shape => <button key={shape} className={e.brushShape === shape ? 'active' : ''} onClick={() => { e.setBrushShape(shape); setBrushDrag(null); setBrushPolygon([]); }}>{shape[0].toUpperCase() + shape.slice(1)}</button>)}
            </div>
          )}
          <label>Size <select value={e.brushSize} onChange={event => e.setBrushSize(Number(event.target.value))}>{brushSizes.map(size => <option key={size} value={size}>{size} px</option>)}</select></label>
          {e.tool === 'brush' && <label className="brushcolorlabel">Color <input aria-label="Brush color" type="color" value={e.brushColor} onChange={event => e.setBrushColor(event.target.value)} /><code>{e.brushColor.toUpperCase()}</code></label>}
          {e.tool === 'brush' && e.brushShape === 'polygon' && brushPolygon.length > 0 && <button onClick={() => void finishBrushPolygon()} disabled={brushPolygon.length < 3}>Apply Polygon</button>}
          {e.tool === 'brush' && e.brushShape === 'polygon' && brushPolygon.length > 0 && <button onClick={() => setBrushPolygon([])}>Clear</button>}
        </div>
      )}
      {e.tool === 'measure' && <div className="measurebar"><button className={e.measureMode === 'distance' ? 'active' : ''} onClick={() => { e.setMeasureMode('distance'); setMeasure([]); }}>Distance</button><button className={e.measureMode === 'area' ? 'active' : ''} onClick={() => { e.setMeasureMode('area'); setMeasure([]); }}>Area</button><span>{e.measureMode === 'area' ? `Area: ${measurementTotal.toFixed(2)} m²` : `Total: ${measurementTotal.toFixed(2)} m`}</span><button onClick={() => setMeasure([])}>Clear</button></div>}
      <div className="canvas-hint">{canvasHint(e.tool, e.brushShape, e.brushSize, e.placementObject, e.measureMode)}</div>
    </div>
  );
}

function canvasHint(tool: string, brushShape: string, brushSize: number, placement: string | null, measureMode: string) {
  if (tool === 'path' || tool === 'zone') return 'Click to add points • Double-click/Enter to finish • Esc to cancel';
  if (tool === 'building') return 'RMF Building tool • Wall/Door/Measurement: 2 points • Floor: 3+ points + Enter • Model: 1 point';
  if (tool === 'measure') return `${measureMode === 'area' ? 'Area' : 'Distance'} measurement • Click points • Clear to restart`;
  if (tool === 'pan') return 'Drag to pan • Wheel to zoom';
  if (tool === 'eraser') return `Drag to restore original map pixels • ${brushSize} px`;
  if (tool === 'brush') {
    if (brushShape === 'freehand') return `Freehand obstacle brush • Drag to paint • ${brushSize} px`;
    if (brushShape === 'line') return `Line brush • Drag start → end • ${brushSize} px`;
    if (brushShape === 'rectangle') return 'Rectangle brush • Drag one corner → opposite corner';
    return 'Polygon brush • Click vertices • Double-click/Enter or Apply Polygon to fill';
  }
  if (placement) return `Click map to place ${placement.replaceAll('_', ' ')}`;
  return 'Wheel to zoom • V Select • H Pan';
}

function BrushPreview({ drag, polygon, scale, color }: { drag: BrushDrag | null; polygon: CanvasPoint[]; scale: number; color: string }) {
  const p = useProjectStore();
  if (drag) {
    const a = worldToPixel(drag.start.x, drag.start.y, p.metadata);
    const b = worldToPixel(drag.end.x, drag.end.y, p.metadata);
    if (drag.kind === 'line') return <Line points={[a.x, a.y, b.x, b.y]} stroke={color} dash={[6 / scale, 4 / scale]} strokeWidth={Math.max(2 / scale, useEditorStore.getState().brushSize)} lineCap="round" opacity={0.7} />;
    return <Rect x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)} width={Math.abs(b.x - a.x)} height={Math.abs(b.y - a.y)} fill={`${color}33`} stroke={color} dash={[6 / scale, 4 / scale]} strokeWidth={2 / scale} />;
  }
  if (polygon.length) {
    const pts = polygon.flatMap(q => { const v = worldToPixel(q.x, q.y, p.metadata); return [v.x, v.y]; });
    return <Line points={pts} closed={polygon.length > 2} fill={polygon.length > 2 ? `${color}29` : undefined} stroke={color} dash={[6 / scale, 4 / scale]} strokeWidth={2 / scale} />;
  }
  return null;
}

function Grid({ width, height, scale }: { width: number; height: number; scale: number }) {
  return <>{Array.from({ length: Math.ceil(width / 100) + 1 }, (_, i) => <Line key={`v${i}`} points={[i * 100, 0, i * 100, height]} stroke="#b9c0c6" strokeWidth={0.6 / scale} />)}{Array.from({ length: Math.ceil(height / 100) + 1 }, (_, i) => <Line key={`h${i}`} points={[0, i * 100, width, i * 100]} stroke="#b9c0c6" strokeWidth={0.6 / scale} />)}</>;
}

function Origin({ scale }: { scale: number }) {
  const p = useProjectStore();
  const v = worldToPixel(0, 0, p.metadata);
  return <><Circle x={v.x} y={v.y} radius={5 / scale} fill="#ef4444" /><Text x={v.x + 8 / scale} y={v.y - 15 / scale} text="ORIGIN" fontSize={10 / scale} fill="#991b1b" /></>;
}

function Factory({ scale }: { scale: number }) {
  return <>{factoryObstacleRects.map((r, i) => <Rect key={i} x={r.x} y={r.y} width={r.width} height={r.height} fill={i < 10 ? '#414b55' : '#7b858f'} />)}<Text x={52} y={58} text="CHARGING" fontSize={14 / scale} fill="#63707c" /><Text x={585} y={65} text="LOADING" fontSize={14 / scale} fill="#63707c" /><Text x={360} y={540} text="PRODUCTION" fontSize={14 / scale} fill="#63707c" /><Text x={110} y={500} text="WAREHOUSE AISLES" fontSize={14 / scale} fill="#63707c" /></>;
}

function RotationHandle({ object, scale }: { object: { id: string; x: number; y: number; yaw: number }; scale: number }) {
  const p = useProjectStore();
  const e = useEditorStore();
  const station = ['charging_station', 'docking_station'].includes((p.objects.find(o => o.id === object.id)?.type) ?? '');
  const locked = station ? e.layers.stations.locked : e.layers.waypoints.locked;
  if (locked) return null;

  const origin = worldToPixel(object.x, object.y, p.metadata);
  const distancePx = 34 / scale;
  const hx = origin.x + Math.cos(object.yaw) * distancePx;
  const hy = origin.y - Math.sin(object.yaw) * distancePx;
  const update = (x: number, y: number) => {
    const dx = x - origin.x;
    const dy = y - origin.y;
    if (Math.hypot(dx, dy) < 1 / scale) return;
    p.updateObject(object.id, { yaw: normalizeAngle(Math.atan2(-dy, dx)) });
  };

  return (
    <Group>
      <Line points={[origin.x, origin.y, hx, hy]} stroke="#0284c7" dash={[4 / scale, 3 / scale]} strokeWidth={1.5 / scale} listening={false} />
      <Circle x={hx} y={hy} radius={7 / scale} fill="#fff" stroke="#0284c7" strokeWidth={2 / scale} draggable onMouseEnter={ev => { const stage = ev.target.getStage(); if (stage) stage.container().style.cursor = 'grab'; }} onMouseLeave={ev => { const stage = ev.target.getStage(); if (stage) stage.container().style.cursor = 'default'; }} onDragStart={ev => { ev.cancelBubble = true; p.commit(); const stage = ev.target.getStage(); if (stage) stage.container().style.cursor = 'grabbing'; }} onDragMove={ev => { ev.cancelBubble = true; update(ev.target.x(), ev.target.y()); }} onDragEnd={ev => { ev.cancelBubble = true; update(ev.target.x(), ev.target.y()); const stage = ev.target.getStage(); if (stage) stage.container().style.cursor = 'grab'; }} onClick={ev => { ev.cancelBubble = true; }} />
      <Text x={origin.x + 10 / scale} y={origin.y + 12 / scale} text={`${headingLabel(object.yaw)}  ${radiansToDegrees(object.yaw).toFixed(1)}°`} fontSize={9 / scale} fill="#0369a1" listening={false} />
    </Group>
  );
}

function Measurement({ points, fixed, mode, scale }: { points: CanvasPoint[]; fixed: CanvasPoint[]; mode: 'distance' | 'area'; scale: number }) {
  const p = useProjectStore();
  const px = points.flatMap(q => { const v = worldToPixel(q.x, q.y, p.metadata); return [v.x, v.y]; });
  return <><Line points={px} closed={mode === 'area' && points.length > 2} stroke="#0ea5e9" fill={mode === 'area' ? 'rgba(14,165,233,.10)' : undefined} dash={[5 / scale, 3 / scale]} strokeWidth={2 / scale} />{fixed.map((q, i) => { const v = worldToPixel(q.x, q.y, p.metadata); const seg = i > 0 ? distance(fixed[i - 1], q) : 0; return <Group key={i} x={v.x} y={v.y}><Circle radius={4 / scale} fill="#0ea5e9" /><Text x={6 / scale} y={-15 / scale} text={i ? `${seg.toFixed(2)} m` : `P${i + 1}`} fontSize={10 / scale} fill="#075985" /></Group>; })}</>;
}
