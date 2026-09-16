import { useEffect, useState } from 'react';
import { ArrowLeftRight, ArrowRight, CircleCheck, GitMerge, Link2, Copy, RotateCcw, Trash2 } from 'lucide-react';
import { useEditorStore } from '../../state/editorStore';
import { useProjectStore } from '../../state/projectStore';
import type { BuildingDoorType, BuildingWall, NavigationObject, NavigationPath, PathType, ReferenceCoordinatesConfig, ZoneType } from '../../models';
import { degreesToRadians, headingLabel, normalizeAngle, normalizeDegrees, radiansToDegrees } from '../../geometry/angles';
import { connectPathEndpoint, DEFAULT_PATH_SNAP_DISTANCE_M, endpointConnectionStatus, findNearestMergeCandidate, mergeWithNearestPath } from '../../geometry/pathTopology';
import { resizeWall, wallAngleDegrees, wallLength, type WallResizeAnchor } from '../../geometry/wall';

export function Inspector() {
  const selection = useEditorStore(s => s.selection);
  const setSelection = useEditorStore(s => s.setSelection);
  const selectedPathPoint = useEditorStore(s => s.selectedPathPoint);
  const setSelectedPathPoint = useEditorStore(s => s.setSelectedPathPoint);
  const p = useProjectStore();
  const id = selection[0];
  const object = p.objects.find(x => x.id === id);
  const path = p.paths.find(x => x.id === id);
  const zone = p.zones.find(x => x.id === id);
  const wall = p.building.walls.find(x => x.id === id);
  const door = p.building.doors.find(x => x.id === id);
  const floor = p.building.floors.find(x => x.id === id);
  const buildingModel = p.building.models.find(x => x.id === id);
  const buildingMeasurement = p.building.measurements.find(x => x.id === id);
  const rounded = (v: number) => Number(v.toFixed(3));
  const begin = () => p.commit();

  if (!id) {
    return <aside className="inspector">
      <div className="inspector-title">PROPERTIES</div>
      <div className="empty">Select an object, path, or zone to inspect properties.</div>
      <BuildingConfig />
      <RobotConfig />
    </aside>;
  }

  if (object) {
    return <aside className="inspector">
      <div className="inspector-title">PROPERTIES</div>
      <Field l="Name" v={object.name} begin={begin} on={v => p.updateObject(object.id, { name: v })} />
      <div className="kv"><span>ID</span><code>{object.id}</code></div>
      <div className="kv"><span>Type</span><b>{object.type.replaceAll('_', ' ')}</b></div>
      <div className="group-title">POSITION</div>
      <div className="twocol">
        <NumberField l="X (m)" v={rounded(object.x)} begin={begin} on={v => p.updateObject(object.id, { x: v })} />
        <NumberField l="Y (m)" v={rounded(object.y)} begin={begin} on={v => p.updateObject(object.id, { y: v })} />
      </div>
      <HeadingEditor object={object} />

      {object.type === 'pickup' && <div className="rmf-object-properties">
        <div className="group-title">RMF PICKUP</div>
        <Field
          l="pickup_dispenser"
          v={typeof object.metadata?.pickup_dispenser === 'string' ? object.metadata.pickup_dispenser : object.name}
          begin={begin}
          on={v => p.updateObject(object.id, {
            metadata: { ...object.metadata, pickup_dispenser: v },
          })}
        />
        <div className="heading-help">Exported to Traffic Editor as pickup_dispenser.</div>
      </div>}

      {object.type === 'dropoff' && <div className="rmf-object-properties">
        <div className="group-title">RMF DROPOFF</div>
        <Field
          l="dropoff_ingestor"
          v={typeof object.metadata?.dropoff_ingestor === 'string' ? object.metadata.dropoff_ingestor : object.name}
          begin={begin}
          on={v => p.updateObject(object.id, {
            metadata: { ...object.metadata, dropoff_ingestor: v },
          })}
        />
        <div className="heading-help">Exported to Traffic Editor as dropoff_ingestor.</div>
      </div>}

      <Field l="Description" v={object.description ?? ''} begin={begin} on={v => p.updateObject(object.id, { description: v })} />
      <label className="check"><input type="checkbox" checked={object.enabled} onFocus={begin} onChange={x => p.updateObject(object.id, { enabled: x.target.checked })} /> Enabled</label>
      <div className="actions">
        <button onClick={() => duplicateObject(object)}><Copy />Duplicate</button>
        <button className="danger" onClick={() => remove(object.id)}><Trash2 />Delete</button>
      </div>
      <RobotConfig />
    </aside>;
  }

  if (path) {
    return <aside className="inspector">
      <div className="inspector-title">PATH PROPERTIES</div>
      <Field l="Name" v={path.name} begin={begin} on={v => p.updatePath(path.id, { name: v })} />
      <PathDirectionControl type={path.type} onChange={type => { p.commit(); p.updatePath(path.id, { type }); }} />

      <div className="path-direction-card">
        <div className="path-direction-head">
          <div>
            <span className="group-title">LANE ORIENTATION</span>
            <b className={`path-direction-status ${path.orientation ? 'oneway' : 'neutral'}`}>
              {path.orientation === 'forward' ? 'FORWARD' : path.orientation === 'backward' ? 'BACKWARD' : 'NONE'}
            </b>
          </div>
        </div>

        <div className="path-direction-toggle" role="group" aria-label="RMF lane orientation">
          <button
            type="button"
            className={(path.orientation ?? '') === '' ? 'active' : ''}
            onClick={() => {
              p.commit();
              p.updatePath(path.id, { orientation: '' });
            }}
            title="No RMF lane orientation constraint"
          >
            <span><b>None</b><small>No constraint</small></span>
          </button>

          <button
            type="button"
            className={path.orientation === 'forward' ? 'active' : ''}
            onClick={() => {
              p.commit();
              p.updatePath(path.id, { orientation: 'forward' });
            }}
            title="Robot faces along path vertex order A → B"
          >
            <ArrowRight />
            <span><b>Forward</b><small>A → B</small></span>
          </button>

          <button
            type="button"
            className={path.orientation === 'backward' ? 'active' : ''}
            onClick={() => {
              p.commit();
              p.updatePath(path.id, { orientation: 'backward' });
            }}
            title="Robot faces opposite path vertex order B → A"
          >
            <ArrowLeftRight />
            <span><b>Backward</b><small>B → A</small></span>
          </button>
        </div>

        <div className="path-direction-help">
          {(path.orientation ?? '') === ''
            ? 'No lane heading constraint. Choose Forward or Backward to export Traffic Editor orientation.'
            : path.orientation === 'forward'
              ? 'Forward: robot heading follows A → B. Export: orientation = forward.'
              : 'Backward: robot heading points B → A. Export: orientation = backward.'}
        </div>
      </div>

      <SelectField l="Path Type" v={path.type} options={['normal', 'preferred', 'one_way', 'bidirectional', 'restricted']} begin={begin} on={v => p.updatePath(path.id, { type: v as PathType })} />
      <NumberField l="Max Speed (m/s)" v={path.maxSpeed ?? 1} begin={begin} on={v => p.updatePath(path.id, { maxSpeed: v })} />
      <NumberField l="Path Width (m)" v={path.width ?? 1} begin={begin} on={v => p.updatePath(path.id, { width: v })} />
      <NumberField l="Safety Clearance (m)" v={path.safetyClearance ?? .2} begin={begin} on={v => p.updatePath(path.id, { safetyClearance: v })} />
      <div className="kv"><span>Points</span><b>{path.points.length}</b></div>
      <PathPointEditor path={path} selected={selectedPathPoint?.pathId === path.id ? selectedPathPoint.index : null} onSelect={index => setSelectedPathPoint(index === null ? null : { pathId: path.id, index })} />
      <PathConnectivityCard path={path} />
      <div className="actions">
        <button onClick={() => { p.commit(); p.updatePath(path.id, { points: [...path.points].reverse() }); setSelectedPathPoint(null); }}><RotateCcw />{path.type === 'one_way' ? 'Reverse Direction' : 'Reverse Vertices'}</button>
        <button className="danger" onClick={() => remove(path.id)}><Trash2 />Delete</button>
      </div>
      <RobotConfig />
    </aside>;
  }

  if (zone) {
    return <aside className="inspector">
      <div className="inspector-title">ZONE PROPERTIES</div>
      <Field l="Name" v={zone.name} begin={begin} on={v => p.updateZone(zone.id, { name: v })} />
      <SelectField l="Type" v={zone.type} options={['no_go', 'slow', 'restricted', 'parking', 'loading', 'unloading', 'human_traffic', 'safety']} begin={begin} on={v => p.updateZone(zone.id, { type: v as ZoneType })} />
      <NumberField l="Max Speed (m/s)" v={zone.maxSpeed ?? 0} begin={begin} on={v => p.updateZone(zone.id, { maxSpeed: v })} />
      <div className="kv"><span>Vertices</span><b>{zone.polygon.length}</b></div>
      <div className="actions">
        <button onClick={() => duplicateZone(zone)}><Copy />Duplicate</button>
        <button className="danger" onClick={() => remove(zone.id)}><Trash2 />Delete</button>
      </div>
      <RobotConfig />
    </aside>;
  }

  if (wall) {
    return <aside className="inspector"><div className="inspector-title">WALL PROPERTIES</div>
      <Field l="Name" v={wall.name} begin={begin} on={v=>p.updateWall(wall.id,{name:v})}/>
      <div className="twocol"><NumberField l="Start X" v={rounded(wall.start.x)} begin={begin} on={v=>p.updateWall(wall.id,{start:{...wall.start,x:v}})}/><NumberField l="Start Y" v={rounded(wall.start.y)} begin={begin} on={v=>p.updateWall(wall.id,{start:{...wall.start,y:v}})}/></div>
      <div className="twocol"><NumberField l="End X" v={rounded(wall.end.x)} begin={begin} on={v=>p.updateWall(wall.id,{end:{...wall.end,x:v}})}/><NumberField l="End Y" v={rounded(wall.end.y)} begin={begin} on={v=>p.updateWall(wall.id,{end:{...wall.end,y:v}})}/></div>
      <WallGeometryEditor wall={wall} />
      <Field l="Texture" v={wall.textureName} begin={begin} on={v=>p.updateWall(wall.id,{textureName:v})}/>
      <div className="twocol"><NumberField l="Height (m)" v={wall.textureHeight} begin={begin} on={v=>v>0&&p.updateWall(wall.id,{textureHeight:v})}/><NumberField l="Width" v={wall.textureWidth} begin={begin} on={v=>v>0&&p.updateWall(wall.id,{textureWidth:v})}/></div>
      <div className="twocol"><NumberField l="Texture Scale" v={wall.textureScale} begin={begin} on={v=>v>0&&p.updateWall(wall.id,{textureScale:v})}/><NumberField l="Alpha" v={wall.alpha} step={.1} begin={begin} on={v=>v>=0&&v<=1&&p.updateWall(wall.id,{alpha:v})}/></div>
      <label className="check"><input type="checkbox" checked={wall.enabled} onChange={x=>p.updateWall(wall.id,{enabled:x.target.checked})}/> Enabled</label><div className="actions"><button className="danger" onClick={()=>remove(wall.id)}><Trash2/>Delete</button></div><BuildingConfig/></aside>;
  }
  if (door) {
    return <aside className="inspector"><div className="inspector-title">DOOR PROPERTIES</div>
      <Field l="Name" v={door.name} begin={begin} on={v=>p.updateDoor(door.id,{name:v})}/>
      <SelectField l="Door Type" v={door.type} options={['hinged','double_hinged','sliding','double_sliding']} begin={begin} on={v=>p.updateDoor(door.id,{type:v as BuildingDoorType})}/>
      <SelectField l="Motion Axis" v={door.motionAxis} options={['start','end']} begin={begin} on={v=>p.updateDoor(door.id,{motionAxis:v as 'start'|'end'})}/>
      <div className="twocol"><NumberField l="Motion Degrees" v={door.motionDegrees} begin={begin} on={v=>p.updateDoor(door.id,{motionDegrees:v})}/><SelectField l="Direction" v={String(door.motionDirection)} options={['1','-1']} begin={begin} on={v=>p.updateDoor(door.id,{motionDirection:v==='-1'?-1:1})}/></div>
      <Field l="Plugin" v={door.plugin} begin={begin} on={v=>p.updateDoor(door.id,{plugin:v})}/><NumberField l="Right/Left Ratio" v={door.rightLeftRatio} begin={begin} on={v=>v>0&&p.updateDoor(door.id,{rightLeftRatio:v})}/>
      <label className="check"><input type="checkbox" checked={door.enabled} onChange={x=>p.updateDoor(door.id,{enabled:x.target.checked})}/> Enabled</label><div className="actions"><button className="danger" onClick={()=>remove(door.id)}><Trash2/>Delete</button></div><BuildingConfig/></aside>;
  }
  if (floor) {
    return <aside className="inspector"><div className="inspector-title">FLOOR PROPERTIES</div>
      <Field l="Name" v={floor.name} begin={begin} on={v=>p.updateFloor(floor.id,{name:v})}/><Field l="Texture" v={floor.textureName} begin={begin} on={v=>p.updateFloor(floor.id,{textureName:v})}/><Field l="Ceiling Texture" v={floor.ceilingTexture} begin={begin} on={v=>p.updateFloor(floor.id,{ceilingTexture:v})}/>
      <div className="twocol"><NumberField l="Texture Scale" v={floor.textureScale} begin={begin} on={v=>v>0&&p.updateFloor(floor.id,{textureScale:v})}/><NumberField l="Rotation" v={floor.textureRotation} begin={begin} on={v=>p.updateFloor(floor.id,{textureRotation:v})}/></div><NumberField l="Ceiling Scale" v={floor.ceilingScale} begin={begin} on={v=>v>0&&p.updateFloor(floor.id,{ceilingScale:v})}/>
      <label className="check"><input type="checkbox" checked={floor.indoor} onChange={x=>p.updateFloor(floor.id,{indoor:x.target.checked})}/> Indoor</label><label className="check"><input type="checkbox" checked={floor.enabled} onChange={x=>p.updateFloor(floor.id,{enabled:x.target.checked})}/> Enabled</label><div className="kv"><span>Vertices</span><b>{floor.polygon.length}</b></div><div className="actions"><button className="danger" onClick={()=>remove(floor.id)}><Trash2/>Delete</button></div><BuildingConfig/></aside>;
  }
  if (buildingModel) {
    return <aside className="inspector"><div className="inspector-title">MODEL PROPERTIES</div><Field l="Name" v={buildingModel.name} begin={begin} on={v=>p.updateModel(buildingModel.id,{name:v})}/><Field l="Model Name" v={buildingModel.modelName} begin={begin} on={v=>p.updateModel(buildingModel.id,{modelName:v})}/><div className="twocol"><NumberField l="X" v={rounded(buildingModel.x)} begin={begin} on={v=>p.updateModel(buildingModel.id,{x:v})}/><NumberField l="Y" v={rounded(buildingModel.y)} begin={begin} on={v=>p.updateModel(buildingModel.id,{y:v})}/></div><div className="twocol"><NumberField l="Yaw (rad)" v={buildingModel.yaw} begin={begin} on={v=>p.updateModel(buildingModel.id,{yaw:v})}/><NumberField l="Z" v={buildingModel.z} begin={begin} on={v=>p.updateModel(buildingModel.id,{z:v})}/></div><label className="check"><input type="checkbox" checked={buildingModel.static} onChange={x=>p.updateModel(buildingModel.id,{static:x.target.checked})}/> Static</label><label className="check"><input type="checkbox" checked={buildingModel.dispensable} onChange={x=>p.updateModel(buildingModel.id,{dispensable:x.target.checked})}/> Dispensable</label><div className="actions"><button className="danger" onClick={()=>remove(buildingModel.id)}><Trash2/>Delete</button></div><BuildingConfig/></aside>;
  }
  if (buildingMeasurement) {
    return <aside className="inspector"><div className="inspector-title">MEASUREMENT PROPERTIES</div><Field l="Name" v={buildingMeasurement.name} begin={begin} on={v=>p.updateMeasurement(buildingMeasurement.id,{name:v})}/><NumberField l="Distance (m)" v={buildingMeasurement.distance} begin={begin} on={v=>v>0&&p.updateMeasurement(buildingMeasurement.id,{distance:v})}/><div className="actions"><button className="danger" onClick={()=>remove(buildingMeasurement.id)}><Trash2/>Delete</button></div><BuildingConfig/></aside>;
  }

  return null;

  function remove(entityId: string) {
    p.commit();
    p.deleteIds([entityId]);
    setSelection([]);
    setSelectedPathPoint(null);
  }

  function duplicateObject(value: NavigationObject) {
    p.commit();
    const copy = { ...structuredClone(value), id: value.id + '-' + crypto.randomUUID().slice(0, 4), name: value.name + ' Copy', x: value.x + .5, y: value.y + .5 };
    p.addObject(copy);
    setSelection([copy.id]);
  }

  function duplicateZone(value: NonNullable<typeof zone>) {
    p.commit();
    const copy = { ...structuredClone(value), id: value.id + '-' + crypto.randomUUID().slice(0, 4), name: value.name + ' Copy', polygon: value.polygon.map(q => ({ x: q.x + .5, y: q.y + .5 })) };
    p.addZone(copy);
    setSelection([copy.id]);
  }
}



