import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const CONTROL_PROTOCOL = 'price-report-control-v1';
const APPLICATION_ID = 'price-report-tunggiabao';
const CACHE_VERSION = 'v27';

export function normalizeControlOrigin(value = '') {
  const raw = String(value ?? '').trim().replace(/\/+$/, '');
  if (!raw) return '';
  const url = new URL(raw);
  if (
    url.protocol !== 'https:'
    || url.username
    || url.password
    || url.pathname !== '/'
    || url.search
    || url.hash
  ) {
    throw new Error('PRICE_REPORT_CONTROL_ORIGIN must be a clean HTTPS origin');
  }
  return url.origin;
}

function rolloutReadiness(enabled, current = {}) {
  if (!enabled) return { ...current };
  return {
    ...current,
    deviceRegistry: 'available',
    deviceGateway: 'available',
    adminApi: 'available',
    remoteAuditApi: 'available',
    p256DeviceIdentity: 'available',
    revocableSessions: 'available',
    deviceAccessGate: 'available',
  };
}

export function materializeProductionConfig({
  origin = '',
  deviceConfig = {},
  managementContract = {},
  serviceWorkerSource = '',
} = {}) {
  const baseUrl = normalizeControlOrigin(origin);
  const enabled = Boolean(baseUrl);
  const fingerprint = createHash('sha256')
    .update(baseUrl || 'classification-only')
    .digest('hex')
    .slice(0, 8);

  const nextDeviceConfig = {
    ...deviceConfig,
    schemaVersion: 1,
    enabled,
    baseUrl,
    requestTimeoutMs: Number(deviceConfig.requestTimeoutMs || 5000),
    pendingPollMs: Number(deviceConfig.pendingPollMs || 15000),
    heartbeatMs: Number(deviceConfig.heartbeatMs || 60000),
    note: enabled
      ? 'Production KT Control origin verified and injected by GitHub Pages workflow.'
      : 'Device Gate remains classification-only until PRICE_REPORT_CONTROL_ORIGIN is configured.',
  };

  const nextManagementContract = {
    ...managementContract,
    readiness: rolloutReadiness(enabled, managementContract.readiness),
    policy: {
      ...(managementContract.policy || {}),
      remoteAdminReady: enabled,
    },
    controlService: {
      ...(managementContract.controlService || {}),
      ...(enabled ? { origin: baseUrl } : {}),
      rollout: enabled ? 'enabled' : 'classification-only',
    },
  };

  const cacheName = `pricereport-shell-${CACHE_VERSION}-${enabled ? 'managed' : 'local'}-${fingerprint}`;
  const nextServiceWorker = String(serviceWorkerSource).replace(
    /const CACHE = 'pricereport-shell-[^']+';/,
    `const CACHE = '${cacheName}';`,
  );
  if (!nextServiceWorker || nextServiceWorker === serviceWorkerSource) {
    throw new Error('Service-worker cache marker is missing or was not updated.');
  }

  return {
    enabled,
    baseUrl,
    deviceConfig: nextDeviceConfig,
    managementContract: nextManagementContract,
    serviceWorkerSource: nextServiceWorker,
    cacheName,
  };
}

export async function verifyControlHealth(baseUrl, fetchImpl = fetch) {
  if (!baseUrl) return { skipped: true };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetchImpl(`${baseUrl}/health`, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`KT Control health returned HTTP ${response.status}`);
    if (payload.application !== APPLICATION_ID) throw new Error('KT Control health application mismatch');
    if (payload.protocol !== CONTROL_PROTOCOL) throw new Error('KT Control health protocol mismatch');
    if (payload.databaseReady !== true) throw new Error('KT Control D1 is not ready');
    if (payload.appOriginConfigured !== true) throw new Error('KT Control app origin is not configured');
    if (payload.controlSecretConfigured !== true) throw new Error('KT Control secret is not configured');
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

export async function materializeProductionFiles({
  root = '.',
  origin = process.env.PRICE_REPORT_CONTROL_ORIGIN || '',
  fetchImpl = fetch,
} = {}) {
  const devicePath = `${root}/public/device-control.json`;
  const contractPath = `${root}/public/management-contract.json`;
  const serviceWorkerPath = `${root}/public/sw.js`;

  const deviceConfig = JSON.parse(fs.readFileSync(devicePath, 'utf8'));
  const managementContract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  const serviceWorkerSource = fs.readFileSync(serviceWorkerPath, 'utf8');
  const baseUrl = normalizeControlOrigin(origin);

  if (baseUrl) await verifyControlHealth(baseUrl, fetchImpl);

  const output = materializeProductionConfig({
    origin: baseUrl,
    deviceConfig,
    managementContract,
    serviceWorkerSource,
  });

  fs.writeFileSync(devicePath, JSON.stringify(output.deviceConfig, null, 2) + '\n');
  fs.writeFileSync(contractPath, JSON.stringify(output.managementContract, null, 2) + '\n');
  fs.writeFileSync(serviceWorkerPath, output.serviceWorkerSource);

  console.log(`PriceReport Device Gate: ${output.enabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`PriceReport management contract: ${output.enabled ? 'REMOTE ADMIN READY' : 'CLASSIFICATION ONLY'}`);
  console.log(`PriceReport PWA cache: ${output.cacheName}`);
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await materializeProductionFiles();
}
