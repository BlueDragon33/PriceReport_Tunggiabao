import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createStorageRepository } from '../src/storage/repository.js';
import { STORAGE_SCHEMA_META_KEY, STORAGE_SCHEMA_VERSION, ensureStorageSchemaMarker, migrateVersionedPayload } from '../src/storage/migrations.js';
class MemoryStorage { constructor(){this.map=new Map();} getItem(k){return this.map.has(k)?this.map.get(k):null;} setItem(k,v){this.map.set(k,String(v));} removeItem(k){this.map.delete(k);} }
const repo=createStorageRepository(new MemoryStorage());
const first=ensureStorageSchemaMarker(repo,{now:()=> '2026-09-27T00:00:00.000Z'});
assert.equal(first.ok,true); assert.equal(first.created,true); assert.equal(first.schemaVersion,STORAGE_SCHEMA_VERSION);
assert.equal(repo.readJson(STORAGE_SCHEMA_META_KEY).legacyFormatAdopted,true);
assert.equal(ensureStorageSchemaMarker(repo).created,false);
const fixture=JSON.parse(fs.readFileSync(new URL('../tests/fixtures/quotation-v1.json', import.meta.url),'utf8'));
const migrated=migrateVersionedPayload(fixture,1,3,{1:value=>({...value,customerName:value.customerName||''}),2:value=>({...value,migrated:true})});
assert.equal(migrated.schemaVersion,3); assert.equal(migrated.value.migrated,true);
assert.throws(()=>migrateVersionedPayload(fixture,1,2,{}),error=>error.code==='STORAGE_MIGRATION_MISSING');
console.log('STORAGE MIGRATION ENGINE PASS');
