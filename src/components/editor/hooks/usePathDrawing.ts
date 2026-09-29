import { useCallback, useState } from 'react';
import { createUuid } from '../../../utils/uuid';
import { useEditorStore } from '../../../state/editorStore';
import { useProjectStore } from '../../../state/projectStore';
import { connectPathEndpoint, DEFAULT_PATH_SNAP_DISTANCE_M } from '../../../geometry/pathTopology';
import type { NavigationPath } from '../../../models';
import type { CanvasPoint } from './useCanvasPointer';

export type PathOrZoneDrawing = {
  kind: 'path' | 'zone';
  points: CanvasPoint[];
};

export function usePathDrawing() {
  const e = useEditorStore();
  const p = useProjectStore();
  const [drawing, setDrawing] = useState<PathOrZoneDrawing | null>(null);

  const addDrawingPoint = useCallback((kind: 'path' | 'zone', point: CanvasPoint) => {
    setDrawing(current => current && current.kind === kind
      ? { ...current, points: [...current.points, point] }
      : { kind, points: [point] });
  }, []);

  const finishPathOrZone = useCallback(() => {
    if (!drawing) return;

    if (drawing.kind === 'path' && drawing.points.length > 1) {
      p.commit();
      const id = `P-${createUuid().slice(0, 8)}`;
      const created: NavigationPath = {
        id,
        name: 'New Path',
        type: e.pathType,
        points: drawing.points,
        width: 1,
        maxSpeed: 1,
        graphIndex: 0,
        orientation: '',
        enabled: true,
      };

      let nextPaths = [...p.paths, created];
      nextPaths = connectPathEndpoint(nextPaths, p.objects, id, 'start', DEFAULT_PATH_SNAP_DISTANCE_M).paths;
      nextPaths = connectPathEndpoint(nextPaths, p.objects, id, 'end', DEFAULT_PATH_SNAP_DISTANCE_M).paths;
      p.replacePaths(nextPaths);
      e.setSelection([id]);
    } else if (drawing.kind === 'zone' && drawing.points.length > 2) {
      p.commit();
      const id = `Z-${createUuid().slice(0, 8)}`;
      p.addZone({
        id,
        name: 'New Zone',
        type: e.zoneType,
        polygon: drawing.points,
        enabled: true,
        metadata: {},
      });
      e.setSelection([id]);
    }

    setDrawing(null);
    e.setTool('select');
  }, [drawing, e, p]);

  return { drawing, setDrawing, addDrawingPoint, finishPathOrZone };
}
