import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
const source=await readFile(new URL("../src/local-ingress-guard.ts",import.meta.url),"utf8");
const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const {verifyManagedIngress}=await import("data:text/javascript;base64,"+Buffer.from(outputText).toString("base64"));
test("managed Wrangler source rejects direct backend and wrong proof, forwards only exact secret",async()=>{
  const env={LOCAL_OPS_GATEWAY_REQUIRED:"1",LOCAL_OPS_INGRESS_PROOF:"m".repeat(42)};
  const direct=await verifyManagedIngress(new Request("http://127.0.0.1:13003/health"),env);
  assert.equal(direct.status,403);
  assert.equal((await direct.json()).code,"DIRECT_WRANGLER_INGRESS_DENIED");
  const spoof=await verifyManagedIngress(new Request("http://127.0.0.1:13003/health",{headers:{"x-local-ops-ingress-proof":"n".repeat(42)}}),env);
  assert.equal(spoof.status,403);
  const good=await verifyManagedIngress(new Request("http://127.0.0.1:13003/health",{headers:{"x-local-ops-ingress-proof":"m".repeat(42)}}),env);
  assert.equal(good,null);
});
test("missing managed proof configuration blocks, unconfigured production preserves historical route",async()=>{
 const req=new Request("http://127.0.0.1:13003/health");
 const missing=await verifyManagedIngress(req,{LOCAL_OPS_GATEWAY_REQUIRED:"1"});
 assert.equal(missing.status,503);
 const normal=await verifyManagedIngress(req,{});
 assert.equal(normal,null);
});
