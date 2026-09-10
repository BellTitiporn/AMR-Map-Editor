import { useEffect, useState } from 'react';
import { ArrowLeftRight, ArrowRight, CircleCheck, GitMerge, Link2, Copy, RotateCcw, Trash2 } from 'lucide-react';
import { useEditorStore } from '../../state/editorStore';
import { useProjectStore } from '../../state/projectStore';
import type { NavigationObject, NavigationPath, PathType, ZoneType } from '../../models';
import { degreesToRadians, headingLabel, normalizeAngle, normalizeDegrees, radiansToDegrees } from '../../geometry/angles';
import { connectPathEndpoint, DEFAULT_PATH_SNAP_DISTANCE_M, endpointConnectionStatus, findNearestMergeCandidate, mergeWithNearestPath } from '../../geometry/pathTopology';

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
  const rounded = (v: number) => Number(v.toFixed(3));
  const begin = () => p.commit();

  if (!id) {
    return <aside className="inspector">
      <div className="inspector-title">PROPERTIES</div>
      <div className="empty">Select an object, path, or zone to inspect properties.</div>
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
