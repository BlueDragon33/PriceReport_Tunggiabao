const DB_NAME = 'price-report-device-identity-v1';
const STORE_NAME = 'identity';
const IDENTITY_KEY = 'primary';
const SESSION_KEY = 'price-report-device-session-v1';
const CONFIG_URL = './device-control.json';
const encoder = new TextEncoder();

class DeviceApiError extends Error {
  constructor(message, status = 500, code = 'PRICE_REPORT_DEVICE_API_ERROR', payload = {}) {
    super(message);
    this.name = 'DeviceApiError';
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

function base64Url(bytes) {
  let binary = '';
  const view = new Uint8Array(bytes);
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function detectDeviceType() {
  const width = Math.max(window.innerWidth || 0, document.documentElement.clientWidth || 0);
  const ua = navigator.userAgent || '';
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua) || (navigator.maxTouchPoints > 1 && width >= 600 && width < 1200)) return 'tablet';
  if (/Mobi|Android|iPhone|iPod/i.test(ua) || width < 600) return 'phone';
  return 'desktop';
}

function detectPlatform() {
  return String(navigator.userAgentData?.platform || navigator.platform || 'unknown').slice(0, 120);
}

function detectBrowser() {
  const ua = navigator.userAgent || '';
  if (/Edg\//.test(ua)) return 'Microsoft Edge';
  if (/OPR\//.test(ua)) return 'Opera';
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
  return 'unknown';
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Không mở được kho khóa thiết bị.'));
  });
}

async function readIdentity() {
  const database = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(IDENTITY_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('Không đọc được khóa thiết bị.'));
    });
  } finally {
    database.close();
  }
}

async function writeIdentity(identity) {
  const database = await openDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(identity, IDENTITY_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Không lưu được khóa thiết bị.'));
      tx.onabort = () => reject(tx.error || new Error('Kho khóa thiết bị đã hủy giao dịch.'));
    });
  } finally {
    database.close();
  }
}

async function createIdentity() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
  if (!pair.privateKey || pair.privateKey.extractable) throw new Error('Không tạo được private key P-256 non-extractable.');
  const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const identity = {
    version: 1,
    privateKey: pair.privateKey,
    publicJwk,
    deviceId: '',
    deviceCode: '',
    lastKnownStatus: 'pending',
    createdAt: Date.now(),
  };
  await writeIdentity(identity);
  return identity;
}

async function readConfig() {
  const response = await fetch(CONFIG_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error('Không đọc được cấu hình Device Gate.');
  const config = await response.json();
  const requestedMode = config?.mode === 'managed'
    ? 'managed'
    : (config?.mode === 'standalone' ? 'standalone' : (config?.enabled === true ? 'managed' : 'standalone'));
  return {
    mode: requestedMode,
    enabled: requestedMode === 'managed',
    baseUrl: typeof config?.baseUrl === 'string' ? config.baseUrl.replace(/\/+$/, '') : '',
    requestTimeoutMs: Number(config?.requestTimeoutMs || 5000),
    pendingPollMs: Number(config?.pendingPollMs || 15000),
    heartbeatMs: Number(config?.heartbeatMs || 60000),
  };
}

async function api(config, path, options = {}) {
  if (!config.baseUrl) throw new DeviceApiError('Chưa cấu hình KT Control Service.', 503, 'KT_CONTROL_ORIGIN_NOT_CONFIGURED');
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), config.requestTimeoutMs);
  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      method: options.method || 'GET',
      headers: {
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new DeviceApiError(payload.error || `KT Control trả HTTP ${response.status}.`, response.status, payload.code, payload);
    return payload;
  } finally {
    window.clearTimeout(timeout);
  }
}

function session() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.token === 'string' && parsed.token.startsWith('kt1.') ? parsed : null;
  } catch {
    return null;
  }
}

function saveSession(value) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function gateElement() {
  let gate = document.getElementById('priceReportDeviceGate');
  if (gate) return gate;
  gate = document.createElement('section');
  gate.id = 'priceReportDeviceGate';
  gate.className = 'price-report-device-gate hidden';
  gate.setAttribute('role', 'dialog');
  gate.setAttribute('aria-modal', 'true');
  gate.innerHTML = [
    '<div class="price-report-device-card">',
    '<div class="price-report-device-mark">KT</div>',
    '<span class="price-report-device-kicker">PRICE REPORT · DEVICE ACCESS</span>',
    '<h1 id="priceReportDeviceTitle">Đang xác minh thiết bị…</h1>',
    '<p id="priceReportDeviceMessage">Thiết bị phải được Application Management duyệt trước khi sử dụng PriceReport.</p>',
    '<div class="price-report-device-code hidden" id="priceReportDeviceCodeWrap"><span>Mã thiết bị</span><strong id="priceReportDeviceCode">—</strong><button type="button" id="priceReportDeviceCopy">Sao chép</button></div>',
    '<div class="price-report-device-status"><i></i><span id="priceReportDeviceStatus">Đang kiểm tra…</span></div>',
    '<button type="button" class="price-report-device-retry" id="priceReportDeviceRetry">Kiểm tra lại</button>',
    '<small>Private key P-256 chỉ nằm trên thiết bị này. Trung tâm chỉ duyệt/khóa registry KT- qua Control API của PriceReport.</small>',
    '</div>',
  ].join('');
  document.body.appendChild(gate);
  gate.querySelector('#priceReportDeviceCopy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(gate.querySelector('#priceReportDeviceCode').textContent || ''); } catch {}
  });
  return gate;
}

