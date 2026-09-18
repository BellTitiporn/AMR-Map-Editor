export type DatabaseFileType = 'amrmap' | 'rmf_bundle';

export interface DatabaseFileSummary {
  fileType: DatabaseFileType;
  revision: number;
  fileName: string;
  sizeBytes: number;
  sha256: string;
  createdAt: string;
}

export interface DatabaseProjectSummary {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  files: DatabaseFileSummary[];
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '');

async function jsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json() as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Keep HTTP status text when the response is not JSON.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function checkDatabaseApi(): Promise<boolean> {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) return false;
  const body = await response.json() as { ok?: boolean };
  return body.ok === true;
}

export async function listDatabaseProjects(): Promise<DatabaseProjectSummary[]> {
  return jsonOrThrow<DatabaseProjectSummary[]>(await fetch(`${API_BASE}/projects`));
}

export async function createDatabaseProject(input: {
  name: string;
  description?: string;
  amrmap: Blob;
  rmfBundle: Blob;
}): Promise<{ id: string }> {
  const form = new FormData();
  form.set('name', input.name);
  form.set('description', input.description ?? '');
  form.set('amrmap', input.amrmap, `${safeName(input.name)}.amrmap`);
  form.set('rmfBundle', input.rmfBundle, `${safeName(input.name)}-rmf-bundle.zip`);
  return jsonOrThrow<{ id: string }>(await fetch(`${API_BASE}/projects`, { method: 'POST', body: form }));
}

export async function uploadDatabaseRevision(
  projectId: string,
  input: { name: string; amrmap: Blob; rmfBundle: Blob },
): Promise<void> {
  const form = new FormData();
  form.set('amrmap', input.amrmap, `${safeName(input.name)}.amrmap`);
  form.set('rmfBundle', input.rmfBundle, `${safeName(input.name)}-rmf-bundle.zip`);
  await jsonOrThrow(await fetch(`${API_BASE}/projects/${projectId}/files`, { method: 'POST', body: form }));
}

export async function fetchLatestDatabaseFile(projectId: string, type: DatabaseFileType): Promise<Blob> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/files/${type}/latest`);
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json() as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return response.blob();
}

export async function deleteDatabaseProject(projectId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/projects/${projectId}`, { method: 'DELETE' });
  if (!response.ok && response.status !== 204) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
}

export function databaseApiBaseUrl() {
  return API_BASE;
}

function safeName(value: string) {
  return (value.trim() || 'map')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'map';
}
