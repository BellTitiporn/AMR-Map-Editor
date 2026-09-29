import { useEffect, useRef } from 'react';
import { createUuid } from '../../../utils/uuid';
import { useEditorStore } from '../../../state/editorStore';
import { useProjectStore } from '../../../state/projectStore';
import type { Dispatch, SetStateAction } from 'react';
import type { CanvasPoint } from './useCanvasPointer';
import type { PathOrZoneDrawing } from './usePathDrawing';
import type { BuildingDrawing } from './useBuildingDrawing';

type BrushDrag = { kind: 'line' | 'rectangle'; start: CanvasPoint; end: CanvasPoint };

type Options = {
  finishPathOrZone: () => void;
  finishBrushPolygon: () => void | Promise<void>;
  finishBuildingFloor: () => void;
  setDrawing: Dispatch<SetStateAction<PathOrZoneDrawing | null>>;
  setBuildingDrawing: Dispatch<SetStateAction<BuildingDrawing | null>>;
  setMeasure: Dispatch<SetStateAction<CanvasPoint[]>>;
  setBrushDrag: Dispatch<SetStateAction<BrushDrag | null>>;
  setBrushPolygon: Dispatch<SetStateAction<CanvasPoint[]>>;
};

export function useCanvasKeyboard(options: Options) {
  const e = useEditorStore();
  const p = useProjectStore();
  const clipboard = useRef<{ kind: 'object' | 'path' | 'zone'; value: unknown } | null>(null);

  useEffect(() => {
    const duplicate = () => {
      const id = e.selection[0];
      if (!id) return;
      const object = p.objects.find(q => q.id === id);
      const path = p.paths.find(q => q.id === id);
      const zone = p.zones.find(q => q.id === id);
      p.commit();

      if (object) {
        const copy = {
          ...structuredClone(object),
          id: `${object.id}-${createUuid().slice(0, 4)}`,
          name: `${object.name} Copy`,
          x: object.x + 0.5,
          y: object.y + 0.5,
        };
        p.addObject(copy);
        e.setSelection([copy.id]);
      } else if (path) {
        const copy = {
          ...structuredClone(path),
          id: `${path.id}-${createUuid().slice(0, 4)}`,
          name: `${path.name} Copy`,
          points: path.points.map(q => ({ x: q.x + 0.5, y: q.y + 0.5 })),
        };
        p.addPath(copy);
        e.setSelection([copy.id]);
      } else if (zone) {
        const copy = {
          ...structuredClone(zone),
          id: `${zone.id}-${createUuid().slice(0, 4)}`,
          name: `${zone.name} Copy`,
          polygon: zone.polygon.map(q => ({ x: q.x + 0.5, y: q.y + 0.5 })),
        };
        p.addZone(copy);
        e.setSelection([copy.id]);
      }
    };

    const key = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const mod = event.metaKey || event.ctrlKey;
      const keyName = event.key.toLowerCase();

      if (mod && keyName === 's') {
        event.preventDefault();
        void p.saveLocal();
      } else if (mod && keyName === 'z') {
        event.preventDefault();
        event.shiftKey ? p.redoAction() : p.undoAction();
      } else if (mod && keyName === 'd') {
        event.preventDefault();
        duplicate();
      } else if (mod && keyName === 'c') {
        const id = e.selection[0];
        const object = p.objects.find(q => q.id === id);
        const path = p.paths.find(q => q.id === id);
        const zone = p.zones.find(q => q.id === id);
        clipboard.current = object
          ? { kind: 'object', value: structuredClone(object) }
          : path
            ? { kind: 'path', value: structuredClone(path) }
            : zone
              ? { kind: 'zone', value: structuredClone(zone) }
              : null;
      } else if (mod && keyName === 'v' && clipboard.current) {
        event.preventDefault();
        const copy = clipboard.current;
        p.commit();

        if (copy.kind === 'object') {
          const object = structuredClone(copy.value) as typeof p.objects[number];
          object.id = `${object.id}-${createUuid().slice(0, 4)}`;
          object.name += ' Copy';
          object.x += 0.5;
          object.y += 0.5;
          p.addObject(object);
          e.setSelection([object.id]);
        } else if (copy.kind === 'path') {
          const path = structuredClone(copy.value) as typeof p.paths[number];
          path.id = `${path.id}-${createUuid().slice(0, 4)}`;
          path.name += ' Copy';
          path.points = path.points.map(q => ({ x: q.x + 0.5, y: q.y + 0.5 }));
          p.addPath(path);
          e.setSelection([path.id]);
        } else {
          const zone = structuredClone(copy.value) as typeof p.zones[number];
          zone.id = `${zone.id}-${createUuid().slice(0, 4)}`;
          zone.name += ' Copy';
          zone.polygon = zone.polygon.map(q => ({ x: q.x + 0.5, y: q.y + 0.5 }));
          p.addZone(zone);
          e.setSelection([zone.id]);
        }
      } else if (event.key === 'Enter') {
        if (e.tool === 'brush' && e.brushShape === 'polygon') {
          void options.finishBrushPolygon();
        } else if (e.tool === 'building' && e.buildingTool === 'floor') {
          options.finishBuildingFloor();
        } else {
          options.finishPathOrZone();
        }
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && e.selectedPathPoint) {
        event.preventDefault();
        const selected = e.selectedPathPoint;
        const path = p.paths.find(q => q.id === selected.pathId);
        if (path && path.points.length > 2 && selected.index >= 0 && selected.index < path.points.length) {
          p.commit();
          p.updatePath(path.id, { points: path.points.filter((_, index) => index !== selected.index) });
          e.setSelectedPathPoint(null);
        }
      } else if (event.key === 'Delete' && e.selection.length) {
        p.commit();
        p.deleteIds(e.selection);
        e.setSelection([]);
      } else if (event.key === 'Escape') {
        options.setDrawing(null);
        options.setBuildingDrawing(null);
        options.setMeasure([]);
        options.setBrushDrag(null);
        options.setBrushPolygon([]);
        e.setTool('select');
      } else if (!mod) {
        const map: Record<string, typeof e.tool> = {
          v: 'select',
          h: 'pan',
          b: 'brush',
          e: 'eraser',
          p: 'path',
          z: 'zone',
          m: 'measure',
        };
        const tool = map[keyName];
        if (tool) e.setTool(tool);
      }
    };

    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [e, p, options]);
}
