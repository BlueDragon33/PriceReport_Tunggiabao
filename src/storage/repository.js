function storageError(code, key, cause) {
  const error = new Error(code); error.code = code; error.key = key || ''; error.cause = cause; error.recoverable = true; return error;
}
export function createStorageRepository(storage) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') throw new TypeError('A Storage-compatible adapter is required.');
  return Object.freeze({
    readRaw(key, fallback = null) { try { const value=storage.getItem(key); return value == null ? fallback : value; } catch { return fallback; } },
    readJson(key, fallback = null) { const raw=this.readRaw(key,null); if(raw==null) return fallback; try { return JSON.parse(raw); } catch { return fallback; } },
    writeRaw(key, value) {
      try { storage.setItem(key,String(value)); const verified=storage.getItem(key); if(verified!==String(value)) return {ok:false,error:storageError('STORAGE_VERIFY_FAILED',key)}; return {ok:true}; }
      catch(cause){ return {ok:false,error:storageError('STORAGE_WRITE_FAILED',key,cause)}; }
    },
    writeJson(key, value) { let serialized; try { serialized=JSON.stringify(value); } catch(cause){ return {ok:false,error:storageError('STORAGE_SERIALIZE_FAILED',key,cause)}; } return this.writeRaw(key,serialized); },
    remove(key) { try { storage.removeItem(key); return {ok:true}; } catch(cause){ return {ok:false,error:storageError('STORAGE_REMOVE_FAILED',key,cause)}; } },
    capture(keys=[]) {
      try { const snapshot={}; for(const key of keys) snapshot[key]=storage.getItem(key); return {ok:true,snapshot}; }
      catch(cause){ return {ok:false,error:storageError('STORAGE_SNAPSHOT_FAILED','',cause)}; }
    },
    restore(snapshot) {
      if(!snapshot || typeof snapshot!=='object' || Array.isArray(snapshot)) return {ok:false,error:storageError('STORAGE_SNAPSHOT_INVALID')};
      try {
        for(const [key,value] of Object.entries(snapshot)) { if(value==null) storage.removeItem(key); else storage.setItem(key,value); }
        for(const [key,value] of Object.entries(snapshot)) if(storage.getItem(key)!==value) return {ok:false,error:storageError('STORAGE_ROLLBACK_VERIFY_FAILED',key)};
        return {ok:true};
      } catch(cause){ return {ok:false,error:storageError('STORAGE_ROLLBACK_FAILED','',cause)}; }
    }
  });
}
