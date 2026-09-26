const DEVICE_STORAGE_KEY = 'tunggiabao-device-profile-v1';
const APP_ID = 'price-report-tunggiabao';
const DEVICE_NAMESPACE = 'KT-';
const MANAGEMENT_CONTRACT_URL = './management-contract.json';

export const DEVICE_PROFILES = {
  desktop: {
    id: 'desktop',
    label: 'Máy tính',
    viewport: '>= 1024 px',
    shell: 'workspace-wide',
    navigation: 'sidebar-full',
    density: 'high',
    interaction: 'mouse-keyboard',
    uiHint: 'Hiển thị đồng thời vùng nhập liệu và preview A4; ưu tiên phím tắt và mật độ thông tin cao.'
  },
  tablet: {
    id: 'tablet',
    label: 'Tablet / iPad',
    viewport: '600-1023 px hoặc tablet/iPad UA',
    shell: 'touch-split',
    navigation: 'rail-compact',
    density: 'medium',
    interaction: 'touch-first',
    uiHint: 'Ưu tiên touch, panel linh hoạt 1-2 cột, vùng bấm lớn và preview vừa màn hình.'
  },
  phone: {
    id: 'phone',
    label: 'Điện thoại',
    viewport: '< 600 px',
    shell: 'mobile-single',
    navigation: 'horizontal-compact',
    density: 'low',
    interaction: 'touch-first',
    uiHint: 'Một cột, ưu tiên tác vụ chính và Xem báo cáo; không phụ thuộc hover.'
  }
};

function normalizeWidth(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 1024;
}

function normalizeTouch(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function uaLooksTablet(userAgent, touchPoints) {
  const ua = String(userAgent || '');
  if (/iPad|Tablet|Silk|PlayBook/i.test(ua)) return true;
  // iPadOS can report a Macintosh user-agent.
  if (/Macintosh/i.test(ua) && touchPoints > 1) return true;
  return /Android/i.test(ua) && !/Mobile/i.test(ua);
}

function uaLooksPhone(userAgent) {
  return /iPhone|iPod|Android.*Mobile|Windows Phone|webOS|BlackBerry/i.test(String(userAgent || ''));
}

export function resolveRemoteAdminReady(contract) {
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) return false;
  if (contract.application?.id !== APP_ID) return false;
  if (contract.policy?.remoteAdminReady !== true) return false;
  const readiness = contract.readiness || {};
  return readiness.deviceRegistry === 'available'
    && readiness.deviceGateway === 'available'
    && readiness.adminApi === 'available';
}

export function resolveDefaultAccessMode(contract) {
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) return 'standalone';
  return contract.policy?.defaultAccessMode === 'managed' ? 'managed' : 'standalone';
}

