import assert from 'node:assert/strict';
import { createStorageRepository } from '../src/storage/repository.js';
class MemoryStorage { constructor(){this.map=new Map();this.failWrites=false;} getItem(k){return this.map.has(k)?this.map.get(k):null;} setItem(k,v){if(this.failWrites)throw new Error('quota');this.map.set(k,String(v));} removeItem(k){if(this.failWrites)throw new Error('quota');this.map.delete(k);} }
const memory=new MemoryStorage(), repo=createStorageRepository(memory);
assert.equal(repo.writeJson('quote',{a:1}).ok,true); assert.deepEqual(repo.readJson('quote',null),{a:1});
memory.setItem('bad','{oops'); assert.deepEqual(repo.readJson('bad',[]),[]);
repo.writeRaw('a','one'); repo.writeRaw('b','two'); const captured=repo.capture(['a','b','missing']); assert.equal(captured.ok,true);
repo.writeRaw('a','changed'); repo.remove('b'); assert.equal(repo.restore(captured.snapshot).ok,true);
assert.equal(repo.readRaw('a'),'one'); assert.equal(repo.readRaw('b'),'two'); assert.equal(repo.readRaw('missing'),null);
memory.failWrites=true; const failed=repo.writeRaw('quote','new'); assert.equal(failed.ok,false); assert.equal(failed.error.code,'STORAGE_WRITE_FAILED');
memory.failWrites=false; assert.deepEqual(repo.readJson('quote',null),{a:1});
console.log('STORAGE REPOSITORY PASS');
