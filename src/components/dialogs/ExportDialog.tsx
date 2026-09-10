import { useMemo,useState } from 'react';
import { useProjectStore } from '../../state/projectStore';
import { useEditorStore } from '../../state/editorStore';
import { exportProjectFile } from '../../services/export/projectExporter';
import { downloadNavigation,downloadPaths,downloadWaypoints,downloadZones } from '../../services/export/navigationExporters';
import { exportPgm,exportRosZip,generateRosYaml } from '../../services/export/rosExporter';
import { downloadBuildingYaml } from '../../services/export/buildingExporter';
import { downloadBlob,downloadTextFile,exportBaseName } from '../../utils/files';

export function ExportDialog({onClose}:{onClose:()=>void}){
  const p=useProjectStore(),selection=useEditorStore(s=>s.selection);
  const initialName=useMemo(()=>exportBaseName(p.name||p.metadata.name||'map','map'),[p.name,p.metadata.name]);
  const [fileName,setFileName]=useState(initialName);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const selectedObjects=p.objects.filter(x=>selection.includes(x.id)),selectedPaths=p.paths.filter(x=>selection.includes(x.id)),selectedZones=p.zones.filter(x=>selection.includes(x.id));
  const base=exportBaseName(fileName,initialName||'map');

  const run=async(type:string,selected=false)=>{
    setError('');setBusy(true);
    try{
      const os=selected?selectedObjects:p.objects,ps=selected?selectedPaths:p.paths,zs=selected?selectedZones:p.zones;
      const selectedSuffix=selected?'-selected':'';
      if(type==='project')exportProjectFile(p.toProjectFile(),base);
      else if(type==='waypoints')downloadWaypoints(os,`${base}-waypoints${selectedSuffix}.json`);
      else if(type==='paths')downloadPaths(ps,`${base}-paths${selectedSuffix}.json`);
      else if(type==='zones')downloadZones(zs,`${base}-zones${selectedSuffix}.json`);
      else if(type==='navigation')downloadNavigation(p.metadata,os,ps,zs,[p.robot],`${base}-navigation${selectedSuffix}.json`);
      else if(type==='building'){
        downloadBuildingYaml(p.metadata, p.objects, p.paths, base);
      }
      else{
        if(!p.image)throw new Error('No occupancy map image is loaded.');
        if(type==='ros')await exportRosZip(p.metadata,p.image,base);
        else if(type==='pgm')await exportPgm(p.metadata,p.image,base);
        else if(type==='yaml')downloadTextFile(generateRosYaml(p.metadata,p.image,`${base}.pgm`),`${base}.yaml`,'application/yaml');
        else if(type==='png'){const blob=await (await fetch(p.image.dataUrl)).blob();downloadBlob(blob,`${base}.png`)}
      }
    }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}
  };

  return <div className="modalback"><div className="modal exportmodal">
    <h3>Export Map</h3>
    {error&&<div className="errorbox">{error}</div>}
    <div className="exportfilename">
      <label htmlFor="export-file-name"><b>File name</b></label>
      <input id="export-file-name" value={fileName} onChange={e=>setFileName(e.target.value)} disabled={busy} placeholder="e.g. WB220126_Floor3" autoFocus />
      <small>Enter a base name only. The correct suffix and extension are added automatically.</small>
      <small>Example: <code>{base}.amrmap</code> / <code>{base}-navigation.json</code></small>
    </div>
    <div className="exportgrid">
      {[['project','AMR Project'],['ros','ROS Map (.zip)'],['png','Occupancy PNG'],['pgm','PGM'],['yaml','YAML'],['building','RMF Building (.building.yaml)'],['waypoints','Waypoints JSON'],['paths','Paths JSON'],['zones','Zones JSON'],['navigation','Navigation JSON (Waypoints + Paths + Zones)']].map(([id,label])=><div className="exportrow" key={id}><b>{label}</b><button disabled={busy} onClick={()=>void run(id,false)}>Export All</button>{['waypoints','paths','zones','navigation'].includes(id)&&<button disabled={busy||!selection.length} onClick={()=>void run(id,true)}>Export Selected</button>}</div>)}
    </div>
    <div className="modalactions"><button onClick={onClose} disabled={busy}>Close</button></div>
  </div></div>;
}
