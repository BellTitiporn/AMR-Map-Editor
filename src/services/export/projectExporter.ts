import type { AMRMapProjectFile } from '../../models';import { downloadJSON,safeFilename } from '../../utils/files';
export function exportProjectFile(file:AMRMapProjectFile){downloadJSON(file,`${safeFilename(file.project.name,'project')}.amrmap`)}