function WallGeometryEditor({ wall }: { wall: BuildingWall }) {
  const p = useProjectStore();
  const [anchor, setAnchor] = useState<WallResizeAnchor>('start');
  const length = wallLength(wall.start, wall.end);
  const angle = wallAngleDegrees(wall.start, wall.end);

  const apply = (nextLength: number, nextAngle: number) => {
    if (!Number.isFinite(nextLength) || nextLength <= 0 || !Number.isFinite(nextAngle)) return;
    const next = resizeWall(wall.start, wall.end, nextLength, nextAngle, anchor);
    p.updateWall(wall.id, next);
  };

  return <div className="wall-geometry-card">
    <div className="wall-geometry-head">
      <div>
        <span className="group-title">WALL GEOMETRY</span>
        <small>Edit exact wall length and angle after drawing.</small>
      </div>
      <b>{length.toFixed(3)} m</b>
    </div>
    <div className="twocol">
      <NumberField l="Length (m)" v={Number(length.toFixed(3))} step={0.05} begin={() => p.commit()} on={v => apply(v, angle)} />
      <NumberField l="Angle (°)" v={Number(angle.toFixed(2))} step={1} begin={() => p.commit()} on={v => apply(length, v)} />
    </div>
    <div className="wall-anchor-label">Extend / rotate around</div>
    <div className="wall-anchor-toggle" role="group" aria-label="Wall resize anchor">
      <button type="button" className={anchor === 'start' ? 'active' : ''} onClick={() => setAnchor('start')}>Start</button>
      <button type="button" className={anchor === 'center' ? 'active' : ''} onClick={() => setAnchor('center')}>Center</button>
      <button type="button" className={anchor === 'end' ? 'active' : ''} onClick={() => setAnchor('end')}>End</button>
    </div>
    <div className="wall-geometry-help">
      Start keeps the start point fixed, End keeps the end point fixed, and Center grows/shrinks equally in both directions.
    </div>
  </div>;
}

