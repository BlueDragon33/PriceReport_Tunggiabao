export const BACKUP_SCHEMA_VERSION = 4;

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const identity = (value) => value;

export function buildBackupPayload({
  current,
  history = [],
  presets = {},
  customers = [],
  catalog = [],
  appVersion = '',
  dataVersion = 1,
  exportedAt = new Date().toISOString()
} = {}) {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appVersion: String(appVersion || ''),
    dataVersion: Math.max(1, Math.trunc(Number(dataVersion) || 1)),
    exportedAt: String(exportedAt),
    current,
    history,
    presets,
    customers,
    catalog
  };
}

export function validateBackupPayload(payload, { maxSchemaVersion = BACKUP_SCHEMA_VERSION, maxDataVersion = Infinity } = {}) {
  if (!isPlainObject(payload) || !isPlainObject(payload.current) || !Array.isArray(payload.history) || !isPlainObject(payload.presets)) {
    return { ok:false, code:'BACKUP_SCHEMA_INVALID' };
  }
  const schemaVersion = Number(payload.schemaVersion || 1);
  if (!Number.isFinite(schemaVersion) || schemaVersion < 1 || schemaVersion > maxSchemaVersion) {
    return { ok:false, code:'BACKUP_VERSION_UNSUPPORTED' };
  }
  const dataVersion = Number(payload.dataVersion || 1);
  if (!Number.isFinite(dataVersion) || dataVersion < 1 || dataVersion > maxDataVersion) {
    return { ok:false, code:'BACKUP_DATA_VERSION_UNSUPPORTED' };
  }
  return { ok:true, schemaVersion, dataVersion };
}

export function normalizeBackupPayload(payload, normalizers = {}, limits = {}) {
  const validation = validateBackupPayload(payload, limits);
  if (!validation.ok) {
    const error = new Error(validation.code);
    error.code = validation.code;
    throw error;
  }
  const normalizeCurrent = normalizers.current || identity;
  const normalizeHistory = normalizers.history || identity;
  const normalizePresets = normalizers.presets || identity;
  const normalizeCustomers = normalizers.customers || identity;
  const normalizeCatalog = normalizers.catalog || identity;
  return {
    ...payload,
    schemaVersion: validation.schemaVersion,
    dataVersion: validation.dataVersion,
    current: normalizeCurrent(payload.current),
    history: normalizeHistory(payload.history),
    presets: normalizePresets(payload.presets),
    customers: normalizeCustomers(Array.isArray(payload.customers) ? payload.customers : []),
    catalog: normalizeCatalog(Array.isArray(payload.catalog) ? payload.catalog : [])
  };
}