function publishState(state, identity, message = '') {
  document.documentElement.dataset.priceReportDeviceAccess = state;
  window.dispatchEvent(new CustomEvent('pricereport:device-access', { detail: { state, identity, message } }));
  const chip = document.getElementById('deviceProfileChip');
  if (chip && identity?.deviceCode) {
    const strong = chip.querySelector('strong');
    const small = chip.querySelector('small');
    if (strong) strong.textContent = identity.lastKnownStatus === 'approved' ? 'Thiết bị đã duyệt' : identity.lastKnownStatus === 'blocked' ? 'Thiết bị đã khóa' : 'Thiết bị chờ duyệt';
    if (small) small.textContent = `${identity.deviceCode} · ${detectDeviceType()}`;
  }
}

function render(state, title, message, statusText, identity) {
  const gate = gateElement();
  gate.classList.remove('hidden');
  gate.dataset.state = state;
  gate.querySelector('#priceReportDeviceTitle').textContent = title;
  gate.querySelector('#priceReportDeviceMessage').textContent = message;
  gate.querySelector('#priceReportDeviceStatus').textContent = statusText;
  const code = identity?.deviceCode || '';
  gate.querySelector('#priceReportDeviceCode').textContent = code || '—';
  gate.querySelector('#priceReportDeviceCodeWrap').classList.toggle('hidden', !code);
  publishState(state, identity, message);
}

function allow(identity, message) {
  gateElement().classList.add('hidden');
  publishState('authorized', identity, message);
}

async function ensureRegistered(config, identity) {
  if (identity.deviceId && identity.deviceCode) return identity;
  const response = await api(config, '/api/device/register', {
    method: 'POST',
    body: {
      publicJwk: identity.publicJwk,
      deviceType: detectDeviceType(),
      platform: detectPlatform(),
      browser: detectBrowser(),
      displayName: `${detectPlatform()} · ${detectDeviceType()}`,
      label: document.title || 'PriceReport Tùng Gia Bảo',
    },
  });
  const device = response.device || {};
  if (!/^[a-f0-9]{64}$/.test(device.deviceId || '') || !/^KT-[A-Z0-9-]+$/.test(device.deviceCode || '')) {
    throw new DeviceApiError('KT Control chưa trả registry hợp lệ.', 502, 'INVALID_DEVICE_REGISTRATION_RESPONSE');
  }
  const next = { ...identity, deviceId: device.deviceId, deviceCode: device.deviceCode, lastKnownStatus: device.status || 'pending' };
  await writeIdentity(next);
  return next;
}

async function refreshStatus(config, identity) {
  const response = await api(config, `/api/device/status?deviceId=${encodeURIComponent(identity.deviceId)}`);
  const device = response.device || {};
  const next = { ...identity, deviceCode: device.deviceCode || identity.deviceCode, lastKnownStatus: device.status || identity.lastKnownStatus };
  await writeIdentity(next);
  return { identity: next, device };
}

async function prove(config, identity) {
  const challenge = await api(config, '/api/device/challenge', { method: 'POST', body: { deviceId: identity.deviceId } });
  if (!challenge.challengeId || !challenge.signingInput) throw new DeviceApiError('Challenge KT không hợp lệ.', 502, 'INVALID_CHALLENGE_RESPONSE');
  const signed = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, identity.privateKey, encoder.encode(challenge.signingInput));
  const verified = await api(config, '/api/device/verify', {
    method: 'POST',
    body: { deviceId: identity.deviceId, challengeId: challenge.challengeId, signature: base64Url(signed) },
  });
  if (!verified.sessionToken || !String(verified.sessionToken).startsWith('kt1.')) throw new DeviceApiError('KT Control chưa cấp session hợp lệ.', 502, 'INVALID_SESSION_RESPONSE');
  saveSession({ token: verified.sessionToken, expiresAt: Number(verified.expiresAt || 0) });
  const next = { ...identity, lastKnownStatus: 'approved', lastVerifiedAt: Date.now() };
  await writeIdentity(next);
  return next;
}