function PathPointEditor({ path, selected, onSelect }: { path: { id: string; points: { x: number; y: number }[] }; selected: number | null; onSelect: (index: number | null) => void }) {
  const p = useProjectStore();
  const point = selected !== null ? path.points[selected] : undefined;
  const canDelete = path.points.length > 2 && point !== undefined;

  const updatePoint = (axis: 'x' | 'y', value: number) => {
    if (selected === null || !point) return;
    const points = [...path.points];
    points[selected] = { ...points[selected], [axis]: value };
    p.updatePath(path.id, { points });
  };

  const deletePoint = () => {
    if (!canDelete || selected === null) return;
    p.commit();
    p.updatePath(path.id, { points: path.points.filter((_, index) => index !== selected) });
    onSelect(null);
  };

  return <div className="path-point-card">
    <div className="path-point-head">
      <div>
        <span className="group-title">PATH POINTS</span>
        <small>Click a vertex on the map to select it.</small>
      </div>
      {selected !== null && point && <b>Point {selected + 1}</b>}
    </div>
    {selected !== null && point ? <>
      <div className="twocol">
        <NumberField l="X (m)" v={Number(point.x.toFixed(3))} begin={() => p.commit()} on={v => updatePoint('x', v)} />
        <NumberField l="Y (m)" v={Number(point.y.toFixed(3))} begin={() => p.commit()} on={v => updatePoint('y', v)} />
      </div>
      <button className="delete-path-point" type="button" disabled={!canDelete} onClick={deletePoint} title={canDelete ? 'Delete only this path vertex' : 'A path must contain at least 2 points'}>
        <Trash2 /> Delete Point {selected + 1}
      </button>
      <div className="path-point-help">You can also press Delete or Backspace. Removing a point keeps the rest of the path connected.</div>
      {!canDelete && <div className="path-point-warning">A path requires at least 2 points, so this vertex cannot be removed.</div>}
    </> : <div className="path-point-empty">No path point selected. Click one of the circular vertices on the selected path.</div>}
  </div>;
}


