import { useEffect, useMemo, useState } from 'react';
import { Database, Download, RefreshCw, Save, Trash2, UploadCloud } from 'lucide-react';
import { useProjectStore } from '../../state/projectStore';
import { useEditorStore } from '../../state/editorStore';
import { importProjectFile } from '../../services/import/projectImporter';
import { generateRmfBundleBlob } from '../../services/export/rmfBundleExporter';
import {
  checkDatabaseApi,
  createDatabaseProject,
  databaseApiBaseUrl,
  deleteDatabaseProject,
  fetchLatestDatabaseFile,
  listDatabaseProjects,
  uploadDatabaseRevision,
  type DatabaseProjectSummary,
} from '../../services/database/databaseApi';
import { downloadBlob } from '../../utils/files';

export function DatabaseDialog({ onClose }: { onClose: () => void }) {
  const p = useProjectStore();
  const resetEditor = useEditorStore(s => s.resetEditor);
  const [projects, setProjects] = useState<DatabaseProjectSummary[]>([]);
  const [projectName, setProjectName] = useState(p.name);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const apiUrl = useMemo(() => databaseApiBaseUrl(), []);

  const refresh = async () => {
    setError('');
    try {
      const ok = await checkDatabaseApi();
      setApiOk(ok);
      if (!ok) throw new Error('Backend health check failed.');
      setProjects(await listDatabaseProjects());
    } catch (e) {
      setApiOk(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => { void refresh(); }, []);

  const currentFiles = async () => {
    const image = p.image;
    if (!image) throw new Error('Import a map before saving to the database.');

    const amrmap = new Blob(
      [JSON.stringify(p.toProjectFile(), null, 2)],
      { type: 'application/json' },
    );

    const rmfBundle = await generateRmfBundleBlob(
      p.metadata,
      image,
      p.objects,
      p.paths,
      p.zones,
      p.building,
      [p.robot],
    );

    return { amrmap, rmfBundle };
  };

  const saveNew = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const files = await currentFiles();
      await createDatabaseProject({ name: projectName.trim() || p.name || 'map', ...files });
      setMessage('Saved .amrmap and RMF Bundle to PostgreSQL.');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  const saveRevision = async (project: DatabaseProjectSummary) => {
    setBusy(true); setError(''); setMessage('');
    try {
      const files = await currentFiles();
      await uploadDatabaseRevision(project.id, { name: project.name, ...files });
      setMessage(`Saved new revision for ${project.name}.`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  const loadProject = async (project: DatabaseProjectSummary) => {
    if (p.dirty && !confirm('You have unsaved changes. Load project from database and discard them?')) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const blob = await fetchLatestDatabaseFile(project.id, 'amrmap');
      const file = new File([blob], `${project.name}.amrmap`, { type: 'application/json' });
      p.loadProject(await importProjectFile(file));
      resetEditor();
      setProjectName(project.name);
      setMessage(`Loaded ${project.name} from PostgreSQL.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  const downloadBundle = async (project: DatabaseProjectSummary) => {
    setBusy(true); setError('');
    try {
      const blob = await fetchLatestDatabaseFile(project.id, 'rmf_bundle');
      downloadBlob(blob, `${safeName(project.name)}-rmf-bundle.zip`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  const removeProject = async (project: DatabaseProjectSummary) => {
    if (!confirm(`Delete database project "${project.name}" and all revisions?`)) return;
    setBusy(true); setError('');
    try {
      await deleteDatabaseProject(project.id);
      setMessage(`Deleted ${project.name}.`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  return <div className="modalback">
    <div className="modal dbmodal">
      <div className="dbtitle">
        <div><h3><Database size={16}/> Project Database</h3><small>PostgreSQL API: {apiUrl}</small></div>
        <button onClick={onClose}>Close</button>
      </div>

      <div className={`dbstatus ${apiOk ? 'ok' : apiOk === false ? 'bad' : ''}`}>
        <span>{apiOk ? '● Connected' : apiOk === false ? '● Offline' : '● Checking...'}</span>
        <button disabled={busy} onClick={() => void refresh()}><RefreshCw size={14}/> Refresh</button>
      </div>

      {error && <div className="errorbox">{error}<br/><small>Start PostgreSQL and backend-node on port 3001, then press Refresh.</small></div>}
      {message && <div className="dbsuccess">{message}</div>}

      <section className="dbsavebox">
        <b>Save current AMR Map Editor project</b>
        <p>This generates the current <code>.amrmap</code> and RMF Bundle automatically. No Browse button is required.</p>
        <div className="dbnewrow">
          <label className="field"><span>Database project name</span><input value={projectName} onChange={e=>setProjectName(e.target.value)}/></label>
          <button className="primary" disabled={busy || !apiOk} onClick={() => void saveNew()}><UploadCloud size={15}/> Save as New</button>
        </div>
      </section>

      <section>
        <div className="dbsectiontitle"><b>Saved projects</b><span>{projects.length} project(s)</span></div>
        {!projects.length ? <div className="dbempty">No projects stored yet.</div> :
          <div className="dbprojects">{projects.map(project => {
            const amr = project.files.find(f=>f.fileType==='amrmap');
            const bundle = project.files.find(f=>f.fileType==='rmf_bundle');
            return <div className="dbproject" key={project.id}>
              <div className="dbprojectmain">
                <b>{project.name}</b>
                <small>{amr ? `.amrmap r${amr.revision}` : 'no .amrmap'} · {bundle ? `bundle r${bundle.revision}` : 'no bundle'} · {new Date(project.updatedAt).toLocaleString()}</small>
              </div>
              <div className="dbprojectactions">
                <button disabled={busy || !apiOk || !amr} onClick={()=>void loadProject(project)}><Download size={14}/> Load</button>
                <button disabled={busy || !apiOk} onClick={()=>void saveRevision(project)}><Save size={14}/> Save Revision</button>
                <button disabled={busy || !apiOk || !bundle} onClick={()=>void downloadBundle(project)}><Download size={14}/> Bundle</button>
                <button className="danger" disabled={busy || !apiOk} onClick={()=>void removeProject(project)}><Trash2 size={14}/></button>
              </div>
            </div>})}</div>}
      </section>
    </div>
  </div>;
}

function safeName(value: string) {
  return (value.trim() || 'map').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'map';
}
