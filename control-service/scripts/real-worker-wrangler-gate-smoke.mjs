// A real Wrangler dev local-worker smoke, NOT a production shutdown acceptance.
// All persistent storage is disposable and no application mutation route is used.
import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { setTimeout as sleep } from "node:timers/promises";
const exec=promisify(execFile);
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..");
// Use the repository's npm-ci pinned Wrangler, never an alternate QA CLI.
const WRANGLER=join(ROOT,"node_modules","wrangler","bin","wrangler.js");
if(!existsSync(WRANGLER))throw Error("LOCKED_WRANGLER_NOT_INSTALLED");
const DB="price-report-control-local-db";
async function sparePort() {
 const server=createServer();
 await new Promise((ok,bad)=>server.once("error",bad).listen(0,"127.0.0.1",ok));
 const value=server.address().port;
 await new Promise(ok=>server.close(ok));return value;
}
const store=await mkdtemp(join(tmpdir(),"control-worker-real-"));
const port=await sparePort();
let processChild=null, logs="";
try {
  const args=[WRANGLER,"d1","migrations","apply",DB,"--local","--config","wrangler.local.jsonc",
    "--persist-to",store];
  await exec(process.execPath,args,{cwd:ROOT,windowsHide:true,timeout:90000,maxBuffer:3*1024*1024,
    env:{...process.env,CI:"1",WRANGLER_SEND_METRICS:"false"}});
  processChild=spawn(process.execPath,[WRANGLER,"dev","--local","--config","wrangler.local.jsonc",
    "--ip","127.0.0.1","--port",String(port),"--persist-to",store],{
    cwd:ROOT,stdio:["ignore","pipe","pipe"],windowsHide:true,
    env:{...process.env,CI:"1",WRANGLER_SEND_METRICS:"false",NO_COLOR:"1"}
  });
  processChild.stdout.on("data",chunk=>logs=(logs+String(chunk)).slice(-8000));
  processChild.stderr.on("data",chunk=>logs=(logs+String(chunk)).slice(-8000));
  let health;
  for(let attempt=0;attempt<150;attempt++) {
    if(processChild.exitCode!==null||processChild.signalCode!==null)
      throw Error("REAL_WORKER_EARLY_EXIT: "+logs.slice(-1500));
    try{
      const r=await fetch("http://127.0.0.1:"+port+"/health",
        {signal:AbortSignal.timeout(1200)});
      if(r.ok){health=await r.json();if(health.databaseReady===true)break;}
    }catch {}
    await sleep(300);
  }
  assert.equal(health?.databaseReady,true,"real Worker must query migrated local D1");
  const url="http://127.0.0.1:"+port;
  const p=await fetch(url+"/_local/ops/drain-preflight",{method:"POST",
    headers:{"authorization":"Bearer "+"x".repeat(40)},signal:AbortSignal.timeout(5000)});
  assert.equal(p.status,503,"real Worker MUST refuse shutdown preflight");
  const denial=await p.json();
  assert.equal(denial.code,"WORKER_ISOLATE_D1_DRAIN_UNVERIFIED");
  assert.equal(denial.autoRestartAllowed,false);
  const contract=await fetch(url+"/api/application-management/contract",{signal:AbortSignal.timeout(5000)});
  assert.equal(contract.status,200,"existing real Worker management contract unchanged");
  console.log(JSON.stringify({result:"REAL_CONTROL_WORKER_LOCAL_D1_GATE_PASS",database:DB,
    platform:process.platform,realWorkerHealthD1:true,realWorkerContract:true,
    realWorkerDrainPreflightStatus:503,globalIsolateDrain:"UNVERIFIED",
    gracefulWranglerExit:"NOT_VERIFIED",productionDataTouched:false,
    deployPerformed:false,autoRestartApproved:false}));
} catch(error) {
  console.error("REAL_CONTROL_WORKER_TEST_FAILED",String(error),logs.slice(-2200));throw error;
} finally {
  if(processChild&&processChild.exitCode===null&&processChild.signalCode===null){
    processChild.kill("SIGTERM"); // QA fixture-only cleanup, not a graceful ACK
    await Promise.race([new Promise(ok=>processChild.once("exit",ok)),sleep(15000)]).catch(()=>{});
  }
  await rm(store,{recursive:true,force:true,maxRetries:6,retryDelay:400});
}