function PathConnectivityCard({ path }: { path: NavigationPath }) {
  const p = useProjectStore();
  const [message, setMessage] = useState('');
  const start = endpointConnectionStatus(p.paths, p.objects, path.id, 'start');
  const end = endpointConnectionStatus(p.paths, p.objects, path.id, 'end');
  const mergeCandidate = findNearestMergeCandidate(p.paths, path.id, DEFAULT_PATH_SNAP_DISTANCE_M);

  const connect = (endpoint: 'start' | 'end') => {
    p.commit();
    const result = connectPathEndpoint(p.paths, p.objects, path.id, endpoint, DEFAULT_PATH_SNAP_DISTANCE_M);
    if (!result.candidate) {
      setMessage(`No waypoint/station/path found within ${DEFAULT_PATH_SNAP_DISTANCE_M.toFixed(2)} m of the ${endpoint} endpoint.`);
      return;
    }
    p.replacePaths(result.paths);
    const targetKind = result.candidate.kind === 'object' ? 'navigation object' : result.candidate.kind === 'path_segment' ? 'path segment (junction created)' : 'path vertex';
    setMessage(`${endpoint === 'start' ? 'Start' : 'End'} connected to ${result.candidate.targetName} — ${targetKind}.`);
  };

  const connectBoth = () => {
    p.commit();
    let next = p.paths;
    const a = connectPathEndpoint(next, p.objects, path.id, 'start', DEFAULT_PATH_SNAP_DISTANCE_M);
    next = a.paths;
    const b = connectPathEndpoint(next, p.objects, path.id, 'end', DEFAULT_PATH_SNAP_DISTANCE_M);
    next = b.paths;
    if (!a.candidate && !b.candidate) {
      setMessage(`No connection candidates found within ${DEFAULT_PATH_SNAP_DISTANCE_M.toFixed(2)} m.`);
      return;
    }
    p.replacePaths(next);
    setMessage(`Connected ${[a.candidate ? 'start' : '', b.candidate ? 'end' : ''].filter(Boolean).join(' + ')} endpoint${a.candidate && b.candidate ? 's' : ''}.`);
  };

  const mergeNearest = () => {
    if (!mergeCandidate?.compatible) return;
    p.commit();
    const result = mergeWithNearestPath(p.paths, path.id, DEFAULT_PATH_SNAP_DISTANCE_M);
    if (!result) {
      setMessage('The nearest path cannot be merged safely. Use Connect instead.');
      return;
    }
    p.replacePaths(result.paths);
    setMessage(`Merged ${mergeCandidate.pathName} into this path. The shared endpoint is now one vertex.`);
  };

  return <div className="path-connect-card">
    <div className="path-connect-head">
      <div>
        <span className="group-title">PATH CONNECTIVITY</span>
        <small>Green junction = exact topology connection, not just visual overlap.</small>
      </div>
      <span className="snap-range">Snap ≤ {DEFAULT_PATH_SNAP_DISTANCE_M.toFixed(2)} m</span>
    </div>
    <div className="endpoint-status-grid">
      <div className={start.connected ? 'connected' : 'open'}>
        <span>START</span><b>{start.connected ? <><CircleCheck /> Connected</> : 'Open'}</b>
        <small>{start.labels.length ? start.labels.join(', ') : 'No exact connection'}</small>
      </div>
      <div className={end.connected ? 'connected' : 'open'}>
        <span>END</span><b>{end.connected ? <><CircleCheck /> Connected</> : 'Open'}</b>
        <small>{end.labels.length ? end.labels.join(', ') : 'No exact connection'}</small>
      </div>
    </div>
    <div className="path-connect-actions">
      <button type="button" onClick={() => connect('start')}><Link2 /> Connect Start</button>
      <button type="button" onClick={() => connect('end')}><Link2 /> Connect End</button>
      <button type="button" onClick={connectBoth}><Link2 /> Connect Both</button>
    </div>
    <button className="merge-path-button" type="button" disabled={!mergeCandidate?.compatible} onClick={mergeNearest} title={mergeCandidate?.reason ?? 'Merge the nearest compatible path endpoint'}>
      <GitMerge /> {mergeCandidate ? `Merge with ${mergeCandidate.pathName}` : 'No nearby path to merge'}
    </button>
    {mergeCandidate && !mergeCandidate.compatible && <div className="merge-warning">Cannot merge: {mergeCandidate.reason}</div>}
    {message && <div className="path-connect-message">{message}</div>}
    <div className="path-connect-help">Dragging a start/end vertex near another path or navigation object also auto-snaps it. Dropping an endpoint onto the middle of another path inserts a junction vertex into that path.</div>
  </div>;
}


