import { expect, it } from 'vitest';
import YAML from 'yaml';
import {
  generateBuildingYaml,
  worldToReferenceImage,
} from '../services/export/buildingExporter';
import { defaultBuildingData } from '../models';

it('converts ROS world coordinates to reference-image pixels', () => {
  const metadata = {
    id:'m',
    name:'Factory',
    width:100,
    height:80,
    resolution:0.05,
    originX:-1,
    originY:-2,
    originYaw:0,
  };

  expect(worldToReferenceImage({ x:-1, y:-2 }, metadata)).toEqual({ x:0, y:80 });
  expect(worldToReferenceImage({ x:4, y:2 }, metadata)).toEqual({ x:100, y:0 });
});

it('exports RMF reference-image YAML with correct pixel scale', () => {
  const building=defaultBuildingData('Factory');
  building.walls.push({
    id:'W1',name:'Wall 1',start:{x:0,y:0},end:{x:4,y:0},enabled:true,
    alpha:1,textureName:'wall_white',textureScale:1,textureWidth:1,textureHeight:2.5
  });
  building.doors.push({
    id:'D1',name:'main_door',start:{x:1,y:0},end:{x:2,y:0},enabled:true,
    type:'hinged',motionAxis:'start',motionDegrees:90,motionDirection:1,
    plugin:'normal',rightLeftRatio:1
  });
  building.floors.push({
    id:'F1',name:'Main Floor',
    polygon:[{x:0,y:0},{x:4,y:0},{x:4,y:4},{x:0,y:4}],
    enabled:true,textureName:'concrete',textureScale:1,textureRotation:0,
    ceilingTexture:'concrete',ceilingScale:1,indoor:true
  });

  const metadata = {
    id:'m', name:'Factory', width:100, height:100,
    resolution:.05, originX:0, originY:0, originYaw:0
  };

  const text = generateBuildingYaml(
    metadata,
    [
      { id:'A', name:'CHARGE-01', type:'charging_station', x:1, y:2, yaw:0, enabled:true, metadata:{} },
      { id:'B', name:'WP-01', type:'waypoint', x:3, y:2, yaw:0, enabled:true, metadata:{} },
    ],
    [{ id:'P1', name:'P1', type:'one_way', points:[{x:1,y:2},{x:3,y:2}], maxSpeed:.8, enabled:true }],
    building,
    { drawingFilename:'factory.png' },
  );

  const data = YAML.parse(text);

  expect(data.coordinate_system).toBe('reference_image');
  expect(data.levels.L1.drawing.filename).toBe('factory.png');

  // 1m / .05m-per-pixel = 20px, and y is flipped against image height.
  const charge = data.levels.L1.vertices.find((v:any[]) => v[3] === 'CHARGE-01');
  expect(charge[0]).toBeCloseTo(20);
  expect(charge[1]).toBeCloseTo(60);

  expect(data.levels.L1.lanes).toHaveLength(1);
  expect(data.levels.L1.lanes[0][2].bidirectional).toEqual([4, false]);
  expect(data.levels.L1.walls).toHaveLength(1);
  expect(data.levels.L1.doors).toHaveLength(1);
  expect(data.levels.L1.floors).toHaveLength(1);

  const autoMeasurement = data.levels.L1.measurements.find(
    (m:any[]) => m[2].amr_measurement_name?.[1] === '__AMR_MAP_RESOLUTION__'
  );
  expect(autoMeasurement).toBeTruthy();
  expect(autoMeasurement[2].distance).toEqual([3, 5]); // 100px * 0.05m/px
});
