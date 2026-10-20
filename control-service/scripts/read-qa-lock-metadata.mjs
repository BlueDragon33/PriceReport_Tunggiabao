// Windows PowerShell 5.1 ConvertFrom-Json rejects npm lockfile's valid empty "" key.
// Read the lockfile with Node instead; print four plain newline-separated fields.
import {readFileSync} from "node:fs";
import {join,resolve} from "node:path";
import {pathToFileURL} from "node:url";

export function readQaLockMetadata(root) {
  const lock=JSON.parse(readFileSync(join(root,"package-lock.json"),"utf8"));
  const config=JSON.parse(readFileSync(join(root,"wrangler.local.jsonc"),"utf8"));
  if(lock.lockfileVersion!==3 || !Object.prototype.hasOwnProperty.call(lock.packages??{},"")) {
    throw Error("BLOCKED_UNEXPECTED_NPM_LOCKFILE_FORMAT");
  }
  const names=[
    "node_modules/wrangler",
    "node_modules/workerd",
    "node_modules/@cloudflare/workerd-windows-64",
  ];
  const versions=names.map(name=>lock.packages[name]?.version);
  if(versions.some(v=>typeof v!=="string"||v.length===0) ||
    typeof config.compatibility_date!=="string"){
    throw Error("BLOCKED_MISSING_LOCKFILE_PACKAGE_OR_COMPATIBILITY_DATE");
  }
  return [...versions,config.compatibility_date];
}

if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const root=process.argv[2];
    if(!root) throw Error("BLOCKED_MISSING_QA_CONTROL_ROOT");
    for(const item of readQaLockMetadata(resolve(root))) console.log(item);
  }catch(error) {
    console.error(error instanceof Error?error.message:"BLOCKED_READ_QA_METADATA");
    process.exitCode=2;
  }
}
