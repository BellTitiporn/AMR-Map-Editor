import { Circle, Group, Layer, Line, Text } from 'react-konva';
import { useEditorStore } from '../../../state/editorStore';
import { useProjectStore } from '../../../state/projectStore';
import { pixelToWorld, worldToPixel } from '../../../map-engine/coordinates';
import { collectPathJunctions, connectPathEndpoint, DEFAULT_PATH_SNAP_DISTANCE_M, PATH_CONNECT_EPSILON_M } from '../../../geometry/pathTopology';
import { entityLayersInteractive } from '../../../map-engine/interactionPolicy';
import type { NavigationPath, Point2D } from '../../../models';
import type { PathOrZoneDrawing } from '../hooks/usePathDrawing';
import { PathDirectionOverlay } from '../overlays/PathDirectionOverlay';

type SharedPathVertexMember = { pathId: string; index: number };
type SharedPathVertexHandle = { key: string; point: Point2D; members: SharedPathVertexMember[] };

function samePathPoint(a: Point2D, b: Point2D, epsilon = PATH_CONNECT_EPSILON_M) {
  return Math.hypot(a.x - b.x, a.y - b.y) <= epsilon;
}

function collectSelectedPathVertexHandles(paths: NavigationPath[], selectedIds: string[]): SharedPathVertexHandle[] {
  const handles: SharedPathVertexHandle[] = [];
  for (const path of paths) {
    if (!selectedIds.includes(path.id)) continue;
    path.points.forEach((point, index) => {
      const existing = handles.find(handle => samePathPoint(handle.point, point));
      if (existing) existing.members.push({ pathId: path.id, index });
      else handles.push({ key: `${path.id}:${index}`, point: { ...point }, members: [{ pathId: path.id, index }] });
    });
  }
  return handles;
}

function moveSharedPathJunction(paths: NavigationPath[], from: Point2D, to: Point2D): NavigationPath[] {
  return paths.map(path => ({
    ...path,
    points: path.points.map(point => samePathPoint(point, from) ? { ...to } : { ...point }),
  }));
}

export function PathLayer({ drawing }: { drawing: PathOrZoneDrawing | null }) {
  const e = useEditorStore();
  const p = useProjectStore();
  if (!e.layers.paths.visible) return null;

  const entityListening = entityLayersInteractive({ tool: e.tool, placementObject: e.placementObject });
  const pathJunctions = collectPathJunctions(p.paths, p.objects);
  const selectedPathVertexHandles = collectSelectedPathVertexHandles(p.paths, e.selection);

  return (
    <>
      <Layer listening={entityListening}>
        {p.paths.map(path => {
          const pts = path.points.flatMap(q => {
            const v = worldToPixel(q.x, q.y, p.metadata);
            return [v.x, v.y];
          });
          return (
            <Group key={path.id}>
              <Line points={pts} stroke={e.selection.includes(path.id) ? '#0ea5e9' : path.type === 'restricted' ? '#ef4444' : '#475569'} strokeWidth={(e.selection.includes(path.id) ? 4 : 2.5) / e.viewport.scale} lineCap="round" lineJoin="round" hitStrokeWidth={12 / e.viewport.scale} onClick={ev => { ev.cancelBubble = true; e.setSelection([path.id]); }} />
              <PathDirectionOverlay path={path} metadata={p.metadata} scale={e.viewport.scale} showBadge={e.layers.labels.visible} />
            </Group>
          );
        })}
        {drawing?.kind === 'path' && <Line points={drawing.points.flatMap(q => { const v = worldToPixel(q.x, q.y, p.metadata); return [v.x, v.y]; })} stroke="#0ea5e9" dash={[6, 4]} strokeWidth={2 / e.viewport.scale} />}
      </Layer>

      {!e.layers.paths.locked && selectedPathVertexHandles.length > 0 && (
        <Layer listening={entityListening}>
          {selectedPathVertexHandles.map(handle => {
            const v = worldToPixel(handle.point.x, handle.point.y, p.metadata);
            const selectedMember = handle.members.find(member => e.selectedPathPoint?.pathId === member.pathId && e.selectedPathPoint.index === member.index);
            const pointSelected = Boolean(selectedMember);

            return (
              <Circle
                key={handle.key}
                x={v.x}
                y={v.y}
                radius={(pointSelected ? 7 : 5) / e.viewport.scale}
                fill={pointSelected ? '#fee2e2' : '#fff'}
                stroke={pointSelected ? '#dc2626' : '#0ea5e9'}
                strokeWidth={(pointSelected ? 3 : 2) / e.viewport.scale}
                draggable
                onClick={ev => {
                  ev.cancelBubble = true;
                  const member = handle.members[0];
                  e.setSelection([member.pathId]);
                  e.setSelectedPathPoint({ pathId: member.pathId, index: member.index });
                }}
                onTap={ev => {
                  ev.cancelBubble = true;
                  const member = handle.members[0];
                  e.setSelection([member.pathId]);
                  e.setSelectedPathPoint({ pathId: member.pathId, index: member.index });
                }}
                onDragStart={() => p.commit()}
                onDragEnd={ev => {
                  const dragged = pixelToWorld(ev.target.x(), ev.target.y(), p.metadata);
                  const primary = handle.members[0];
                  let nextPaths = moveSharedPathJunction(p.paths, handle.point, dragged);
                  const primaryPath = nextPaths.find(item => item.id === primary.pathId);

                  if (primaryPath) {
                    if (primary.index === 0) {
                      const result = connectPathEndpoint(nextPaths, p.objects, primary.pathId, 'start', DEFAULT_PATH_SNAP_DISTANCE_M);
                      nextPaths = result.paths;
                      if (result.candidate) nextPaths = moveSharedPathJunction(nextPaths, dragged, result.candidate.point);
                    } else if (primary.index === primaryPath.points.length - 1) {
                      const result = connectPathEndpoint(nextPaths, p.objects, primary.pathId, 'end', DEFAULT_PATH_SNAP_DISTANCE_M);
                      nextPaths = result.paths;
                      if (result.candidate) nextPaths = moveSharedPathJunction(nextPaths, dragged, result.candidate.point);
                    }
                  }

                  p.replacePaths(nextPaths);
                  const refreshed = nextPaths.find(item => item.id === primary.pathId);
                  if (refreshed) {
                    const newIndex = Math.min(primary.index, refreshed.points.length - 1);
                    e.setSelection([primary.pathId]);
                    e.setSelectedPathPoint({ pathId: primary.pathId, index: newIndex });
                  }
                }}
              />
            );
          })}
        </Layer>
      )}

      <Layer listening={false}>
        {pathJunctions.map((junction, index) => {
          const v = worldToPixel(junction.x, junction.y, p.metadata);
          const overlapsSelectedPathVertex = selectedPathVertexHandles.some(handle => samePathPoint(handle.point, junction));
          return (
            <Group key={`junction-${index}`} x={v.x} y={v.y}>
              {!overlapsSelectedPathVertex && <><Circle radius={7 / e.viewport.scale} fill="#16a34a" stroke="#fff" strokeWidth={2 / e.viewport.scale} /><Circle radius={2 / e.viewport.scale} fill="#fff" /></>}
              {e.layers.labels.visible && <Text x={9 / e.viewport.scale} y={-7 / e.viewport.scale} text="CONNECTED" fontSize={8 / e.viewport.scale} fill="#166534" />}
            </Group>
          );
        })}
      </Layer>
    </>
  );
}
