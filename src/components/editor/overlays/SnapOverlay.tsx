import { Circle, Group, Layer, Text } from 'react-konva';
import { useEditorStore } from '../../../state/editorStore';
import { useProjectStore } from '../../../state/projectStore';
import { worldToPixel } from '../../../map-engine/coordinates';
import { DEFAULT_PATH_SNAP_DISTANCE_M } from '../../../geometry/pathTopology';
import { findDoorWallSnap, findPathDrawSnap, findWallEndpointSnap } from '../../../geometry/snapEngine';
import type { CanvasPoint } from '../hooks/useCanvasPointer';

export function SnapOverlay({ hover, doorAnchorWallId }: { hover: CanvasPoint | null; doorAnchorWallId: string | null }) {
  const e = useEditorStore();
  const p = useProjectStore();

  const pathSnapTarget = e.tool === 'path' && hover ? findPathDrawSnap(hover, p.objects, p.paths) : null;
  const wallSnapTarget = e.tool === 'building' && e.buildingTool === 'wall' && hover
    ? findWallEndpointSnap(hover, p.building.walls)
    : null;
  const doorSnapTarget = e.tool === 'building' && e.buildingTool === 'door' && hover
    ? findDoorWallSnap(hover, p.building.walls, {
        maxDistance: doorAnchorWallId ? DEFAULT_PATH_SNAP_DISTANCE_M * 3 : DEFAULT_PATH_SNAP_DISTANCE_M,
        wallId: doorAnchorWallId ?? undefined,
      })
    : null;

  return (
    <>
      {pathSnapTarget && <Layer listening={false}>{(() => {
        const v = worldToPixel(pathSnapTarget.point.x, pathSnapTarget.point.y, p.metadata);
        return <Group x={v.x} y={v.y}><Circle radius={11 / e.viewport.scale} fill="rgba(34,197,94,.18)" stroke="#16a34a" strokeWidth={3 / e.viewport.scale} /><Circle radius={4 / e.viewport.scale} fill="#16a34a" /><Text x={14 / e.viewport.scale} y={-9 / e.viewport.scale} text={`SNAP • ${pathSnapTarget.label}`} fontSize={9 / e.viewport.scale} fill="#166534" /></Group>;
      })()}</Layer>}

      {wallSnapTarget && <Layer listening={false}>{(() => {
        const v = worldToPixel(wallSnapTarget.point.x, wallSnapTarget.point.y, p.metadata);
        return <Group x={v.x} y={v.y}><Circle radius={12 / e.viewport.scale} fill="rgba(245,158,11,.20)" stroke="#f59e0b" strokeWidth={3 / e.viewport.scale} /><Circle radius={4 / e.viewport.scale} fill="#7c3aed" /><Text x={15 / e.viewport.scale} y={-9 / e.viewport.scale} text={`SNAP • ${wallSnapTarget.label}`} fontSize={9 / e.viewport.scale} fill="#92400e" /></Group>;
      })()}</Layer>}

      {doorSnapTarget && <Layer listening={false}>{(() => {
        const v = worldToPixel(doorSnapTarget.point.x, doorSnapTarget.point.y, p.metadata);
        return <Group x={v.x} y={v.y}><Circle radius={12 / e.viewport.scale} fill="rgba(14,165,233,.18)" stroke="#0284c7" strokeWidth={3 / e.viewport.scale} /><Circle radius={4 / e.viewport.scale} fill="#f59e0b" /><Text x={15 / e.viewport.scale} y={-9 / e.viewport.scale} text={`DOOR SNAP • ${doorSnapTarget.label}`} fontSize={9 / e.viewport.scale} fill="#075985" /></Group>;
      })()}</Layer>}
    </>
  );
}
