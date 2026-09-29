import { Arrow, Circle, Group, Rect } from 'react-konva';
import { useProjectStore } from '../../../state/projectStore';
import { worldToPixel } from '../../../map-engine/coordinates';

export function RobotFootprint({ object, scale }: { object: { x: number; y: number; yaw: number }; scale: number }) {
  const p = useProjectStore();
  const v = worldToPixel(object.x, object.y, p.metadata);
  const px = 1 / p.metadata.resolution;
  const margin = p.robot.safetyMargin * px;
  const fp = p.robot.footprint;

  return (
    <Group x={v.x} y={v.y} rotation={-object.yaw * 180 / Math.PI}>
      {fp.type === 'circle' ? (
        <>
          <Circle radius={fp.radius * px} fill="rgba(14,165,233,.10)" stroke="#0284c7" strokeWidth={2 / scale} />
          <Circle radius={fp.radius * px + margin} stroke="#f59e0b" dash={[5 / scale, 4 / scale]} strokeWidth={1.5 / scale} />
        </>
      ) : (
        <>
          <Rect
            x={-(fp.type === 'rectangle' ? fp.length : p.robot.length) * px / 2}
            y={-(fp.type === 'rectangle' ? fp.width : p.robot.width) * px / 2}
            width={(fp.type === 'rectangle' ? fp.length : p.robot.length) * px}
            height={(fp.type === 'rectangle' ? fp.width : p.robot.width) * px}
            fill="rgba(14,165,233,.10)"
            stroke="#0284c7"
            strokeWidth={2 / scale}
          />
          <Rect
            x={-(p.robot.length * px / 2 + margin)}
            y={-(p.robot.width * px / 2 + margin)}
            width={p.robot.length * px + margin * 2}
            height={p.robot.width * px + margin * 2}
            stroke="#f59e0b"
            dash={[5 / scale, 4 / scale]}
            strokeWidth={1.5 / scale}
          />
        </>
      )}
      <Arrow points={[0, 0, 22 / scale, 0]} pointerLength={6 / scale} pointerWidth={6 / scale} stroke="#0284c7" fill="#0284c7" strokeWidth={2 / scale} />
    </Group>
  );
}
