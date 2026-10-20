// Read-only preflight. Never starts Wrangler/Worker, installs packages or touches D1.
import {execFile} from "node:child_process";
import {readFile} from "node:fs/promises";
import {join,resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {promisify} from "node:util";

const execute=promisify(execFile);
const nativeWin="node_modules/@cloudflare/workerd-windows-64";
const expectedKeys=["node_modules/wrangler","node_modules/workerd",nativeWin];
const releaseDate=/\b(20\d{2}-\d{2}-\d{2})\b/;

export function evaluateWorkerdCompatibility(input) {
  const {requiredDate,expectedWrangler,expectedWorkerd,
    installedWrangler,installedWorkerd,installedWindowsBinary,
    windowsNativePackageVersion,platform,architecture,binaryOutput,binaryError}=input;
  const issues=[];
  const runtimeDate=typeof binaryOutput==="string"
    ? binaryOutput.match(releaseDate)?.[1]??null:null;
  if(!/^20\d{2}-\d{2}-\d{2}$/.test(requiredDate??""))
    issues.push("INVALID_SOURCE_COMPATIBILITY_DATE");
  if(!expectedWrangler||!expectedWorkerd)issues.push("MISSING_LOCKED_VERSIONS");
  if(expectedWrangler!==installedWrangler)issues.push("WRANGLER_LOCK_MISMATCH");
  if(expectedWorkerd!==installedWorkerd)issues.push("WORKERD_LOCK_MISMATCH");
  if(platform==="win32"){
    if(architecture!=="x64") issues.push("UNVERIFIED_WINDOWS_ARCHITECTURE");
    if(windowsNativePackageVersion!==expectedWorkerd)
      issues.push("WORKERD_WINDOWS_BINARY_PACKAGE_MISMATCH");
    if(!installedWindowsBinary)issues.push("WORKERD_WINDOWS_EXE_MISSING");
    if(binaryError)issues.push("WORKERD_WINDOWS_EXE_VERSION_FAILED");
    if(installedWindowsBinary&&!binaryError&&!runtimeDate)
      issues.push("WORKERD_BINARY_VERSION_UNREADABLE");
  }
  if(runtimeDate&&requiredDate&&runtimeDate<requiredDate)
    issues.push("WORKERD_BINARY_TOO_OLD_FOR_SOURCE_DATE");
  return {
    protocol:"price-report-workerd-compat-preflight/v1",
    status:issues.length?"BLOCKED_DEPENDENCY_DRIFT":"PREFLIGHT_COMPATIBLE_NOT_RUNTIME_QA",
    issues,requiredCompatibilityDate:requiredDate,
    expectedWrangler,installedWrangler,
    expectedWorkerd,installedWorkerd,
    expectedWindowsNativePackage:platform==="win32"?expectedWorkerd:null,
    installedWindowsNativePackage:platform==="win32"?windowsNativePackageVersion:null,
    observedBinaryReleaseDate:runtimeDate,
    binaryVersionObservationFailed:Boolean(binaryError),
    readOnly:true,sourceConfigUnchanged:true,
    wranglerStarted:false,d1Touched:false,
    realWorkerQaPassed:false,
    nativeCliGracefulAck:false,
    globalD1Quiescence:"BLOCKED",
  };
}

async function jsonFile(filename){
  try{return JSON.parse(await readFile(filename,"utf8"));}
  catch{return null;}
}
export async function runWorkerdReadOnlyPreflight(root,{platform=process.platform,
    architecture=process.arch}={}){
  const config=await jsonFile(join(root,"wrangler.local.jsonc"));
  const lock=await jsonFile(join(root,"package-lock.json"));
  const versions=await Promise.all(expectedKeys.map(async key=>
    (await jsonFile(join(root,key,"package.json")))?.version??null));
  const expectedWrangler=lock?.packages?.["node_modules/wrangler"]?.version??null;
  const expectedWorkerd=lock?.packages?.["node_modules/workerd"]?.version??null;
  const exe=join(root,nativeWin,"bin","workerd.exe");
  let binaryOutput=null,binaryError=null,installedWindowsBinary=false;
  if(platform==="win32"){
    try{
      const {stdout,stderr}=await execute(exe,["--version"],{
        timeout:8000,windowsHide:true,maxBuffer:1024*128});
      installedWindowsBinary=true;
      binaryOutput=String(stdout)+"\n"+String(stderr);
    }catch(error){
      binaryError=error instanceof Error?error.message:"BINARY_VERSION_FAILED";
    }
  }
  return evaluateWorkerdCompatibility({
    requiredDate:config?.compatibility_date,
    expectedWrangler,expectedWorkerd,
    installedWrangler:versions[0],installedWorkerd:versions[1],
    windowsNativePackageVersion:versions[2],
    platform,architecture,installedWindowsBinary,binaryOutput,binaryError,
  });
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const root=process.cwd();
  const result=await runWorkerdReadOnlyPreflight(root);
  console.log(JSON.stringify(result,null,2));
  if(result.status!=="PREFLIGHT_COMPATIBLE_NOT_RUNTIME_QA")process.exitCode=2;
}