function PathDirectionControl({ type, onChange }: { type: PathType; onChange: (type: PathType) => void }) {
  const isOneWay = type === 'one_way';
  const isTwoWay = type === 'bidirectional';
  const status = isOneWay ? 'ONE-WAY' : isTwoWay ? 'TWO-WAY' : 'NOT DIRECTIONAL';

  return <div className="path-direction-card">
    <div className="path-direction-head">
      <div>
        <span className="group-title">TRAVEL DIRECTION</span>
        <b className={`path-direction-status ${isOneWay ? 'oneway' : isTwoWay ? 'twoway' : 'neutral'}`}>{status}</b>
      </div>
    </div>
    <div className="path-direction-toggle" role="group" aria-label="Path travel direction">
      <button type="button" className={isOneWay ? 'active' : ''} onClick={() => onChange('one_way')} title="Robot may travel only from the first path vertex toward the last vertex">
        <ArrowRight />
        <span><b>One-way</b><small>A → B</small></span>
      </button>
      <button type="button" className={isTwoWay ? 'active' : ''} onClick={() => onChange('bidirectional')} title="Robot may travel in both directions on this path">
        <ArrowLeftRight />
        <span><b>Two-way</b><small>A ↔ B</small></span>
      </button>
    </div>
    <div className="path-direction-help">{isOneWay
      ? 'Direction follows the order of path vertices. Use Reverse Direction to flip A → B into B → A.'
      : isTwoWay
        ? 'The robot may traverse this path in either direction. Arrow pairs on the map indicate two-way travel.'
        : 'This path type does not explicitly define one-way/two-way travel. Choose a direction above if routing requires it.'}</div>
  </div>;
}

