import { Circle, Group, Layer, Line, Text } from 'react-konva';
import { useEditorStore } from '../../../state/editorStore';
import { useProjectStore } from '../../../state/projectStore';
import { pixelToWorld, worldToPixel } from '../../../map-engine/coordinates';
import { entityLayersInteractive } from '../../../map-engine/interactionPolicy';
import type { PathOrZoneDrawing } from '../hooks/usePathDrawing';

const zoneFill: Record<string, string> = {
  no_go: 'rgba(239,68,68,.22)',
  keepout: 'rgba(127,29,29,.30)',
  slow: 'rgba(245,158,11,.20)',
  restricted: 'rgba(168,85,247,.20)',
  parking: 'rgba(59,130,246,.18)',
  loading: 'rgba(14,165,233,.18)',
  unloading: 'rgba(6,182,212,.18)',
  human_traffic: 'rgba(250,204,21,.18)',
  safety: 'rgba(34,197,94,.18)',
};

export function ZoneLayer({ drawing }: { drawing: PathOrZoneDrawing | null }) {
  const e = useEditorStore();
  const p = useProjectStore();
  if (!e.layers.zones.visible) return null;
  const entityListening = entityLayersInteractive({ tool: e.tool, placementObject: e.placementObject });

  return (
    <Layer listening={entityListening}>
      {p.zones.map(z => {
        const pts = z.polygon.flatMap(q => {
          const v = worldToPixel(q.x, q.y, p.metadata);
          return [v.x, v.y];
        });
        return (
          <Group key={z.id}>
            <Line points={pts} closed fill={zoneFill[z.type]} stroke={e.selection.includes(z.id) ? '#0ea5e9' : '#8b5e34'} strokeWidth={(e.selection.includes(z.id) ? 3 : 1.5) / e.viewport.scale} onClick={ev => { ev.cancelBubble = true; e.setSelection([z.id]); }} />
            {e.layers.labels.visible && <Text x={pts[0] + 5} y={pts[1] + 5} text={z.name} fontSize={11 / e.viewport.scale} fill="#684c2e" />}
            {e.selection.includes(z.id) && !e.layers.zones.locked && z.polygon.map((q, i) => {
              const v = worldToPixel(q.x, q.y, p.metadata);
              return <Circle key={i} x={v.x} y={v.y} radius={5 / e.viewport.scale} fill="#fff" stroke="#0ea5e9" strokeWidth={2 / e.viewport.scale} draggable onDragStart={() => p.commit()} onDragEnd={ev => { const poly = [...z.polygon]; poly[i] = pixelToWorld(ev.target.x(), ev.target.y(), p.metadata); p.updateZone(z.id, { polygon: poly }); }} />;
            })}
          </Group>
        );
      })}

      {drawing?.kind === 'zone' && (
        <Line
          points={drawing.points.flatMap(q => {
            const v = worldToPixel(q.x, q.y, p.metadata);
            return [v.x, v.y];
          })}
          closed={drawing.points.length > 2}
          fill="rgba(14,165,233,.12)"
          stroke="#0ea5e9"
          dash={[6, 4]}
          strokeWidth={2 / e.viewport.scale}
        />
      )}
    </Layer>
  );
}
