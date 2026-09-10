export function getFileExtension(name:string){const i=name.lastIndexOf('.');return i<0?'':name.slice(i+1).toLowerCase()}
export function normalizeFilename(name:string){return name.replace(/\\/g,'/').replace(/^\.\//,'').split('/').pop()?.toLowerCase()??''}
export const readFileAsText=(file:Blob)=>file.text();
export const readFileAsArrayBuffer=(file:Blob)=>file.arrayBuffer();
export function readFileAsDataURL(file:Blob):Promise<string>{return new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(r.error??new Error('Failed to read file'));r.onload=()=>resolve(String(r.result));r.readAsDataURL(file)})}
export function downloadBlob(blob:Blob,filename:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),0)}
export const downloadTextFile=(text:string,filename:string,type='text/plain;charset=utf-8')=>downloadBlob(new Blob([text],{type}),filename);
export const downloadJSON=(value:unknown,filename:string)=>downloadTextFile(JSON.stringify(value,null,2),filename,'application/json');
export function uint8ToBase64(bytes:Uint8Array){let s='';const chunk=0x8000;for(let i=0;i<bytes.length;i+=chunk)s+=String.fromCharCode(...bytes.subarray(i,i+chunk));return btoa(s)}
export function base64ToUint8(value:string){const s=atob(value);const out=new Uint8Array(s.length);for(let i=0;i<s.length;i++)out[i]=s.charCodeAt(i);return out}
export function safeFilename(value:string,fallback='map'){const clean=value.trim().replace(/[^a-z0-9._-]+/gi,'-').replace(/^-+|-+$/g,'');return clean||fallback}
