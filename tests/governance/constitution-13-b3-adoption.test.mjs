import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const data=p=>JSON.parse(readFileSync(p,"utf8"));
const a=data(".blueprint/constitution-adoption.json"),b=data(".blueprint/dependency-budget.json");
const c=data("docs/BLUEPRINT-13-MIGRATION-SOURCE-AUDIT.json");
const seven=["structural-capacity","architectural-longevity","product-elegance","premium-usability","long-term-durability","fortress-security-disaster-resilience","operational-sovereignty-dependency-minimization"];
test("B3 governance inheritance is real, retains existing protected obligations",()=>{
 assert.equal(a.policyId,"blueprint-os:universal-century-grade");
 assert.equal(a.policyVersion,"1.3.0");
 assert.equal(a.projectId,"project:pricereport-tunggiabao");
 assert.equal(a.blueprintLevel,"B3");
 assert.equal(a.enforcementMode,"enforced");
 assert.deepEqual(a.inheritedPillars,seven);
 assert.deepEqual(a.disabledPillars,[]);
 assert.deepEqual(a.constitutionalWaivers,[]);
 assert.equal(a.productionAuthority,"separate-explicit-release-gate");
 assert.equal(a.evidenceAuthority,"canonical-quality-gates");
});
test("sovereignty and migration blockers remain present; no cloud truth/control takeover",()=>{
 assert.equal(b.policyVersion,a.policyVersion);
 assert.equal(b.projectId,a.projectId);
 assert.equal(b.posture,"LOCAL_BUSINESS_CORE_WITH_OPTIONAL_SYNC");
 assert.equal(b.complianceState,"MIGRATION_REQUIRED");
 assert.ok(b.migrationBlockers.length>=3);
 assert.equal(b.productionAuthority,"separate-explicit-release-gate");
 assert.equal(b.dependencies.find(z=>z.id==="local-app-runtime")?.class,"LOCAL_CORE");
 for(const id of ["google-sheets-as-undocumented-transactional-authority","silent-last-write-wins-overwrite-without-version-conflict-policy","cloud-only-business-state-without-portable-export"])assert.ok(b.forbidden.includes(id),"missing control boundary "+id);
 for(const z of b.dependencies){
  assert.ok(z.offlineBehavior&&z.exitPath,"missing offline/exit contract: "+z.id);
 }
});
test("actual candidate evidence is structural and release gates remain unverified",()=>{
 assert.equal(c.status,"MIGRATION_REQUIRED_SOURCE_CANDIDATE");
 assert.equal(c.projectId,a.projectId);
 assert.equal(c.centralPolicy.version,a.policyVersion);
 assert.equal(c.centralPolicy.newRatification,false);
 assert.equal(c.truth.appOfflineRuntime,"UNVERIFIED");
 assert.equal(c.truth.userAcceptance,"UNVERIFIED");
 assert.equal(c.truth.independentReview,"PENDING");
 assert.equal(c.truth.productionAuthorized,false);
 assert.equal(c.truth.mergeIsNotPublish,true);
 assert.equal(c.truth.nativeRuntimeNotTouched,true);
 assert.equal(c.existingMigrationBlockersMustRemainAtLeast,3);
 assert(c.pendingProductEvidence.length>=3);
 for(const path of c.sourceScope)assert.ok(existsSync(path),"no source file "+path);
});
