import { create } from 'zustand';
import type { LayerKey, LayerState, NavObjectType, PathType, Tool, ZoneType } from '../models';
import type { Viewport } from '../map-engine/coordinates';

export type BrushShape = 'freehand' | 'line' | 'rectangle' | 'polygon';

interface EditorState {
  tool: Tool;
  measureMode: 'distance' | 'area';
  selection: string[];
  selectedPathPoint: { pathId: string; index: number } | null;
  viewport: Viewport;
  cursor: { x: number; y: number };
  snap: boolean;
  layers: Record<LayerKey, LayerState>;
  placementObject: NavObjectType | null;
  pathType: PathType;
  zoneType: ZoneType;
  brushSize: number;
  brushShape: BrushShape;
  brushColor: string;
  setTool: (t: Tool) => void;
  setPlacementObject: (t: NavObjectType | null) => void;
  setPathType: (t: PathType) => void;
  setZoneType: (t: ZoneType) => void;
  setMeasureMode: (m: 'distance' | 'area') => void;
  setBrushSize: (size: number) => void;
  setBrushShape: (shape: BrushShape) => void;
  setBrushColor: (color: string) => void;
  setSelection: (ids: string[]) => void;
  setSelectedPathPoint: (value: { pathId: string; index: number } | null) => void;
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
  selectedPathPoint: null,
  viewport: { x: 50, y: 30, scale: 1 },
  cursor: { x: 0, y: 0 },
  snap: true,
  layers: makeLayers(),
  placementObject: null,
  pathType: 'normal',
  zoneType: 'no_go',
  brushSize: 10,
  brushShape: 'freehand',
  brushColor: '#000000',
  setTool: tool => set({ tool, placementObject: null, selectedPathPoint: null }),
  setPlacementObject: placementObject => set({ placementObject, tool: 'select', selectedPathPoint: null }),
  setPathType: pathType => set({ pathType, tool: 'path', placementObject: null, selectedPathPoint: null }),
  setZoneType: zoneType => set({ zoneType, tool: 'zone', placementObject: null, selectedPathPoint: null }),
  setMeasureMode: measureMode => set({ measureMode, tool: 'measure', placementObject: null, selectedPathPoint: null }),
  setBrushSize: brushSize => set({ brushSize: Math.max(1, Math.min(100, brushSize)) }),
  setBrushShape: brushShape => set({ brushShape, tool: 'brush', placementObject: null, selectedPathPoint: null }),
  setBrushColor: brushColor => set({ brushColor: /^#[0-9a-fA-F]{6}$/.test(brushColor) ? brushColor : '#000000' }),
  setSelection: selection => set({ selection, selectedPathPoint: null }),
  setSelectedPathPoint: selectedPathPoint => set({ selectedPathPoint }),
  setViewport: viewport => set({ viewport }),
  setCursor: cursor => set({ cursor }),
  toggleLayer: (k, f) => set(s => ({ layers: { ...s.layers, [k]: { ...s.layers[k], [f]: !s.layers[k][f] } } })),
  resetEditor: () => set({ tool: 'select', selection: [], selectedPathPoint: null, viewport: { x: 50, y: 30, scale: 1 }, cursor: { x: 0, y: 0 }, placementObject: null })
}));
