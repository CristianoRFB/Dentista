const DB_NAME='odontoflow-clinical-media';
const STORE='photos';
function openDb():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>req.result.createObjectStore(STORE);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
export async function cachePhotoLocally(key:string,blob:Blob){const db=await openDb();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(blob,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
export async function readCachedPhoto(key:string){const db=await openDb();return new Promise<Blob|undefined>((resolve,reject)=>{const req=db.transaction(STORE).objectStore(STORE).get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
