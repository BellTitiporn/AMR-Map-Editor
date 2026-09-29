import { Circle, Group, Layer, Line } from 'react-konva';
import { useEditorStore } from '../../../state/editorStore';
import { useProjectStore } from '../../../state/projectStore';
import { worldToPixel } from '../../../map-engine/coordinates';

export function ValidationLayer() {
  const e = useEditorStore();
  const p = useProjectStore();
  if (!e.layers.validation.visible) return null;

  return (
    <Layer listening={false}>
      {p.issues.filter(issue => issue.position).map(issue => {
        const v = worldToPixel(issue.position!.x, issue.position!.y, p.metadata);
        const color = issue.severity === 'error' ? '#ef4444' : '#f59e0b';
        return (
          <Group key={issue.id} x={v.x} y={v.y}>
            <Circle radius={11 / e.viewport.scale} stroke={color} strokeWidth={3 / e.viewport.scale} />
            <Line points={[-6 / e.viewport.scale, -6 / e.viewport.scale, 6 / e.viewport.scale, 6 / e.viewport.scale]} stroke={color} strokeWidth={2 / e.viewport.scale} />
            <Line points={[-6 / e.viewport.scale, 6 / e.viewport.scale, 6 / e.viewport.scale, -6 / e.viewport.scale]} stroke={color} strokeWidth={2 / e.viewport.scale} />
          </Group>
        );
      })}
    </Layer>
  );
}
