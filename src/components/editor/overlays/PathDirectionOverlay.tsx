import { Arrow, Group, Rect, Text } from 'react-konva';
import { worldToPixel } from '../../../map-engine/coordinates';
import type { MapMetadata, NavigationPath } from '../../../models';

export function PathDirectionOverlay({
  path,
  metadata,
  scale,
  showBadge,
}: {
  path: NavigationPath;
  metadata: MapMetadata;
  scale: number;
  showBadge: boolean;
}) {
  const orientation = path.orientation ?? '';
  const hasTravelDirection = path.type === 'one_way' || path.type === 'bidirectional'; // Only show arrows for one-way or bidirectional paths
  if (!hasTravelDirection && !orientation) return null;

  // Determine the stroke color based on the path type
  const stroke = path.type === 'one_way'
    ? '#075985'
    : path.type === 'bidirectional'
      ? '#17643b'
      : '#475569';

  // Generate arrows for the path segments based on the path type and orientation
      const arrows = hasTravelDirection
    ? path.points.slice(0, -1).flatMap((q, i) => {
        const a = worldToPixel(q.x, q.y, metadata);
        const b = worldToPixel(path.points[i + 1].x, path.points[i + 1].y, metadata);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const nx = -uy;
        const ny = ux;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const half = Math.min(15 / scale, len * 0.16);

        if (path.type === 'one_way') {
          return [
            <Arrow
              key={`one-${i}`}
              points={[mx - ux * half, my - uy * half, mx + ux * half, my + uy * half]}
              pointerLength={6 / scale}
              pointerWidth={6 / scale}
              stroke={stroke}
              fill={stroke}
              strokeWidth={1.6 / scale}
            />,
          ];
        }

        const off = 4 / scale;
        return [
          <Arrow
            key={`two-f-${i}`}
            points={[mx - ux * half + nx * off, my - uy * half + ny * off, mx + ux * half + nx * off, my + uy * half + ny * off]}
            pointerLength={5.5 / scale}
            pointerWidth={5.5 / scale}
            stroke={stroke}
            fill={stroke}
            strokeWidth={1.4 / scale}
          />,
          <Arrow
            key={`two-r-${i}`}
            points={[mx + ux * half - nx * off, my + uy * half - ny * off, mx - ux * half - nx * off, my - uy * half - ny * off]}
            pointerLength={5.5 / scale}
            pointerWidth={5.5 / scale}
            stroke={stroke}
            fill={stroke}
            strokeWidth={1.4 / scale}
          />,
        ];
      })
    : [];

  const orientationArrows = orientation
    ? path.points.slice(0, -1).map((q, i) => {
        const a = worldToPixel(q.x, q.y, metadata);
        const b = worldToPixel(path.points[i + 1].x, path.points[i + 1].y, metadata);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const nx = -uy;
        const ny = ux;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const side = Math.abs(ny) > 1e-6 ? (ny >= 0 ? 1 : -1) : 1;
        const offset = 14 / scale;
        const half = Math.min(24 / scale, len * 0.24);
        const dir = orientation === 'backward' ? -1 : 1;
        const cx = mx + nx * offset * side;
        const cy = my + ny * offset * side;
        const points = [
          cx - ux * half * dir,
          cy - uy * half * dir,
          cx + ux * half * dir,
          cy + uy * half * dir,
        ];

        return (
          <Group key={`orientation-${orientation}-${i}`} listening={false}>
            <Arrow points={points} pointerLength={10 / scale} pointerWidth={10 / scale} stroke="rgba(255,255,255,.96)" fill="rgba(255,255,255,.96)" strokeWidth={5 / scale} listening={false} />
            <Arrow points={points} pointerLength={9 / scale} pointerWidth={9 / scale} stroke="#7c3aed" fill="#7c3aed" strokeWidth={2.8 / scale} listening={false} />
          </Group>
        );
      })
    : [];

  if (!showBadge || path.points.length < 2) return <>{arrows}{orientationArrows}</>;

  const segmentIndex = Math.min(path.points.length - 2, Math.floor((path.points.length - 1) / 2));
  const a = worldToPixel(path.points[segmentIndex].x, path.points[segmentIndex].y, metadata);
  const b = worldToPixel(path.points[segmentIndex + 1].x, path.points[segmentIndex + 1].y, metadata);
  const x = (a.x + b.x) / 2;
  const y = (a.y + b.y) / 2 - 18 / scale;
  const text = path.type === 'one_way' ? 'ONE-WAY  A → B' : path.type === 'bidirectional' ? 'TWO-WAY  A ↔ B' : 'PATH';
  const width = (path.type === 'one_way' ? 88 : path.type === 'bidirectional' ? 90 : 46) / scale;
  const orientationText = orientation === 'forward' ? 'ORIENTATION: FORWARD' : orientation === 'backward' ? 'ORIENTATION: BACKWARD' : '';
  const orientationWidth = 118 / scale;

  return (
    <>
      {arrows}
      {orientationArrows}
      {hasTravelDirection && (
        <Group x={x - width / 2} y={y} listening={false}>
          <Rect width={width} height={16 / scale} fill="rgba(255,255,255,.94)" stroke={stroke} strokeWidth={1 / scale} cornerRadius={2 / scale} />
          <Text width={width} height={16 / scale} align="center" verticalAlign="middle" text={text} fontSize={8.5 / scale} fontStyle="bold" fill={stroke} />
        </Group>
      )}
      {orientationText && (
        <Group x={x - orientationWidth / 2} y={y - (hasTravelDirection ? 19 / scale : 0)} listening={false}>
          <Rect width={orientationWidth} height={16 / scale} fill="rgba(255,255,255,.94)" stroke="#7c3aed" strokeWidth={1 / scale} cornerRadius={2 / scale} />
          <Text width={orientationWidth} height={16 / scale} align="center" verticalAlign="middle" text={orientationText} fontSize={8 / scale} fontStyle="bold" fill="#6d28d9" />
        </Group>
      )}
    </>
  );
}
