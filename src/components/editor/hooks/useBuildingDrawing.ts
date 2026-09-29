import { useCallback, useEffect, useState } from 'react';
import { createUuid } from '../../../utils/uuid';
import { useEditorStore } from '../../../state/editorStore';
import { useProjectStore } from '../../../state/projectStore';
import { distance } from '../../../geometry/distance';
import type { CanvasPoint } from './useCanvasPointer';

export type BuildingDrawing = {
  kind: 'wall' | 'door' | 'floor' | 'measurement';
  points: CanvasPoint[];
};

export function useBuildingDrawing() {
  const e = useEditorStore();
  const p = useProjectStore();
  const [buildingDrawing, setBuildingDrawing] = useState<BuildingDrawing | null>(null);
  const [doorAnchorWallId, setDoorAnchorWallId] = useState<string | null>(null);

  useEffect(() => {
    if (e.tool !== 'building' || e.buildingTool !== 'door') {
      setDoorAnchorWallId(null);
    }
  }, [e.tool, e.buildingTool]);

  const finishBuildingFloor = useCallback(() => {
    if (!buildingDrawing || buildingDrawing.kind !== 'floor' || buildingDrawing.points.length < 3) return;
    p.commit();
    const id = `FLOOR-${createUuid().slice(0, 6)}`;
    p.addFloor({
      id,
      name: id,
      polygon: buildingDrawing.points,
      enabled: true,
      textureName: 'blue_linoleum_high_contrast',
      textureScale: 1,
      textureRotation: 0,
      ceilingTexture: 'blue_linoleum_high_contrast',
      ceilingScale: 1,
      indoor: true,
    });
    e.setSelection([id]);
    setBuildingDrawing(null);
    e.setBuildingTool(null);
  }, [buildingDrawing, e, p]);

  const addBuildingPoint = useCallback((point: CanvasPoint) => {
    const kind = e.buildingTool;
    if (!kind) return;

    if (kind === 'model') {
      p.commit();
      const id = `MODEL-${createUuid().slice(0, 6)}`;
      p.addModel({
        id,
        name: id,
        modelName: 'OpenRobotics/OfficeChairBlack',
        x: point.x,
        y: point.y,
        yaw: 0,
        z: 0,
        static: true,
        dispensable: false,
        enabled: true,
      });
      e.setSelection([id]);
      e.setBuildingTool(null);
      return;
    }

    const current = buildingDrawing?.kind === kind ? buildingDrawing.points : [];
    const points = [...current, point];

    if ((kind === 'wall' || kind === 'door' || kind === 'measurement') && points.length === 2) {
      p.commit();
      const id = `${kind.toUpperCase()}-${createUuid().slice(0, 6)}`;

      if (kind === 'wall') {
        p.addWall({
          id,
          name: id,
          start: points[0],
          end: points[1],
          enabled: true,
          alpha: 1,
          textureName: 'wall_white',
          textureScale: 1,
          textureWidth: 1,
          textureHeight: 2.5,
        });
      }

      if (kind === 'door') {
        p.addDoor({
          id,
          name: id,
          start: points[0],
          end: points[1],
          enabled: true,
          type: 'hinged',
          motionAxis: 'start',
          motionDegrees: 90,
          motionDirection: 1,
          plugin: 'normal',
          rightLeftRatio: 1,
        });
        setDoorAnchorWallId(null);
      }

      if (kind === 'measurement') {
        p.addMeasurement({
          id,
          name: id,
          start: points[0],
          end: points[1],
          distance: distance(points[0], points[1]),
          enabled: true,
        });
      }

      e.setSelection([id]);
      setBuildingDrawing(null);
      e.setBuildingTool(null);
      return;
    }

    setBuildingDrawing({
      kind: kind as BuildingDrawing['kind'],
      points,
    });
  }, [buildingDrawing, e, p]);

  return {
    buildingDrawing,
    setBuildingDrawing,
    doorAnchorWallId,
    setDoorAnchorWallId,
    finishBuildingFloor,
    addBuildingPoint,
  };
}