function HeadingEditor({ object }: { object: NavigationObject }) {
  const p = useProjectStore();
  const deg = normalizeDegrees(radiansToDegrees(object.yaw));
  const rad = normalizeAngle(object.yaw);
  const setYaw = (yaw: number) => p.updateObject(object.id, { yaw: normalizeAngle(yaw) });
  const preset = (degrees: number) => { p.commit(); setYaw(degreesToRadians(degrees)); };

  return <div className="heading-editor">
    <div className="heading-row">
      <div className="group-title">HEADING / ORIENTATION</div>
      <span className="heading-cardinal">{headingLabel(object.yaw)}</span>
    </div>
    <div className="twocol">
      <NumberField l="Heading (°)" v={Number(deg.toFixed(2))} step={1} begin={() => p.commit()} on={v => setYaw(degreesToRadians(v))} />
      <NumberField l="Yaw (rad)" v={Number(rad.toFixed(4))} step={0.01} begin={() => p.commit()} on={v => setYaw(v)} />
    </div>
    <div className="heading-presets" aria-label="Heading presets">
      <button type="button" onClick={() => preset(0)}>0° E</button>
      <button type="button" onClick={() => preset(90)}>90° N</button>
      <button type="button" onClick={() => preset(180)}>180° W</button>
      <button type="button" onClick={() => preset(-90)}>-90° S</button>
    </div>
    <div className="heading-help">Arrow = robot orientation at this navigation point. Drag the blue rotation handle on the map to set it visually.</div>
  </div>;
}

