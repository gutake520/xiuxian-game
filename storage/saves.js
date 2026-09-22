const NAME='xiuxian-game';
export function openDB(){return new Promise((resolve,reject)=>{const request=indexedDB.open(NAME,1);request.onupgradeneeded=()=>{for(const [name,key]of [['saves','slot'],['assets','id']])if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name,{keyPath:key})};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
export async function readSave(slot){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('saves');const r=tx.objectStore('saves').get(slot);tx.oncomplete=()=>{db.close();resolve(r.result||null)};tx.onabort=()=>{db.close();reject(tx.error||r.error)}})}
export async function writeSave(data){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data);tx.oncomplete=()=>{db.close();resolve(data)};tx.onabort=()=>{db.close();reject(tx.error||new Error('存档未写入'))}})}
export async function deleteSave(slot){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').delete(slot);tx.oncomplete=()=>{db.close();resolve()};tx.onabort=()=>{db.close();reject(tx.error)}})}
// Read, validate and write within ONE transaction, including across browser tabs.
export async function updateSave(slot,transform){const db=await openDB();return new Promise((resolve,reject)=>{
 const tx=db.transaction('saves','readwrite'),store=tx.objectStore('saves');let result,error;
 const req=store.get(slot);req.onsuccess=()=>{try{if(!req.result)throw new Error('存档不存在，请重新选择。');result=transform(req.result);if(result?.then)throw new Error('存档结算必须同步');store.put(result)}catch(e){error=e;tx.abort()}};
 tx.oncomplete=()=>{db.close();resolve(result)};tx.onabort=()=>{db.close();reject(error||tx.error||new Error('保存失败，请重试。'))};
})}
