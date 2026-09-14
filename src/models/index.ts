export type Tool = 'select'|'pan'|'brush'|'eraser'|'path'|'zone'|'measure'|'building';
export type LayerKey = 'occupancy'|'grid'|'building'|'paths'|'waypoints'|'stations'|'zones'|'robot'|'validation'|'labels';
export interface Point2D{x:number;y:number}
export interface MapMetadata { id:string; name:string; width:number; height:number; resolution:number; originX:number; originY:number; originYaw:number; }
export interface MapImageData{dataUrl:string;originalDataUrl?:string;mimeType:string;originalFilename:string;sourceFormat:'pgm'|'png'|'jpg'|'jpeg';originalBase64?:string;occupancyBase64?:string;negate:0|1;occupiedThresh:number;freeThresh:number}
export type NavObjectType='waypoint'|'home'|'charging_station'|'docking_station'|'pickup'|'dropoff'|'waiting'|'parking';
export interface NavigationObject { id:string; name:string; type:NavObjectType; x:number; y:number; yaw:number; description?:string; enabled:boolean; metadata:Record<string,unknown>; }
export type PathType='normal'|'preferred'|'one_way'|'bidirectional'|'restricted';
export interface NavigationPath { id:string; name:string; type:PathType; points:Point2D[]; maxSpeed?:number; width?:number; safetyClearance?:number; priority?:number; robotTypes?:string[]; enabled:boolean; }
export type ZoneType='no_go'|'slow'|'restricted'|'parking'|'loading'|'unloading'|'human_traffic'|'safety';
export interface MapZone { id:string; name:string; type:ZoneType; polygon:Point2D[]; maxSpeed?:number; robotTypes?:string[]; enabled:boolean; metadata:Record<string,unknown>; }
export interface RobotConfig { name:string; width:number; length:number; footprint:{type:'rectangle';width:number;length:number}|{type:'circle';radius:number}|{type:'polygon';points:Point2D[]}; safetyMargin:number; inflationRadius:number; minimumClearance:number; minimumTurningRadius:number; maxSpeed:number; }
export interface ValidationIssue { id:string; severity:'error'|'warning'|'info'; type:string; message:string; objectId?:string; position?:Point2D; suggestedFix?:string; }
export interface LayerState { visible:boolean; locked:boolean; }

export type BuildingTool='wall'|'door'|'floor'|'model'|'measurement';
export interface BuildingWall {
  id:string; name:string; start:Point2D; end:Point2D; enabled:boolean;
  alpha:number; textureName:string; textureScale:number; textureWidth:number; textureHeight:number;
}
export type BuildingDoorType='hinged'|'double_hinged'|'sliding'|'double_sliding';
export interface BuildingDoor {
  id:string; name:string; start:Point2D; end:Point2D; enabled:boolean;
  type:BuildingDoorType; motionAxis:'start'|'end'; motionDegrees:number; motionDirection:-1|1;
  plugin:string; rightLeftRatio:number;
}
export interface BuildingFloor {
  id:string; name:string; polygon:Point2D[]; enabled:boolean;
  textureName:string; textureScale:number; textureRotation:number;
  ceilingTexture:string; ceilingScale:number; indoor:boolean;
}
export interface BuildingModel {
  id:string; name:string; modelName:string; x:number; y:number; yaw:number; z:number;
  static:boolean; dispensable:boolean; enabled:boolean;
}
export interface BuildingMeasurement {
  id:string; name:string; start:Point2D; end:Point2D; distance:number; enabled:boolean;
}
export interface BuildingLevelConfig {
  buildingName:string; referenceLevelName:string; levelName:string; elevation:number;
}
export interface BuildingData {
  config:BuildingLevelConfig;
  walls:BuildingWall[];
  doors:BuildingDoor[];
  floors:BuildingFloor[];
  models:BuildingModel[];
  measurements:BuildingMeasurement[];
}

export const defaultBuildingData = (mapName='AMR_Map'):BuildingData=>({
  config:{buildingName:mapName||'AMR_Map',referenceLevelName:'L1',levelName:'L1',elevation:0},
  walls:[],doors:[],floors:[],models:[],measurements:[]
});

export interface AMRMapProject{ id:string;name:string;metadata:MapMetadata;image:MapImageData|null;objects:NavigationObject[];paths:NavigationPath[];zones:MapZone[];robotConfigs:RobotConfig[];building:BuildingData;createdAt:string;updatedAt:string;revision:number }
export interface AMRMapProjectFile{format:'AMR_MAP_PROJECT';version:'1.0';project:AMRMapProject}
