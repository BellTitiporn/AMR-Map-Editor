import { expect, it } from 'vitest';
import YAML from 'yaml';
import { generateBuildingYaml } from '../services/export/buildingExporter';
import { defaultBuildingData } from '../models';

it('exports RMF building YAML with navigation and building geometry', () => {
  const building=defaultBuildingData('Factory');
  building.walls.push({id:'W1',name:'Wall 1',start:{x:0,y:0},end:{x:4,y:0},enabled:true,alpha:1,textureName:'wall_white',textureScale:1,textureWidth:1,textureHeight:2.5});
  building.doors.push({id:'D1',name:'main_door',start:{x:1,y:0},end:{x:2,y:0},enabled:true,type:'hinged',motionAxis:'start',motionDegrees:90,motionDirection:1,plugin:'normal',rightLeftRatio:1});
  building.floors.push({id:'F1',name:'Main Floor',polygon:[{x:0,y:0},{x:4,y:0},{x:4,y:4},{x:0,y:4}],enabled:true,textureName:'concrete',textureScale:1,textureRotation:0,ceilingTexture:'concrete',ceilingScale:1,indoor:true});
  building.models.push({id:'M1',name:'Chair',modelName:'OpenRobotics/OfficeChairBlack',x:2,y:2,yaw:0,z:0,static:true,dispensable:false,enabled:true});
  building.measurements.push({id:'ME1',name:'Scale',start:{x:0,y:0},end:{x:4,y:0},distance:4,enabled:true});

  const text = generateBuildingYaml(
    { id:'m', name:'Factory', width:100, height:100, resolution:.05, originX:0, originY:0, originYaw:0 },
    [
      { id:'A', name:'CHARGE-01', type:'charging_station', x:1, y:2, yaw:0, enabled:true, metadata:{} },
      { id:'B', name:'WP-01', type:'waypoint', x:3, y:2, yaw:0, enabled:true, metadata:{} },
    ],
    [{ id:'P1', name:'P1', type:'one_way', points:[{x:1,y:2},{x:3,y:2}], maxSpeed:.8, enabled:true }],
    building,
    { drawingFilename:'factory.png' },
  );
  const data = YAML.parse(text);
  expect(data.coordinate_system).toBe('cartesian_meters');
  expect(data.levels.L1.vertices.length).toBeGreaterThanOrEqual(2);
  expect(data.levels.L1.lanes).toHaveLength(1);
  expect(data.levels.L1.lanes[0][2].bidirectional).toEqual([4, false]);
  expect(data.levels.L1.walls).toHaveLength(1);
  expect(data.levels.L1.doors).toHaveLength(1);
  expect(data.levels.L1.floors).toHaveLength(1);
  expect(data.levels.L1.models).toHaveLength(1);
  expect(data.levels.L1.measurements).toHaveLength(1);
  expect(data.levels.L1.drawing.filename).toBe('factory.png');
});
