// Actual Wrangler D1 local backend persistence across fresh Node/SQLite processes.
// Own disposable --persist-to folder ONLY. NEVER --remote or real user D1.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
const run=promisify(execFile);
const dir=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const db="price-report-control-local-db";
const wrangler=join(dir,"node_modules","wrangler","bin","wrangler.js");
async function execute(storage,sql) {
  const args=[wrangler,"d1","execute",db,"--local","--config","wrangler.local.jsonc",
    "--persist-to",storage,"--command",sql,"--json"];
  const { stdout }=await run(process.execPath,args,{cwd:dir,timeout:80000,maxBuffer:2*1024*1024,windowsHide:true,
    env:{...process.env,CI:"1",WRANGLER_SEND_METRICS:"false",GIT_TERMINAL_PROMPT:"0"}});
  const ix=stdout.indexOf("[");
  if(ix<0)throw Error("LOCAL_D1_JSON_RESPONSE_MISSING: "+stdout.slice(-320));
  const data=JSON.parse(stdout.slice(ix));
  assert.ok(Array.isArray(data),"Wrangler local JSON expected");
  return data;
}
async function main() {
  const root=await mkdtemp(join(tmpdir(),"actual-control-d1-"));
  const store=join(root,"sqlite");
  const marker=randomUUID().replace(/-/g,"");
  try {
    await execute(store,"CREATE TABLE IF NOT EXISTS __shutdown_d1_qa (id TEXT PRIMARY KEY, value TEXT NOT NULL)");
    await execute(store,"INSERT INTO __shutdown_d1_qa (id,value) VALUES ('"+marker+"','PREPARED')");
    const first=await execute(store,"SELECT value FROM __shutdown_d1_qa WHERE id='"+marker+"'");
    assert.equal(first.flatMap(x=>x.results??[])[0]?.value,"PREPARED");
    await execute(store,"UPDATE __shutdown_d1_qa SET value='COMMITTED' WHERE id='"+marker+"'");
    const second=await execute(store,"SELECT value FROM __shutdown_d1_qa WHERE id='"+marker+"'");
    assert.equal(second.flatMap(x=>x.results??[])[0]?.value,"COMMITTED");
    console.log(JSON.stringify({status:"LOCAL_D1_WRITE_EXIT_READBACK_PASS",database:db,
      subprocesses:5,scope:"DISPOSABLE_SQLITE_BACKEND",realWorkerRequestDrain:"NOT_PROVEN",
      multiIsolateDrain:"NOT_PROVEN",windowsAppProcessExit:"NOT_PROVEN",productionDataTouched:false}));
  } finally {await rm(root,{force:true,recursive:true,maxRetries:6,retryDelay:300});}
}
main().catch(err=>{console.error(err);process.exitCode=1;});
