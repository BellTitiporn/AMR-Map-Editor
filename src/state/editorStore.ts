import { create } from 'zustand';
import type { LayerKey, LayerState, NavObjectType, PathType, Tool, ZoneType } from '../models';
import type { Viewport } from '../map-engine/coordinates';

export type BrushShape = 'freehand' | 'line' | 'rectangle' | 'polygon';

interface EditorState {
  tool: Tool;
  measureMode: 'distance' | 'area';
  selection: string[];
  viewport: Viewport;
  cursor: { x: number; y: number };
  snap: boolean;
  layers: Record<LayerKey, LayerState>;
  placementObject: NavObjectType | null;
  pathType: PathType;
  zoneType: ZoneType;
  brushSize: number;
  brushShape: BrushShape;
  setTool: (t: Tool) => void;
  setPlacementObject: (t: NavObjectType | null) => void;
  setPathType: (t: PathType) => void;
  setZoneType: (t: ZoneType) => void;
  setMeasureMode: (m: 'distance' | 'area') => void;
  setBrushSize: (size: number) => void;
  setBrushShape: (shape: BrushShape) => void;
  setSelection: (ids: string[]) => void;
  setViewport: (v: Viewport) => void;
  setCursor: (p: { x: number; y: number }) => void;
  toggleLayer: (k: LayerKey, f: 'visible' | 'locked') => void;
  resetEditor: () => void;
}

const keys: LayerKey[] = ['occupancy','grid','paths','waypoints','stations','zones','robot','validation','labels'];
const makeLayers = () => Object.fromEntries(keys.map(k => [k, { visible: true, locked: false }])) as Record<LayerKey, LayerState>;

export const useEditorStore = create<EditorState>((set) => ({
  tool: 'select',
  measureMode: 'distance',
  selection: [],
  viewport: { x: 50, y: 30, scale: 1 },
  cursor: { x: 0, y: 0 },
  snap: true,
  layers: makeLayers(),
  placementObject: null,
  pathType: 'normal',
  zoneType: 'no_go',
  brushSize: 10,
  brushShape: 'freehand',
  setTool: tool => set({ tool, placementObject: null }),
  setPlacementObject: placementObject => set({ placementObject, tool: 'select' }),
  setPathType: pathType => set({ pathType, tool: 'path', placementObject: null }),
  setZoneType: zoneType => set({ zoneType, tool: 'zone', placementObject: null }),
  setMeasureMode: measureMode => set({ measureMode, tool: 'measure', placementObject: null }),
  setBrushSize: brushSize => set({ brushSize: Math.max(1, Math.min(100, brushSize)) }),
  setBrushShape: brushShape => set({ brushShape, tool: 'brush', placementObject: null }),
  setSelection: selection => set({ selection }),
  setViewport: viewport => set({ viewport }),
  setCursor: cursor => set({ cursor }),
  toggleLayer: (k, f) => set(s => ({ layers: { ...s.layers, [k]: { ...s.layers[k], [f]: !s.layers[k][f] } } })),
  resetEditor: () => set({ tool: 'select', selection: [], viewport: { x: 50, y: 30, scale: 1 }, cursor: { x: 0, y: 0 }, placementObject: null })
}));
