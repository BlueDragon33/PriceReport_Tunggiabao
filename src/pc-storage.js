const DB_NAME = 'pricereport-pc-workspace-v1';
const STORE_NAME = 'handles';
const FOLDER_KEY = 'backup-folder';

let sessionHandle = null;

export function supportsPcFolderAccess() {
  return typeof window !== 'undefined' &&
    typeof window.showDirectoryPicker === 'function' &&
    typeof indexedDB !== 'undefined';
}

export function sanitizePcFileName(value, fallback = 'bao-gia') {
  const cleaned = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '')
    .slice(0, 90);
  return cleaned || fallback;
}

function openHandleDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('indexeddb-open-failed'));
  });
}

async function putHandle(handle) {
  const db = await openHandleDb();
  if (!db) return false;
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(handle, FOLDER_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('indexeddb-write-failed'));
      tx.onabort = () => reject(tx.error || new Error('indexeddb-write-aborted'));
    });
    return true;
  } finally {
    db.close();
  }
}

async function readHandle() {
  if (sessionHandle) return sessionHandle;
  const db = await openHandleDb();
  if (!db) return null;
  try {
    const handle = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(FOLDER_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('indexeddb-read-failed'));
    });
    sessionHandle = handle || null;
    return sessionHandle;
  } finally {
    db.close();
  }
}

export async function choosePcBackupDirectory() {
  if (!supportsPcFolderAccess()) return null;
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
  sessionHandle = handle;
  try {
    await putHandle(handle);
  } catch (error) {
    console.warn('Could not persist PC folder handle; using it for this session only.', error);
  }
  return handle;
}

export async function getRememberedPcDirectory() {
  try {
    return await readHandle();
  } catch (error) {
    console.warn('Could not read remembered PC folder handle.', error);
    return null;
  }
}

export async function directoryPermission(handle, { request = false } = {}) {
  if (!handle) return 'denied';
  const options = { mode: 'readwrite' };
  try {
    const current = await handle.queryPermission?.(options);
    if (current === 'granted') return 'granted';
    if (request && handle.requestPermission) return await handle.requestPermission(options);
    return current || 'prompt';
  } catch {
    return 'denied';
  }
}

export async function writeTextToPcDirectory(handle, fileName, text, type = 'application/json') {
  if (!handle) throw new Error('pc-folder-not-configured');
  const fileHandle = await handle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  try {
    await writable.write(new Blob([text], { type }));
  } finally {
    await writable.close();
  }
  return fileName;
}

export async function readTextFromPcDirectory(handle, fileName) {
  if (!handle) throw new Error('pc-folder-not-configured');
  const fileHandle = await handle.getFileHandle(fileName);
  const file = await fileHandle.getFile();
  return await file.text();
}