function Field({ l, v, on, begin }: { l: string; v: string; on: (x: string) => void; begin?: () => void }) {
  return <label className="field"><span>{l}</span><input value={v} onFocus={begin} onChange={e => on(e.target.value)} /></label>;
}

function NumberField({ l, v, on, begin, step = .05 }: { l: string; v: number; on: (x: number) => void; begin?: () => void; step?: number }) {
  const [text, setText] = useState(String(v));
  useEffect(() => setText(String(v)), [v]);
  return <label className="field"><span>{l}</span><input type="number" step={step} value={text} onFocus={() => { setText(String(v)); begin?.(); }} onChange={e => { setText(e.target.value); const value = Number(e.target.value); if (e.target.value !== '' && Number.isFinite(value)) on(value); }} onBlur={() => setText(String(v))} /></label>;
}

function SelectField({ l, v, options, on, begin }: { l: string; v: string; options: string[]; on: (x: string) => void; begin?: () => void }) {
  return <label className="field"><span>{l}</span><select value={v} onFocus={begin} onChange={e => on(e.target.value)}>{options.map(x => <option key={x} value={x}>{x.replaceAll('_', ' ')}</option>)}</select></label>;
}


function BuildingConfig() {
  const p = useProjectStore();
  const b = p.building.config;
  const begin = () => p.commit();

  const fallbackReference: ReferenceCoordinatesConfig = {
    mapName: b.buildingName || p.metadata.name || '',
    points: [],
  };

  const reference = b.referenceCoordinates ?? fallbackReference;

  const updateReference = (next: ReferenceCoordinatesConfig) => {
    p.updateBuildingConfig({ referenceCoordinates: next });
  };

  const updateReferencePoint = (
    index: number,
    side: 'rmf' | 'robot',
    axis: 'x' | 'y',
    value: number,
  ) => {
    const points = reference.points.map((pair, i) =>
      i === index
        ? {
            ...pair,
            [side]: {
              ...pair[side],
              [axis]: value,
            },
          }
        : pair,
    );

    updateReference({
      ...reference,
      points,
    });
  };

  const addReferencePoint = () => {
    updateReference({
      ...reference,
      points: [
        ...reference.points,
        {
          rmf: { x: 0, y: 0 },
          robot: { x: 0, y: 0 },
        },
      ],
    });
  };

  const removeReferencePoint = (index: number) => {
    if (reference.points.length <= 2) return;
    updateReference({
      ...reference,
      points: reference.points.filter((_, i) => i !== index),
    });
  };

  return <div className="robotcfg">
    <div className="group-title">RMF BUILDING / LEVEL</div>

    <Field
      l="Building Name"
      v={b.buildingName}
      begin={begin}
      on={v => p.updateBuildingConfig({ buildingName: v })}
    />

    <div className="twocol">
      <Field
        l="Level"
        v={b.levelName}
        begin={begin}
        on={v => p.updateBuildingConfig({ levelName: v })}
      />
      <Field
        l="Reference Level"
        v={b.referenceLevelName}
        begin={begin}
        on={v => p.updateBuildingConfig({ referenceLevelName: v })}
      />
    </div>

    <NumberField
      l="Elevation (m)"
      v={b.elevation}
      begin={begin}
      on={v => p.updateBuildingConfig({ elevation: v })}
    />

    <div className="robotnote">Used by RMF .building.yaml export.</div>

    <div className="path-direction-card">
      <div className="path-direction-head">
        <div>
          <span className="group-title">REFERENCE COORDINATES</span>
          <small>RMF ↔ Robot coordinate calibration</small>
        </div>
      </div>

      <Field
        l="Map Name"
        v={reference.mapName}
        begin={begin}
        on={v => updateReference({ ...reference, mapName: v })}
      />

      {reference.points.map((pair, index) => <div className="path-point-card" key={`ref-${index}`}>
        <div className="path-point-head">
          <div>
            <span className="group-title">POINT {index + 1}</span>
            <small>RMF point ↔ Robot point</small>
          </div>
          {reference.points.length > 2 && <button
            type="button"
            className="delete-path-point"
            onClick={() => {
              begin();
              removeReferencePoint(index);
            }}
          >
            Remove
          </button>}
        </div>

        <div className="group-title">RMF</div>
        <div className="twocol">
          <NumberField
            l="X"
            v={pair.rmf.x}
            step={0.01}
            begin={begin}
            on={v => updateReferencePoint(index, 'rmf', 'x', v)}
          />
          <NumberField
            l="Y"
            v={pair.rmf.y}
            step={0.01}
            begin={begin}
            on={v => updateReferencePoint(index, 'rmf', 'y', v)}
          />
        </div>

        <div className="group-title">ROBOT</div>
        <div className="twocol">
          <NumberField
            l="X"
            v={pair.robot.x}
            step={0.01}
            begin={begin}
            on={v => updateReferencePoint(index, 'robot', 'x', v)}
          />
          <NumberField
            l="Y"
            v={pair.robot.y}
            step={0.01}
            begin={begin}
            on={v => updateReferencePoint(index, 'robot', 'y', v)}
          />
        </div>
      </div>)}

      <button
        type="button"
        onClick={() => {
          begin();
          addReferencePoint();
        }}
      >
        + Add Reference Point
      </button>

      <div className="path-direction-help">
        Point order is preserved during export: rmf[0] ↔ robot[0], rmf[1] ↔ robot[1], etc.
      </div>
    </div>
  </div>;
}

