import { useCallback, useState } from 'react';
import { useEditorStore } from '../../../state/editorStore';
import { useProjectStore } from '../../../state/projectStore';
import { clampZoom, screenToWorld } from '../../../map-engine/coordinates';

export type CanvasPoint = { x: number; y: number };

export function useCanvasPointer() {
  const e = useEditorStore();
  const p = useProjectStore();
  const [hover, setHover] = useState<CanvasPoint | null>(null);

  const pointerWorld = useCallback((evt: any): CanvasPoint => {
    const stage = evt.target.getStage();
    const pos = stage.getPointerPosition();
    return screenToWorld(pos.x, pos.y, p.metadata, e.viewport);
  }, [p.metadata, e.viewport]);

  const wheel = useCallback((evt: any) => {
    evt.evt.preventDefault();
    const stage = evt.target.getStage();
    const point = stage.getPointerPosition();
    const oldScale = e.viewport.scale;
    const nextScale = clampZoom(oldScale * (evt.evt.deltaY > 0 ? 0.88 : 1.12));
    const mouse = {
      x: (point.x - e.viewport.x) / oldScale,
      y: (point.y - e.viewport.y) / oldScale,
    };

    e.setViewport({
      scale: nextScale,
      x: point.x - mouse.x * nextScale,
      y: point.y - mouse.y * nextScale,
    });
  }, [e]);

  return { hover, setHover, pointerWorld, wheel };
}
