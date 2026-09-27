export const STORAGE_SCHEMA_VERSION = 1;
export const STORAGE_SCHEMA_META_KEY = 'tunggiabao-price-report-schema-meta-v1';

export function migrateVersionedPayload(value, fromVersion, targetVersion, migrations = {}) {
  let version = Math.max(0, Math.trunc(Number(fromVersion) || 0));
  const target = Math.max(version, Math.trunc(Number(targetVersion) || version));
  let current = structuredCloneSafe(value);
  while (version < target) {
    const migrate = migrations[version];
    if (typeof migrate !== 'function') {
      const error = new Error('storage-migration-missing');
      error.code = 'STORAGE_MIGRATION_MISSING';
      error.fromVersion = version;
      error.toVersion = version + 1;
      throw error;
    }
    current = migrate(structuredCloneSafe(current));
    version += 1;
  }
  return { schemaVersion: version, value: current };
}

export function ensureStorageSchemaMarker(repository, {
  metaKey = STORAGE_SCHEMA_META_KEY,
  currentVersion = STORAGE_SCHEMA_VERSION,
  now = () => new Date().toISOString()
} = {}) {
  const existing = repository.readJson(metaKey, null);
  if (existing && typeof existing === 'object') {
    const version = Math.max(0, Math.trunc(Number(existing.schemaVersion) || 0));
    if (version > currentVersion) return { ok:false, code:'STORAGE_SCHEMA_NEWER_THAN_APP', schemaVersion:version };
    if (version < currentVersion) return { ok:false, code:'STORAGE_MIGRATION_REQUIRED', schemaVersion:version };
    return { ok:true, schemaVersion:version, created:false };
  }
  const marker = { schemaVersion:currentVersion, establishedAt:now(), legacyFormatAdopted:true };
  const written = repository.writeJson(metaKey, marker);
  if (!written.ok) return { ok:false, code:written.error?.code || 'STORAGE_WRITE_FAILED', schemaVersion:currentVersion };
  return { ok:true, schemaVersion:currentVersion, created:true };
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