function RobotConfig() {
  const p = useProjectStore();
  const begin = () => p.commit();
  return <div className="robotcfg">
    <div className="group-title">ROBOT CONFIGURATION</div>
    <div className="kv"><span>Profile</span><b>{p.robot.name}</b></div>
    <div className="twocol">
      <NumberField l="Width" v={p.robot.width} begin={begin} on={v => v > 0 && p.updateRobot({ width: v })} />
      <NumberField l="Length" v={p.robot.length} begin={begin} on={v => v > 0 && p.updateRobot({ length: v })} />
    </div>
    <div className="twocol">
      <NumberField l="Safety" v={p.robot.safetyMargin} begin={begin} on={v => v >= 0 && p.updateRobot({ safetyMargin: v })} />
      <NumberField l="Inflation" v={p.robot.inflationRadius} begin={begin} on={v => v >= 0 && p.updateRobot({ inflationRadius: v })} />
    </div>
    <div className="twocol">
      <NumberField l="Min Clearance" v={p.robot.minimumClearance} begin={begin} on={v => v >= 0 && p.updateRobot({ minimumClearance: v })} />
      <NumberField l="Turning Radius" v={p.robot.minimumTurningRadius} begin={begin} on={v => v >= 0 && p.updateRobot({ minimumTurningRadius: v })} />
    </div>
    <NumberField l="Max Speed (m/s)" v={p.robot.maxSpeed} begin={begin} on={v => v > 0 && p.updateRobot({ maxSpeed: v })} />
    <div className="robotnote">Select any waypoint or station to preview the footprint + safety margin on the map.</div>
  </div>;
}
