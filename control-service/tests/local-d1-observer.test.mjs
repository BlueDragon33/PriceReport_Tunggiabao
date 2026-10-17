import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function moduleUnderTest() {
  const source = await readFile(new URL("../src/local-d1-observer.ts", import.meta.url), "utf8");
  const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  return import("data:text/javascript;base64," + Buffer.from(result.outputText).toString("base64"));
}
const { createLocalD1Observer } = await moduleUnderTest();
const controlled = () => {
  let release;
  const slow = new Promise(resolve => { release = resolve; });
  const db = {
    prepare(sql) {
      const statement = {
        bind(...params) { return { ...statement, params }; },
        async run() { await slow; return { success:true, meta:{ changes:1 } }; },
        async first() { return { ok:1 }; },
        async all() { return { results:[{ ok:1 }] }; },
        async raw() { return [[1]]; },
      };
      return statement;
    },
    async batch(statements) {
      assert.ok(statements.length);
      // Ensure wrapped statements are unwrapped before D1's native batch.
      assert.equal(typeof statements[0].run,"function");
      return [{ success:true }];
    },
    async exec() { await slow; return { count:1 }; },
  };
  return { db, release };
};

test("actual fetch wrapper tracks asynchronous D1 .prepare().bind().run, refuses fake durable claims", async () => {
  const observer=createLocalD1Observer("BAUMAN-CONTROL");
  const fixture=controlled();
  let executing;
  const inFlight=observer.trackFetch({DB:fixture.db}, async env => {
    executing=env.DB.prepare("INSERT INTO device(id) VALUES(?)").bind("one").run();
    const read=await env.DB.prepare("SELECT 1").first();
    assert.equal(read.ok,1);
    await executing;
    return new Response("written");
  });
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(observer.snapshot().activeRequests,1);
  assert.equal(observer.snapshot().activeD1Calls,1);
  fixture.release();
  assert.equal((await inFlight).status,200);
  assert.equal(observer.snapshot().activeRequests,0);
  assert.equal(observer.snapshot().activeD1Calls,0);
  assert.equal(observer.snapshot().completedD1Calls>=2,true);
  assert.equal(observer.snapshot().durableReadbackVerified,false);
  assert.equal(observer.snapshot().allIsolatesObserved,false);
  const denied=observer.blockedPreflight();
  assert.equal(denied.status,503);
  assert.equal((await denied.json()).autoRestartAllowed,false);
});
test("batch and exec are instrumented; failed writes clear in-flight count without claiming commit",async()=>{
  const observer=createLocalD1Observer("PRICE-CONTROL");
  const db={
    prepare(){const stmt={bind(){return stmt;},async run(){throw Error("D1 rejected");}};return stmt;},
    async batch(rows){return rows;},
    async exec(){throw Error("D1 write rejected");}
  };
  await observer.trackFetch({DB:db},async env=>{
    await assert.rejects(env.DB.prepare("UPDATE t SET a=1").run(),/D1 rejected/);
    assert.equal(observer.snapshot().activeD1Calls,0);
    await assert.rejects(env.DB.exec("INSERT INTO t VALUES(2)"),/D1 write rejected/);
    const stmt=env.DB.prepare("SELECT 1").bind();
    await env.DB.batch([stmt]);
    assert.equal(observer.snapshot().failedD1Calls,2);
    return new Response(null,{status:204});
  });
  assert.equal(observer.snapshot().activeRequests,0);
  assert.equal(observer.snapshot().gracefulShutdownReady,false);
});
test("source worker handlers connect observer to actual fetch path; global drain stays explicitly disabled",async()=>{
  const read=path=>readFile(new URL(path,import.meta.url),"utf8");
  const index=await read("../src/index.ts");
  const automation=await read("../src/automation-contract.ts").catch(()=>null);
  const handler=automation ?? index;
  assert.match(handler,/localD1Observer\.trackFetch\(incomingEnv/);
  assert.match(handler,/localD1Observer\.blockedPreflight\(\)/);
  assert.match(handler,/_local\/ops\/drain-preflight/);
});
