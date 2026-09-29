import { Arrow, Circle, Group, Layer, Text } from 'react-konva';
import { useEditorStore } from '../../../state/editorStore';
import { useProjectStore } from '../../../state/projectStore';
import { pixelToWorld, worldToPixel } from '../../../map-engine/coordinates';
import { entityLayersInteractive } from '../../../map-engine/interactionPolicy';

export function ObjectLayer() {
  const e = useEditorStore();
  const p = useProjectStore();
  const entityListening = entityLayersInteractive({ tool: e.tool, placementObject: e.placementObject });

  return (
    <Layer listening={entityListening}>
      {p.objects.map(o => {
        const station = ['charging_station', 'docking_station'].includes(o.type);
        if (station && !e.layers.stations.visible) return null;
        if (!station && !e.layers.waypoints.visible) return null;

        const v = worldToPixel(o.x, o.y, p.metadata);
        const selected = e.selection.includes(o.id);
        const locked = station ? e.layers.stations.locked : e.layers.waypoints.locked;

        return (
          <Group
            key={o.id}
            x={v.x}
            y={v.y}
            rotation={-o.yaw * 180 / Math.PI}
            draggable={e.tool === 'select' && !locked}
            onDragStart={() => p.commit()}
            onDragEnd={ev => p.updateObject(o.id, pixelToWorld(ev.target.x(), ev.target.y(), p.metadata))}
            onClick={ev => { ev.cancelBubble = true; e.setSelection([o.id]); }}
          >
            <Circle radius={(station ? 8 : 6) / e.viewport.scale} fill={station ? '#14b8a6' : o.type === 'home' ? '#3b82f6' : '#f8fafc'} stroke={selected ? '#0ea5e9' : '#26313b'} strokeWidth={(selected ? 3 : 1.5) / e.viewport.scale} />
            <Arrow points={[0, 0, 16 / e.viewport.scale, 0]} pointerLength={5 / e.viewport.scale} pointerWidth={5 / e.viewport.scale} stroke="#26313b" fill="#26313b" strokeWidth={1.5 / e.viewport.scale} />
            {e.layers.labels.visible && <Text text={o.name} x={8 / e.viewport.scale} y={-18 / e.viewport.scale} fontSize={10 / e.viewport.scale} fill="#1e293b" rotation={o.yaw * 180 / Math.PI} />}
          </Group>
        );
      })}
    </Layer>
  );
}
