import { useEffect, useMemo, useRef, useState } from 'react';
import { Arrow, Circle, Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from 'react-konva';
import { X } from 'lucide-react';
import { useProjectStore } from '../../state/projectStore';
import { worldToPixel } from '../../map-engine/coordinates';
import { headingLabel, radiansToDegrees } from '../../geometry/angles';
import type { MapMetadata, NavigationPath } from '../../models';

const zoneFill: Record<string, string> = {
  no_go: 'rgba(239,68,68,.28)', slow: 'rgba(245,158,11,.25)', restricted: 'rgba(168,85,247,.25)',
  parking: 'rgba(59,130,246,.22)', loading: 'rgba(14,165,233,.22)', unloading: 'rgba(6,182,212,.22)',
  human_traffic: 'rgba(250,204,21,.22)', safety: 'rgba(34,197,94,.22)'
};


function PreviewPathDirection({ path, metadata, scale }: { path: NavigationPath; metadata: MapMetadata; scale: number }) {
  if (path.type !== 'one_way' && path.type !== 'bidirectional') return null;
  const color = path.type === 'one_way' ? '#075985' : '#17643b';
  return <>
    {path.points.slice(0, -1).flatMap((q, i) => {
      const a = worldToPixel(q.x, q.y, metadata), b = worldToPixel(path.points[i + 1].x, path.points[i + 1].y, metadata);
      const dx = b.x-a.x, dy = b.y-a.y, len = Math.hypot(dx,dy) || 1;
      const ux=dx/len, uy=dy/len, nx=-uy, ny=ux, mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
      const half=Math.min(15/scale,len*.16);
      if(path.type==='one_way') return [<Arrow key={`one-${i}`} points={[mx-ux*half,my-uy*half,mx+ux*half,my+uy*half]} pointerLength={6/scale} pointerWidth={6/scale} stroke={color} fill={color} strokeWidth={1.5/scale}/>];
      const off=4/scale;
      return [
        <Arrow key={`f-${i}`} points={[mx-ux*half+nx*off,my-uy*half+ny*off,mx+ux*half+nx*off,my+uy*half+ny*off]} pointerLength={5.5/scale} pointerWidth={5.5/scale} stroke={color} fill={color} strokeWidth={1.4/scale}/>,
        <Arrow key={`r-${i}`} points={[mx+ux*half-nx*off,my+uy*half-ny*off,mx-ux*half-nx*off,my-uy*half-ny*off]} pointerLength={5.5/scale} pointerWidth={5.5/scale} stroke={color} fill={color} strokeWidth={1.4/scale}/>
      ];
    })}
  </>;
}

export function PreviewDialog({ onClose }: { onClose: () => void }) {
  const p = useProjectStore();
  const host = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 820, h: 650 });
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const ro = new ResizeObserver(([entry]) => setSize({ w: Math.max(320, entry.contentRect.width), h: Math.max(300, entry.contentRect.height) }));
    if (host.current) ro.observe(host.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!p.image?.dataUrl) { setImage(null); return; }
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = p.image.dataUrl;
    return () => { img.onload = null; };
  }, [p.image?.dataUrl]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  const fit = useMemo(() => {
    const pad = 28;
    const scale = Math.max(.01, Math.min((size.w - pad * 2) / p.metadata.width, (size.h - pad * 2) / p.metadata.height));
    return { scale, x: (size.w - p.metadata.width * scale) / 2, y: (size.h - p.metadata.height * scale) / 2 };
  }, [size, p.metadata.width, p.metadata.height]);

  const worldWidth = p.metadata.width * p.metadata.resolution;
  const worldHeight = p.metadata.height * p.metadata.resolution;

  return <div className="previewback" role="dialog" aria-modal="true" aria-label="Map preview">
    <div className="previewwindow">
      <header className="previewhead">
        <div><b>Map Preview</b><span>{p.name} · {worldWidth.toFixed(2)} × {worldHeight.toFixed(2)} m</span></div>
        <button onClick={onClose} title="Close preview"><X/></button>
      </header>
      <div className="previewcontent">
        <div className="previewcanvas" ref={host}>
          <Stage width={size.w} height={size.h} x={fit.x} y={fit.y} scaleX={fit.scale} scaleY={fit.scale}>
            <Layer listening={false}>
              <Rect width={p.metadata.width} height={p.metadata.height} fill="#e8ecef" stroke="#64748b" strokeWidth={1 / fit.scale}/>
              {image && <KonvaImage image={image} width={p.metadata.width} height={p.metadata.height}/>}
            </Layer>
            <Layer listening={false}>
              {p.zones.map(zone => {
                const pts = zone.polygon.flatMap(q => { const v = worldToPixel(q.x, q.y, p.metadata); return [v.x, v.y]; });
                if (pts.length < 6) return null;
                return <Group key={zone.id}>
                  <Line points={pts} closed fill={zoneFill[zone.type]} stroke="#7c5b3e" strokeWidth={1.5 / fit.scale}/>
                  <Text x={pts[0] + 6 / fit.scale} y={pts[1] + 5 / fit.scale} text={`${zone.name} [${zone.type}]`} fontSize={11 / fit.scale} fill="#4b3525"/>
                </Group>;
              })}
              {p.paths.map(path => {
                const pts = path.points.flatMap(q => { const v = worldToPixel(q.x, q.y, p.metadata); return [v.x, v.y]; });
                if (pts.length < 4) return null;
                const first = worldToPixel(path.points[0].x, path.points[0].y, p.metadata);
                return <Group key={path.id}>
                  <Line points={pts} stroke={path.type === 'restricted' ? '#ef4444' : '#334155'} strokeWidth={3 / fit.scale} lineCap="round" lineJoin="round"/>
                  <PreviewPathDirection path={path} metadata={p.metadata} scale={fit.scale} />
                  <Text x={first.x + 5 / fit.scale} y={first.y + 7 / fit.scale} text={path.name} fontSize={10 / fit.scale} fill="#1e293b"/>
                </Group>;
              })}
              {p.objects.map(object => {
                const v = worldToPixel(object.x, object.y, p.metadata);
                const station = ['charging_station','docking_station'].includes(object.type);
                return <Group key={object.id} x={v.x} y={v.y} rotation={-object.yaw * 180 / Math.PI}>
                  <Circle radius={(station ? 8 : 6) / fit.scale} fill={station ? '#14b8a6' : object.type === 'home' ? '#3b82f6' : '#f8fafc'} stroke="#0f172a" strokeWidth={1.5/fit.scale}/>
                  <Arrow points={[0,0,16/fit.scale,0]} pointerLength={5/fit.scale} pointerWidth={5/fit.scale} stroke="#0f172a" fill="#0f172a" strokeWidth={1.5/fit.scale}/>
                  <Text text={object.name} x={9/fit.scale} y={-19/fit.scale} fontSize={11/fit.scale} fill="#0f172a" rotation={object.yaw * 180 / Math.PI}/>
                </Group>;
              })}
            </Layer>
          </Stage>
        </div>
        <aside className="previewdetails">
          <section className="previewsummary">
            <h3>Overview</h3>
            <div><span>Objects</span><b>{p.objects.length}</b></div>
            <div><span>Paths</span><b>{p.paths.length}</b></div>
            <div><span>Zones</span><b>{p.zones.length}</b></div>
            <div><span>Resolution</span><b>{p.metadata.resolution} m/px</b></div>
          </section>
          <section><h3>Navigation Objects</h3>{p.objects.length === 0 ? <small>No objects</small> : p.objects.map(o => <article className="previewitem" key={o.id}><b>{o.name}</b><span>{o.type.replaceAll('_',' ')}</span><code>X {o.x.toFixed(3)} · Y {o.y.toFixed(3)} · {headingLabel(o.yaw)} · {radiansToDegrees(o.yaw).toFixed(1)}° · {o.yaw.toFixed(4)} rad</code></article>)}</section>
          <section><h3>Paths</h3>{p.paths.length === 0 ? <small>No paths</small> : p.paths.map(path => <article className="previewitem" key={path.id}><b>{path.name}</b><span>{path.type.replaceAll('_',' ')} · {path.type === 'one_way' ? 'ONE-WAY A → B' : path.type === 'bidirectional' ? 'TWO-WAY A ↔ B' : 'direction not explicit'} · {path.points.length} points</span><code>{path.maxSpeed != null ? `Max ${path.maxSpeed} m/s` : 'No speed limit set'}</code></article>)}</section>
          <section><h3>Zones</h3>{p.zones.length === 0 ? <small>No zones</small> : p.zones.map(zone => <article className="previewitem" key={zone.id}><b>{zone.name}</b><span>{zone.type.replaceAll('_',' ')} · {zone.polygon.length} vertices</span><code>{zone.maxSpeed != null ? `Max ${zone.maxSpeed} m/s` : '—'}</code></article>)}</section>
        </aside>
      </div>
    </div>
  </div>;
}
