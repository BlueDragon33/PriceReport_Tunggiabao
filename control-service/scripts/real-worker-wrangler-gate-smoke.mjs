// Actual source Worker + temporary D1 and per-boot private-file credentials.
// Proof never appears in argv, process.env, generated wrangler config, or logs.
// QA integration is NOT cross-isolate drain/Windows graceful-stop approval.
import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, mkdir, writeFile, chmod, readFile, rm } from "node:fs/promises";
import { createServer as createTcp } from "node:net";
import { createServer as createHttp, request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { setTimeout as sleep } from "node:timers/promises";

const exec=promisify(execFile);
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const WRANGLER=join(ROOT,"node_modules","wrangler","bin","wrangler.js");
const SOURCE_CONFIG=JSON.parse(await readFile(join(ROOT,"wrangler.local.jsonc"),"utf8"));
const DB=SOURCE_CONFIG.d1_databases[0].database_name;
async function portAvailable(){
  const sock=createTcp();await new Promise((ok,no)=>sock.once("error",no).listen(0,"127.0.0.1",ok));
  const p=sock.address().port;await new Promise(ok=>sock.close(ok));return p;
}
async function portReleased(port){
  const sock=createTcp();
  try {
    await new Promise((ok,no)=>sock.once("error",no).listen(port,"127.0.0.1",ok));
    return true;
  }catch{return false;}
  finally {if(sock.listening)await new Promise(ok=>sock.close(ok));}
}
async function windowsProcesses(){
  if(process.platform!=="win32")return [];
  const {stdout}=await exec("powershell.exe",[
    "-NoProfile","-NonInteractive","-Command",
    "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId | ConvertTo-Json -Compress"
  ],{timeout:15000,windowsHide:true,maxBuffer:2*1024*1024});
  const parsed=JSON.parse(stdout);
  const rows=Array.isArray(parsed)?parsed:[parsed];
  return rows.map(item=>({pid:Number(item.ProcessId),parent:Number(item.ParentProcessId)}));
}
function descendantsOf(rows,parentPid){
  const found=new Set(),pending=[parentPid];
  while(pending.length){
    const id=pending.pop();
    for(const row of rows)if(row.parent===id&&!found.has(row.pid)){
      found.add(row.pid);pending.push(row.pid);
    }
  }
  return found;
}
async function limitAccess(dir,file){
  await chmod(dir,0o700);await chmod(file,0o600);
  if(process.platform==="win32"){
    const data=(await exec("whoami.exe",["/user","/fo","csv","/nh"],{windowsHide:true,timeout:6000})).stdout;
    const sid=data.match(/S-\d-\d+(?:-\d+)+/)?.[0];
    if(!sid)throw Error("WIN32_SECRET_OWNER_SID_MISSING");
    // Windows chmod is not a DACL; enforce explicit current-user-only ACL.
    await exec("icacls.exe",[dir,"/inheritance:r","/grant:r","*"+sid+":(OI)(CI)F"],{windowsHide:true,timeout:10000});
    await exec("icacls.exe",[file,"/inheritance:r","/grant:r","*"+sid+":F"],{windowsHide:true,timeout:10000});
  }
}
const storage=await mkdtemp(join(tmpdir(),"real-wrangler-private-gate-"));
const secret= randomBytes(48).toString("base64url");
const controlSecret=randomBytes(48).toString("base64url");
const qaActor="qa-"+randomBytes(10).toString("hex")+"@example.invalid";
const config=join(storage,"wrangler.qa.json");
const varsFile=join(storage,".dev.vars");
const backend=await portAvailable();
const frontWanted=await portAvailable();
let child,proxy,log="";
let descendantsBeforeStop=null;
let qaCleanupVerified=false;
let verifiedProductReceipt=null;
try{
  const runtime={
    ...SOURCE_CONFIG,name:"qa-"+SOURCE_CONFIG.name,
    main:resolve(ROOT,SOURCE_CONFIG.main),
    d1_databases:SOURCE_CONFIG.d1_databases.map(db=>({
      ...db,migrations_dir:resolve(ROOT,db.migrations_dir??"migrations")
    }))
  };
  await writeFile(config,JSON.stringify(runtime,null,2)+"\n",{mode:0o600});
  await writeFile(varsFile,
    'LOCAL_OPS_GATEWAY_REQUIRED="1"\nLOCAL_OPS_INGRESS_PROOF="'+secret+'"\n'
      +'PRICE_REPORT_CONTROL_SERVICE_SECRET="'+controlSecret+'"\n',
    {mode:0o600,flag:"wx"});
  await limitAccess(storage,varsFile);
  const persist=join(storage,"d1");
  // Original migrations, temporary local D1. No remote options.
  await exec(process.execPath,[WRANGLER,"d1","migrations","apply",DB,
    "--local","--config",config,"--persist-to",persist],{
    cwd:ROOT,windowsHide:true,timeout:100000,maxBuffer:3*1024*1024,
    env:{...process.env,CI:"1",WRANGLER_SEND_METRICS:"false"}});
  const args=[WRANGLER,"dev","--local","--config",config,"--ip","127.0.0.1",
    "--port",String(backend),"--persist-to",persist];
  assert.equal(args.some(x=>x.includes(secret)),false,"no secret in CLI arguments");
  child=spawn(process.execPath,args,{cwd:ROOT,stdio:["ignore","pipe","pipe"],windowsHide:true,
    env:{...process.env,CI:"1",WRANGLER_SEND_METRICS:"false",NO_COLOR:"1"}});
  assert.equal(child.spawnargs.join(" ").includes(secret),false);
  assert.equal(child.spawnargs.join(" ").includes(controlSecret),false);
  child.stdout.on("data",d=>{log=(log+String(d)).slice(-15000)});
  child.stderr.on("data",d=>{log=(log+String(d)).slice(-15000)});
  const base="http://127.0.0.1:"+backend;
  let live=false;
  for(let i=0;i<150;i++){
    if(child.exitCode!==null||child.signalCode!==null)throw Error("WORKER_EXIT_EARLY: "+log.replaceAll(secret,"[REDACTED]").slice(-800));
    try{
      const r=await fetch(base+"/health",{headers:{"x-local-ops-ingress-proof":secret},signal:AbortSignal.timeout(1500)});
      if(r.ok&&(await r.json()).databaseReady===true){live=true;break;}
    }catch{}
    await sleep(300);
  }
  assert.equal(live,true,"real source Worker with temp-config .dev.vars must reach D1 health");
  assert.equal((await fetch(base+"/health")).status,403,"direct backend no-proof denied");
  const wrong=await fetch(base+"/health",{headers:{"x-local-ops-ingress-proof":"x".repeat(64)}});
  assert.equal(wrong.status,403);
  // Real Node forwarding proxy for integration, strips spoofed request proof.
  proxy=createHttp((req,res)=>{
    const headers={...req.headers,host:"127.0.0.1:"+backend,connection:"close"};
    delete headers["x-local-ops-ingress-proof"];
    headers["x-local-ops-ingress-proof"]=secret;
    const upstream=httpRequest({hostname:"127.0.0.1",port:backend,
      method:req.method,path:req.url,headers,agent:false},back=>{
      res.writeHead(back.statusCode??502,{...back.headers,connection:"close"});back.pipe(res);
    });
    upstream.once("error",()=>{if(!res.headersSent)res.writeHead(502);res.end()});
    req.pipe(upstream);
  });
  await new Promise((ok,no)=>proxy.once("error",no).listen(frontWanted,"127.0.0.1",ok));
  const publicUrl="http://127.0.0.1:"+frontWanted;
  const health=await fetch(publicUrl+"/health",{headers:{"x-local-ops-ingress-proof":"forged"}});
  assert.equal((await health.json()).databaseReady,true);
  const contract=await fetch(publicUrl+"/api/application-management/contract");
  assert.equal(contract.status,200);
  const blocked=await fetch(publicUrl+"/_local/ops/drain-preflight",{method:"POST"});
  assert.equal(blocked.status,503);
  assert.equal((await blocked.json()).autoRestartAllowed,false);
  assert.equal((await fetch(base+"/health")).status,403);
  assert.equal(child.spawnargs.join(" ").includes(secret),false);
  assert.equal(child.spawnargs.join(" ").includes(controlSecret),false);

  // Use the normal authenticated owner API against ONLY disposable D1.
  const headers={authorization:"Bearer "+controlSecret,
    "x-control-role":"owner","x-control-actor":qaActor,"content-type":"application/json"};
  const pre=await fetch(publicUrl+"/api/control/automation",{headers});
  assert.equal(pre.status,200,"temporary PriceReport policy GET");
  const before=(await pre.json()).automation;
  assert.ok(Number.isSafeInteger(before.revision)&&before.revision>=1);
  const desired={
    autoApproveDevices:!before.autoApproveDevices,
    autoBlockPendingDevices:!before.autoBlockPendingDevices,
    pendingBlockAfterHours:before.pendingBlockAfterHours===24?168:24,
  };
  const commandId=randomUUID();
  const commandPayload={
    operation:"set-device-automation",commandId,
    expected:{
      autoApproveDevices:before.autoApproveDevices,
      autoBlockPendingDevices:before.autoBlockPendingDevices,
      pendingBlockAfterHours:before.pendingBlockAfterHours,
    },
    desired,
  };
  const mutation=await fetch(publicUrl+"/api/control/automation",{
    method:"POST",headers,body:JSON.stringify(commandPayload),
  });
  assert.equal(mutation.status,200,"temporary source D1 mutation");
  const response=(await mutation.json()).automation;
  for(const field of Object.keys(desired))assert.equal(response[field],desired[field]);
  assert.equal(response.revision,before.revision+1);

  // Independent GET rather than reusing the mutation's response object.
  const observed=await fetch(publicUrl+"/api/control/automation",{headers});
  assert.equal(observed.status,200);
  const independent=(await observed.json()).automation;
  for(const field of Object.keys(desired))assert.equal(independent[field],desired[field]);
  assert.equal(independent.revision,response.revision);

  // Idempotent replay must not apply the mutation twice.
  const replay=await fetch(publicUrl+"/api/control/automation",{
    method:"POST",headers,body:JSON.stringify(commandPayload),
  });
  assert.equal(replay.status,200);
  assert.equal((await replay.json()).replayed,true);
  // A new command built from a stale revision must be refused.
  const stale=await fetch(publicUrl+"/api/control/automation",{
    method:"POST",headers,body:JSON.stringify({...commandPayload,commandId:randomUUID()}),
  });
  assert.equal(stale.status,409);
  const unchanged=await fetch(publicUrl+"/api/control/automation",{headers});
  const afterConflict=(await unchanged.json()).automation;
  assert.equal(afterConflict.revision,independent.revision);
  for(const field of Object.keys(desired))assert.equal(afterConflict[field],desired[field]);

  await new Promise(ok=>proxy.close(ok));
  proxy=null;
  const termination=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error("QA_WRANGLER_PROCESS_EXIT_TIMEOUT")),15000);
    child.once("exit",()=>{clearTimeout(timer);resolve();});
  });
  if(process.platform==="win32"){
    descendantsBeforeStop=descendantsOf(await windowsProcesses(),child.pid);
  }
  child.kill("SIGTERM"); // Disposable QA-only child; NOT native graceful CLI ACK.
  await termination;
  const lookup=await exec(process.execPath,[WRANGLER,"d1","execute",DB,
    "--local","--config",config,"--persist-to",persist,
    "--command","SELECT auto_approve_devices, auto_block_pending_devices, pending_block_after_hours, revision FROM kt_automation_policy WHERE id=1",
    "--json"],{
    cwd:ROOT,windowsHide:true,timeout:80000,maxBuffer:2*1024*1024,
    env:{...process.env,CI:"1",WRANGLER_SEND_METRICS:"false"}});
  const jsonStart=lookup.stdout.indexOf("[");
  assert.ok(jsonStart>=0,"independent D1 local subprocess JSON");
  const rows=JSON.parse(lookup.stdout.slice(jsonStart));
  const row=rows.flatMap(item=>item.results??[])[0];
  assert.equal(row?.auto_approve_devices,desired.autoApproveDevices?1:0);
  assert.equal(row?.auto_block_pending_devices,desired.autoBlockPendingDevices?1:0);
  assert.equal(row?.pending_block_after_hours,desired.pendingBlockAfterHours);
  assert.equal(row?.revision,independent.revision);
  // Logs can contain binding values from Wrangler; never surface them.
  verifiedProductReceipt={result:"SOURCE_WORKER_PRIVATE_DOTENV_GATE_PASS",
    platform:process.platform,database:DB,realD1Health:true,realWorkerContract:true,
    directBackend403:true,proxy200:true,shutdownPreflight503:true,
    secretInArgv:false,secretInProcessEnv:false,secretFileACLProtected:true,
    realSourceWorkerAutomationWrite:true,independentPolicyGet:true,
    replayIdempotencyChecked:true,staleRevisionRejected:true,
    persistedAutomationAfterWorkerExit:true,
    checkedFields:["autoApproveDevices","autoBlockPendingDevices","pendingBlockAfterHours","revision"],
    protectionScope:"other-user ACL; same-user process inspection not proven",
    globalD1Drain:"BLOCKED",gracefulWindowsExit:"BLOCKED",userD1Touched:false};
} catch(e){
  console.error("SOURCE_WORKER_PRIVATE_GATE_ERROR",
    String(e).replaceAll(secret,"[REDACTED]").replaceAll(controlSecret,"[REDACTED]"),
    log.replaceAll(secret,"[REDACTED]").replaceAll(controlSecret,"[REDACTED]").slice(-900));throw e;
}finally{
  if(proxy)await new Promise(ok=>proxy.close(ok));
  if(child&&child.exitCode===null&&child.signalCode===null){
    const exited=new Promise(ok=>child.once("exit",ok));
    child.kill("SIGTERM"); // Disposable QA-only teardown; NOT graceful ACK.
    await Promise.race([exited,sleep(12000)]);
  }
  const qaProcessExited=!child||child.exitCode!==null||child.signalCode!==null;
  let descendantsExited=process.platform!=="win32";
  let processSnapshotsChecked=0;
  if(process.platform==="win32"){
    try{
      // Two independent read-only WMI snapshots; never signal a captured child.
      if(descendantsBeforeStop===null && child
          && child.exitCode===null && child.signalCode===null){
        descendantsBeforeStop=descendantsOf(await windowsProcesses(),child.pid);
      }
      const one=await windowsProcesses();processSnapshotsChecked++;
      await sleep(150);
      const two=await windowsProcesses();processSnapshotsChecked++;
      const live=new Set([...one,...two].map(item=>item.pid));
      descendantsExited=Boolean(!child||descendantsBeforeStop!==null)
        && [...(descendantsBeforeStop??[])].every(pid=>!live.has(pid));
    }catch{descendantsExited=false;}
  }
  const portsReleased=await portReleased(backend)&&await portReleased(frontWanted);
  qaCleanupVerified=qaProcessExited&&descendantsExited&&portsReleased;
  if(qaCleanupVerified){
    await rm(storage,{recursive:true,force:true,maxRetries:6,retryDelay:350});
    if(verifiedProductReceipt) {
      console.log(JSON.stringify({
        ...verifiedProductReceipt,
        qaPortsReleased:true,
        capturedDescendantsExited:descendantsExited,
        descendantProcessTreeScope:"captured PID descendants only; not global isolate census",
        processSnapshotsChecked,
      }));
    }
  }else{
    // Preserve disposable D1 on any uncertain Windows child / port / exit receipt.
    console.error("QA_STORAGE_PRESERVED_SHUTDOWN_UNVERIFIED",JSON.stringify({
      storage,qaProcessExited,descendantsExited,portsReleased,processSnapshotsChecked,
      globalD1Drain:"BLOCKED",nativeCliGracefulAck:false,
    }));
    process.exitCode=1;
  }
}
