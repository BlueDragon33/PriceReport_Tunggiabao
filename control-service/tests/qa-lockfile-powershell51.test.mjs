import assert from "node:assert/strict";
import test from "node:test";
import {mkdtempSync,writeFileSync,rmSync,readFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {execFileSync} from "node:child_process";
import {readQaLockMetadata} from "../scripts/read-qa-lock-metadata.mjs";

const script=readFileSync(new URL("../scripts/prepare-isolated-windows-qa.ps1",import.meta.url),"utf8");
const metadataScript=fileURLToPath(new URL("../scripts/read-qa-lock-metadata.mjs",import.meta.url));
function fixture(fn,{omitEmptyKey=false,omitNative=false}={}){
  const root=mkdtempSync(join(tmpdir(),"price-lock-json-test-"));
  try{
    const pkgs={
      ...(!omitEmptyKey?{"":{name:"price-report-control-service"}}:{}),
      "node_modules/wrangler":{version:"4.151.1"},
      "node_modules/workerd":{version:"1.20261012.1"},
      ...(!omitNative?{"node_modules/@cloudflare/workerd-windows-64":{version:"1.20261012.1"}}:{}),
    };
    writeFileSync(join(root,"package-lock.json"),JSON.stringify({
      name:"price-report-control-service",lockfileVersion:3,packages:pkgs,
    }));
    writeFileSync(join(root,"wrangler.local.jsonc"),JSON.stringify({compatibility_date:"2026-09-22"}));
    fn(root);
  } finally {
    rmSync(root,{recursive:true,force:true});
  }
}
test("Node parses npm lockfile with valid empty-string packages root key",()=>{
  fixture(root=>{
    assert.deepEqual(readQaLockMetadata(root),[
      "4.151.1","1.20261012.1","1.20261012.1","2026-09-22",
    ]);
    const output=execFileSync(process.execPath,[metadataScript,root],{encoding:"utf8"});
    assert.deepEqual(output.trim().split(/\r?\n/),[
      "4.151.1","1.20261012.1","1.20261012.1","2026-09-22",
    ]);
  });
});
test("missing valid npm root key or native workerd package rejects unsafe lockfile",()=>{
  fixture(root=>assert.throws(()=>readQaLockMetadata(root),/BLOCKED_UNEXPECTED_NPM_LOCKFILE_FORMAT/),{omitEmptyKey:true});
  fixture(root=>assert.throws(()=>readQaLockMetadata(root),/BLOCKED_MISSING_LOCKFILE_PACKAGE/),{omitNative:true});
});
test("actual repository lockfile has expected pinned versions and date",()=>{
  const root=fileURLToPath(new URL("../",import.meta.url));
  assert.deepEqual(readQaLockMetadata(root),[
    "4.151.1","1.20261012.1","1.20261012.1","2026-09-22",
  ]);
});
test("PowerShell preflight reads plain Node output, not ConvertFrom-Json",()=>{
  assert.doesNotMatch(script,/\bConvertFrom-Json\b/);
  assert.match(script,/read-qa-lock-metadata\.mjs/);
  assert.match(script,/\$metadata = @\(& node \$metadataScript \$control\)/);
  assert.match(script,/\$LASTEXITCODE -ne 0 -or \$metadata\.Count -ne 4/);
  assert.match(script,/BLOCKED_QA_LOCKFILE_METADATA_READ/);
  assert.match(script,/\$lockedCompatibilityDate -ne '2026-09-22'/);
  assert.ok(script.indexOf("BLOCKED_QA_LOCKFILE_METADATA_READ") < script.indexOf("& npm.cmd @npmArgs"));
});
