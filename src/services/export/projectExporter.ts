import type { AMRMapProjectFile } from '../../models';
import { downloadJSON,exportBaseName } from '../../utils/files';

export function exportProjectFile(file:AMRMapProjectFile,fileName?:string){
  const base=exportBaseName(fileName??file.project.name,'project');
  downloadJSON(file,`${base}.amrmap`);
}
