import assert from 'node:assert/strict';
import {
  materializeProductionConfig,
  normalizeControlOrigin,
  verifyControlHealth,
} from './production-config.mjs';

const baseDevice = {
  schemaVersion: 2,
  mode: 'standalone',
  enabled: false,
  baseUrl: '',
  requestTimeoutMs: 5000,
  pendingPollMs: 15000,
  heartbeatMs: 60000,
};

const baseContract = {
  readiness: {
    runtime: 'available',
    deviceClassification: 'available',
    adaptiveUi: 'available',
    localDeviceRecord: 'available',
    deviceRegistry: 'implemented-requires-d1-deployment',
    deviceGateway: 'implemented-requires-d1-and-app-origin',
    adminApi: 'implemented-requires-control-secret-and-origin',
    remoteAuditApi: 'implemented-requires-d1-deployment',
    p256DeviceIdentity: 'implemented',
    revocableSessions: 'implemented',
    deviceAccessGate: 'implemented-rollout-off-until-live-readback',
  },
  policy: {
    remoteAdminReady: false,
  },
  controlService: {
    protocol: 'price-report-control-v1',
  },
};

const sw = "const CACHE = 'pricereport-shell-v26';\nconst CORE = [];\n";

assert.equal(normalizeControlOrigin(''), '');
assert.equal(normalizeControlOrigin('https://control.example.com/'), 'https://control.example.com');
for (const invalid of [
  'http://control.example.com',
  'https://user:pass@control.example.com',
  'https://control.example.com/path',
  'https://control.example.com/?x=1',
]) {
  assert.throws(() => normalizeControlOrigin(invalid));
}

const local = materializeProductionConfig({
  origin: '',
  deviceConfig: baseDevice,
  managementContract: baseContract,
  serviceWorkerSource: sw,
});
assert.equal(local.enabled, false);
assert.equal(local.deviceConfig.mode, 'standalone');
assert.equal(local.deviceConfig.enabled, false);
assert.equal(local.managementContract.access.defaultMode, 'standalone');
assert.equal(local.managementContract.policy.defaultAccessMode, 'standalone');
assert.equal(local.managementContract.policy.managementApprovalRequiredByDefault, false);
assert.equal(local.managementContract.policy.remoteAdminReady, false);
assert.equal(local.managementContract.controlService.rollout, 'standalone');
assert.equal(local.managementContract.readiness.deviceRegistry, 'implemented-requires-d1-deployment');
assert.match(local.cacheName, /^pricereport-shell-v26-local-[a-f0-9]{8}$/);

const live = materializeProductionConfig({
  origin: 'https://control.example.com/',
  deviceConfig: baseDevice,
  managementContract: baseContract,
  serviceWorkerSource: sw,
});
assert.equal(live.enabled, true);
assert.equal(live.baseUrl, 'https://control.example.com');
assert.equal(live.deviceConfig.mode, 'managed');
assert.equal(live.deviceConfig.baseUrl, 'https://control.example.com');
assert.equal(live.managementContract.access.defaultMode, 'managed');
assert.equal(live.managementContract.policy.defaultAccessMode, 'managed');
assert.equal(live.managementContract.policy.managementApprovalRequiredByDefault, true);
assert.equal(live.managementContract.policy.remoteAdminReady, true);
assert.equal(live.managementContract.readiness.deviceRegistry, 'available');
assert.equal(live.managementContract.readiness.deviceGateway, 'available');
assert.equal(live.managementContract.readiness.adminApi, 'available');
assert.equal(live.managementContract.readiness.remoteAuditApi, 'available');
assert.equal(live.managementContract.readiness.deviceAccessGate, 'available');
assert.equal(live.managementContract.controlService.origin, 'https://control.example.com');
assert.equal(live.managementContract.controlService.rollout, 'managed');
assert.match(live.serviceWorkerSource, /pricereport-shell-v26-managed-[a-f0-9]{8}/);

// A UI release must retain its own cache generation through the Pages config step.
const nextRelease = materializeProductionConfig({
  origin: 'https://control.example.com',
  serviceWorkerSource: "const CACHE = 'pricereport-shell-v50-ui-rc1';\n",
});
assert.match(nextRelease.cacheName, /^pricereport-shell-v50-ui-rc1-managed-[a-f0-9]{8}$/);
assert.notEqual(nextRelease.cacheName, live.cacheName);
const repeated = materializeProductionConfig({
  origin: 'https://control.example.com',
  serviceWorkerSource: nextRelease.serviceWorkerSource,
});
assert.equal(repeated.cacheName, nextRelease.cacheName);
assert.equal(repeated.serviceWorkerSource, nextRelease.serviceWorkerSource);
const changedOrigin = materializeProductionConfig({
  origin: 'https://other-control.example.com',
  serviceWorkerSource: nextRelease.serviceWorkerSource,
});
assert.notEqual(changedOrigin.cacheName, nextRelease.cacheName);
assert.throws(() => materializeProductionConfig({ serviceWorkerSource: 'const CORE = [];' }), /cache marker/i);

const healthy = await verifyControlHealth('https://control.example.com', async () => Response.json({
  application: 'price-report-tunggiabao',
  protocol: 'price-report-control-v1',
  databaseReady: true,
  appOriginConfigured: true,
  applicationManagementOriginConfigured: true,
  controlSecretConfigured: true,
}));
assert.equal(healthy.databaseReady, true);

await assert.rejects(
  () => verifyControlHealth('https://control.example.com', async () => Response.json({
    application: 'price-report-tunggiabao',
    protocol: 'price-report-control-v1',
    databaseReady: false,
    appOriginConfigured: true,
    controlSecretConfigured: true,
  })),
  /D1 is not ready/,
);

console.log('PRODUCTION CONFIG LOGIC PASS');