async function heartbeat(config, identity, token) {
  const response = await api(config, '/api/device/heartbeat', { method: 'POST', token });
  const device = response.device || {};
  const next = { ...identity, lastKnownStatus: device.status || 'approved', lastVerifiedAt: Date.now() };
  await writeIdentity(next);
  return next;
}

export async function startPriceReportDeviceAccess() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  let config;
  try {
    config = await readConfig();
  } catch (error) {
    publishState('classification-only', null, error instanceof Error ? error.message : 'Device Gate chưa cấu hình.');
    return null;
  }

  if (!config.enabled) {
    publishState('standalone', null, 'Chế độ độc lập local-first đang bật; không cần duyệt thiết bị qua Application Management.');
    return { enabled: false, mode: 'standalone' };
  }

  if (!crypto?.subtle || !window.indexedDB) {
    render('blocked', 'Trình duyệt chưa hỗ trợ Device Gate', 'Cần WebCrypto và IndexedDB để giữ khóa thiết bị an toàn.', 'Không thể xác minh thiết bị', null);
    return { enabled: true };
  }

  let pollingTimer = null;
  let heartbeatTimer = null;
  let running = false;

  const clearTimers = () => {
    if (pollingTimer) window.clearTimeout(pollingTimer);
    if (heartbeatTimer) window.clearTimeout(heartbeatTimer);
    pollingTimer = null;
    heartbeatTimer = null;
  };

  const schedulePending = () => {
    pollingTimer = window.setTimeout(() => void reconcile(false), config.pendingPollMs);
  };
  const scheduleHeartbeat = () => {
    heartbeatTimer = window.setTimeout(() => void backgroundHeartbeat(), config.heartbeatMs);
  };

  async function backgroundHeartbeat() {
    let identity = await readIdentity().catch(() => null);
    const current = session();
    if (!identity || !current?.token) return void reconcile(false);
    try {
      identity = await heartbeat(config, identity, current.token);
      allow(identity, 'Phiên thiết bị còn hiệu lực.');
      scheduleHeartbeat();
    } catch {
      clearSession();
      void reconcile(false);
    }
  }

  async function reconcile(forceVisible = false) {
    if (running) return;
    running = true;
    clearTimers();
    let identity = null;
    try {
      if (forceVisible) render('checking', 'Đang xác minh thiết bị…', 'Đang kiểm tra registry KT- và chữ ký P-256.', 'Đang kết nối KT Control…', identity);
      identity = await readIdentity();
      if (!identity || identity.version !== 1 || !identity.privateKey || !identity.publicJwk) identity = await createIdentity();
      identity = await ensureRegistered(config, identity);
      const status = await refreshStatus(config, identity);
      identity = status.identity;

      if (status.device.status === 'blocked') {
        clearSession();
        render('blocked', 'Thiết bị đã bị khóa', 'Application Management đã thu hồi quyền của thiết bị này.', 'Không có quyền truy cập', identity);
        return;
      }
      if (status.device.status !== 'approved') {
        clearSession();
        render('pending', 'Thiết bị đang chờ duyệt', 'Mở Application Management → Kế toán → Báo giá Tùng Gia Bảo → Thiết bị & quyền, sau đó duyệt đúng mã KT- bên dưới.', 'Đang chờ Chủ hệ thống duyệt', identity);
        schedulePending();
        return;
      }

      const current = session();
      if (current?.token) {
        try {
          identity = await heartbeat(config, identity, current.token);
          allow(identity, 'Phiên thiết bị còn hiệu lực.');
          scheduleHeartbeat();
          return;
        } catch (error) {
          if (!(error instanceof DeviceApiError) || ![401,403].includes(error.status)) throw error;
          clearSession();
        }
      }

      identity = await prove(config, identity);
      allow(identity, 'Thiết bị đã chứng minh khóa P-256 và được cấp session.');
      scheduleHeartbeat();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể xác minh thiết bị.';
      if (error instanceof DeviceApiError && error.code === 'DEVICE_PENDING') {
        render('pending', 'Thiết bị đang chờ duyệt', message, 'Đang chờ duyệt', identity);
        schedulePending();
      } else if (error instanceof DeviceApiError && error.code === 'DEVICE_BLOCKED') {
        clearSession();
        render('blocked', 'Thiết bị đã bị khóa', message, 'Không có quyền truy cập', identity);
      } else {
        render('offline', 'Không kết nối được KT Control', message, 'Fail-closed · chưa xác minh', identity);
      }
    } finally {
      running = false;
    }
  }

  const gate = gateElement();
  gate.querySelector('#priceReportDeviceRetry').addEventListener('click', () => void reconcile(true));
  void reconcile(true);

  return {
    enabled: true,
    mode: 'managed',
    refresh: () => reconcile(true),
    stop() { clearTimers(); },
  };
}