async function readManagementContract(fetchImpl = fetch) {
  const response = await fetchImpl(MANAGEMENT_CONTRACT_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error('Không đọc được management contract.');
  const contract = await response.json();
  if (contract?.application?.id !== APP_ID) throw new Error('Management contract không thuộc PriceReport Tùng Gia Bảo.');
  return contract;
}

export function classifyDeviceProfile(input = {}) {
  const width = normalizeWidth(input.width);
  const touchPoints = normalizeTouch(input.touchPoints);
  const userAgent = String(input.userAgent || '');
  const pointerCoarse = input.pointerCoarse === true;
  const hoverNone = input.hoverNone === true;

  if (uaLooksPhone(userAgent) || width < 600) return DEVICE_PROFILES.phone;
  if (uaLooksTablet(userAgent, touchPoints)) return DEVICE_PROFILES.tablet;
  if (width < 1024 && (touchPoints > 0 || pointerCoarse || hoverNone)) return DEVICE_PROFILES.tablet;
  return DEVICE_PROFILES.desktop;
}

function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const r = Math.floor(Math.random() * 16);
    const v = char === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function deviceCode(id) {
  const raw = String(id || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
  const body = (raw + '00000000').slice(0, 8);
  return DEVICE_NAMESPACE + body.slice(0, 4) + '-' + body.slice(4, 8);
}

function safeStorageRead() {
  try {
    const raw = localStorage.getItem(DEVICE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function safeStorageWrite(value) {
  try {
    localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function environmentSnapshot(profile) {
  return {
    deviceClass: profile.id,
    deviceLabel: profile.label,
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    touchPoints: typeof navigator !== 'undefined' ? Number(navigator.maxTouchPoints || 0) : 0,
    platform: typeof navigator !== 'undefined' ? String(navigator.platform || '') : '',
    userAgent: typeof navigator !== 'undefined' ? String(navigator.userAgent || '') : ''
  };
}

export function ensureLocalDeviceRecord(profile, now = new Date()) {
  const current = safeStorageRead();
  const id = typeof current?.deviceId === 'string' && current.deviceId ? current.deviceId : randomId();
  const createdAt = typeof current?.createdAt === 'string' ? current.createdAt : now.toISOString();
  const previousClass = typeof current?.deviceClass === 'string' ? current.deviceClass : '';
  const snapshot = environmentSnapshot(profile);
  const next = {
    schemaVersion: 1,
    application: APP_ID,
    namespace: DEVICE_NAMESPACE,
    deviceId: id,
    deviceCode: typeof current?.deviceCode === 'string' && current.deviceCode ? current.deviceCode : deviceCode(id),
    status: 'local-unmanaged',
    classificationSource: 'client-runtime',
    deviceClass: profile.id,
    deviceLabel: profile.label,
    uiProfile: profile.shell,
    createdAt,
    lastSeenAt: now.toISOString(),
    environmentChanged: Boolean(previousClass && previousClass !== profile.id),
    ...snapshot
  };
  safeStorageWrite(next);
  return next;
}

export function currentDeviceInput() {
  if (typeof window === 'undefined') return { width: 1024, touchPoints: 0, userAgent: '' };
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    touchPoints: Number(navigator.maxTouchPoints || 0),
    userAgent: String(navigator.userAgent || ''),
    pointerCoarse: typeof matchMedia === 'function' ? matchMedia('(pointer: coarse)').matches : false,
    hoverNone: typeof matchMedia === 'function' ? matchMedia('(hover: none)').matches : false
  };
}

export function deviceGateOwnsDeviceChip(state) {
  const value = String(state || '');
  return Boolean(value && !['classification-only', 'standalone'].includes(value));
}

function updateDeviceChip(record) {
  if (deviceGateOwnsDeviceChip(document.documentElement?.dataset?.priceReportDeviceAccess)) return;
  const chip = document.getElementById('deviceProfileChip');
  if (!chip) return;
  chip.innerHTML = '<strong>' + record.deviceLabel + '</strong><small>' + record.deviceCode + ' · ' + record.uiProfile + '</small>';
  chip.dataset.deviceClass = record.deviceClass;
}

export function applyDeviceProfile(profile, record) {
  if (typeof document === 'undefined') return;
  document.body.dataset.deviceClass = profile.id;
  document.body.dataset.deviceProfile = profile.shell;
  const shell = document.querySelector('.shell');
  if (shell) {
    shell.dataset.deviceClass = profile.id;
    shell.dataset.deviceProfile = profile.shell;
  }
  updateDeviceChip(record);
}

export function getLocalDeviceRecord() {
  return safeStorageRead();
}

export function startDeviceProfileRuntime() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  let profile = classifyDeviceProfile(currentDeviceInput());
  let record = ensureLocalDeviceRecord(profile);
  applyDeviceProfile(profile, record);

  const publish = () => {
    window.dispatchEvent(new CustomEvent('pricereport:device-profile', { detail: { profile, record } }));
  };
  publish();

  const refresh = () => {
    const nextProfile = classifyDeviceProfile(currentDeviceInput());
    const changed = nextProfile.id !== profile.id;
    profile = nextProfile;
    record = ensureLocalDeviceRecord(profile);
    applyDeviceProfile(profile, record);
    if (changed) publish();
  };

  const resize = () => window.requestAnimationFrame(refresh);
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  const heartbeat = window.setInterval(() => {
    record = ensureLocalDeviceRecord(profile);
    updateDeviceChip(record);
  }, 60_000);

  const managementRuntime = {
    application: APP_ID,
    category: 'Kế toán',
    deviceNamespace: DEVICE_NAMESPACE,
    remoteAdminReady: false,
    defaultAccessMode: 'standalone',
    managementReadiness: 'loading',
    getDeviceProfile: () => ({ ...profile }),
    getLocalDeviceRecord: () => ({ ...record }),
    refreshDeviceProfile: refresh,
    refreshManagementReadiness: async () => {
      try {
        const contract = await readManagementContract();
        managementRuntime.remoteAdminReady = resolveRemoteAdminReady(contract);
        managementRuntime.defaultAccessMode = resolveDefaultAccessMode(contract);
        managementRuntime.managementReadiness = managementRuntime.remoteAdminReady
          ? 'ready'
          : (managementRuntime.defaultAccessMode === 'standalone' ? 'standalone' : 'managed-unavailable');
        managementRuntime.managementContract = contract;
      } catch (error) {
        managementRuntime.remoteAdminReady = false;
        managementRuntime.managementReadiness = 'unavailable';
        delete managementRuntime.managementContract;
        managementRuntime.managementError = error instanceof Error ? error.message : 'Không đọc được management contract.';
      }
      window.dispatchEvent(new CustomEvent('pricereport:management-readiness', {
        detail: {
          remoteAdminReady: managementRuntime.remoteAdminReady,
          state: managementRuntime.managementReadiness
        }
      }));
      return managementRuntime.remoteAdminReady;
    }
  };

  window.PriceReportManagement = managementRuntime;
  void managementRuntime.refreshManagementReadiness();

  return {
    get profile() { return profile; },
    get record() { return record; },
    stop() {
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
      window.clearInterval(heartbeat);
    }
  };
}
