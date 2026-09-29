import { Circle, Group, Layer, Line, Rect, Text } from 'react-konva';
import { useEditorStore } from '../../../state/editorStore';
import { useProjectStore } from '../../../state/projectStore';
import { pixelToWorld, worldToPixel } from '../../../map-engine/coordinates';
import { DEFAULT_PATH_SNAP_DISTANCE_M } from '../../../geometry/pathTopology';
import { findWallEndpointSnap } from '../../../geometry/snapEngine';
import { entityLayersInteractive } from '../../../map-engine/interactionPolicy';
import type { BuildingDrawing } from '../hooks/useBuildingDrawing';

export function BuildingLayer({ buildingDrawing }: { buildingDrawing: BuildingDrawing | null }) {
  const e = useEditorStore();
  const p = useProjectStore();
  if (!e.layers.building.visible) return null;

  const entityListening = entityLayersInteractive({ tool: e.tool, placementObject: e.placementObject });

  return (
    <Layer listening={entityListening}>
      {p.building.floors.map(f => {
        const pts = f.polygon.flatMap(q => {
          const v = worldToPixel(q.x, q.y, p.metadata);
          return [v.x, v.y];
        });
        return (
          <Group key={f.id}>
            <Line points={pts} closed fill="rgba(148,163,184,.14)" stroke={e.selection.includes(f.id) ? '#0284c7' : '#94a3b8'} strokeWidth={(e.selection.includes(f.id) ? 3 : 1.5) / e.viewport.scale} onClick={ev => { ev.cancelBubble = true; e.setSelection([f.id]); }} />
            {e.layers.labels.visible && pts.length >= 2 && <Text x={pts[0] + 4} y={pts[1] + 4} text={f.name} fontSize={9 / e.viewport.scale} fill="#475569" />}
          </Group>
        );
      })}

      {p.building.walls.map(w => {
        const a = worldToPixel(w.start.x, w.start.y, p.metadata);
        const b = worldToPixel(w.end.x, w.end.y, p.metadata);
        const selected = e.selection.includes(w.id);
        const editable = selected && e.tool === 'select' && !e.layers.building.locked;

        const updateEndpoint = (endpoint: 'start' | 'end', x: number, y: number, snap = false) => {
          const raw = pixelToWorld(x, y, p.metadata);
          const target = snap
            ? findWallEndpointSnap(raw, p.building.walls, {
                maxDistance: DEFAULT_PATH_SNAP_DISTANCE_M,
                excludeWall: { wallId: w.id, endpoint },
              })
            : null;
          const world = target?.point ?? raw;
          p.updateWall(w.id, endpoint === 'start' ? { start: world } : { end: world });
          return world;
        };

        const setHandleCursor = (ev: any, cursor: string) => {
          const stage = ev.target.getStage?.();
          if (stage) stage.container().style.cursor = cursor;
        };

        return (
          <Group key={w.id}>
            <Line points={[a.x, a.y, b.x, b.y]} stroke={selected ? '#f59e0b' : '#7c3aed'} strokeWidth={(selected ? 5 : 3) / e.viewport.scale} hitStrokeWidth={12 / e.viewport.scale} onClick={ev => { ev.cancelBubble = true; e.setSelection([w.id]); }} onTap={ev => { ev.cancelBubble = true; e.setSelection([w.id]); }} />
            {editable && (
              <>
                <Circle x={a.x} y={a.y} radius={7 / e.viewport.scale} fill="#ffffff" stroke="#f59e0b" strokeWidth={2 / e.viewport.scale} draggable onMouseEnter={ev => setHandleCursor(ev, 'grab')} onMouseLeave={ev => setHandleCursor(ev, 'default')} onDragStart={ev => { setHandleCursor(ev, 'grabbing'); p.commit(); }} onDragMove={ev => updateEndpoint('start', ev.target.x(), ev.target.y())} onDragEnd={ev => { updateEndpoint('start', ev.target.x(), ev.target.y(), true); setHandleCursor(ev, 'grab'); }} onClick={ev => { ev.cancelBubble = true; }} onTap={ev => { ev.cancelBubble = true; }} />
                <Circle x={b.x} y={b.y} radius={7 / e.viewport.scale} fill="#ffffff" stroke="#f59e0b" strokeWidth={2 / e.viewport.scale} draggable onMouseEnter={ev => setHandleCursor(ev, 'grab')} onMouseLeave={ev => setHandleCursor(ev, 'default')} onDragStart={ev => { setHandleCursor(ev, 'grabbing'); p.commit(); }} onDragMove={ev => updateEndpoint('end', ev.target.x(), ev.target.y())} onDragEnd={ev => { updateEndpoint('end', ev.target.x(), ev.target.y(), true); setHandleCursor(ev, 'grab'); }} onClick={ev => { ev.cancelBubble = true; }} onTap={ev => { ev.cancelBubble = true; }} />
                {e.layers.labels.visible && (
                  <>
                    <Text x={a.x + 9 / e.viewport.scale} y={a.y - 17 / e.viewport.scale} text="START" fontSize={8 / e.viewport.scale} fill="#92400e" listening={false} />
                    <Text x={b.x + 9 / e.viewport.scale} y={b.y - 17 / e.viewport.scale} text="END" fontSize={8 / e.viewport.scale} fill="#92400e" listening={false} />
                  </>
                )}
              </>
            )}
          </Group>
        );
      })}

      {p.building.doors.map(d => {
        const a = worldToPixel(d.start.x, d.start.y, p.metadata);
        const b = worldToPixel(d.end.x, d.end.y, p.metadata);
        return <Group key={d.id}><Line points={[a.x, a.y, b.x, b.y]} stroke={e.selection.includes(d.id) ? '#0284c7' : '#f59e0b'} strokeWidth={4 / e.viewport.scale} dash={[7 / e.viewport.scale, 3 / e.viewport.scale]} hitStrokeWidth={12 / e.viewport.scale} onClick={ev => { ev.cancelBubble = true; e.setSelection([d.id]); }} />{e.layers.labels.visible && <Text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 12 / e.viewport.scale} text={d.name} fontSize={9 / e.viewport.scale} fill="#92400e" />}</Group>;
      })}

      {p.building.models.map(m => {
        const v = worldToPixel(m.x, m.y, p.metadata);
        return <Group key={m.id} x={v.x} y={v.y} onClick={ev => { ev.cancelBubble = true; e.setSelection([m.id]); }}><Rect x={-6 / e.viewport.scale} y={-6 / e.viewport.scale} width={12 / e.viewport.scale} height={12 / e.viewport.scale} fill="#7c3aed" stroke={e.selection.includes(m.id) ? '#0284c7' : '#5b21b6'} strokeWidth={2 / e.viewport.scale} />{e.layers.labels.visible && <Text x={8 / e.viewport.scale} y={-7 / e.viewport.scale} text={m.name} fontSize={9 / e.viewport.scale} fill="#5b21b6" />}</Group>;
      })}

      {p.building.measurements.map(m => {
        const a = worldToPixel(m.start.x, m.start.y, p.metadata);
        const b = worldToPixel(m.end.x, m.end.y, p.metadata);
        return <Group key={m.id}><Line points={[a.x, a.y, b.x, b.y]} stroke={e.selection.includes(m.id) ? '#0284c7' : '#16a34a'} dash={[5 / e.viewport.scale, 3 / e.viewport.scale]} strokeWidth={2 / e.viewport.scale} hitStrokeWidth={10 / e.viewport.scale} onClick={ev => { ev.cancelBubble = true; e.setSelection([m.id]); }} /><Text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2} text={`${m.distance.toFixed(2)} m`} fontSize={9 / e.viewport.scale} fill="#166534" /></Group>;
      })}

      {buildingDrawing && (
        <Line
          points={buildingDrawing.points.flatMap(q => {
            const v = worldToPixel(q.x, q.y, p.metadata);
            return [v.x, v.y];
          })}
          closed={buildingDrawing.kind === 'floor' && buildingDrawing.points.length > 2}
          stroke={buildingDrawing.kind === 'wall' ? '#7c3aed' : '#0284c7'}
          dash={[6 / e.viewport.scale, 4 / e.viewport.scale]}
          fill={buildingDrawing.kind === 'floor' ? 'rgba(2,132,199,.08)' : undefined}
          strokeWidth={2 / e.viewport.scale}
        />
      )}
    </Layer>
  );
}
