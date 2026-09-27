const clone = (value) => JSON.parse(JSON.stringify(value ?? null));

export function buildVersionedHistoryRecord({
  existingRecord = null,
  id,
  savedAt,
  status,
  currency,
  total,
  data
} = {}) {
  const existing = existingRecord && typeof existingRecord === 'object' ? existingRecord : null;
  const recordId = String(existing?.id || existing?.recordId || id || '').trim();
  if (!recordId) throw new Error('history-record-id-required');

  const previousRevision = Math.max(1, Math.trunc(Number(existing?.revision) || 1));
  const revisions = Array.isArray(existing?.revisions) ? clone(existing.revisions) : [];

  if (existing?.data) {
    revisions.push({
      revision: previousRevision,
      savedAt: String(existing.savedAt || ''),
      status: String(existing.status || existing.data?.quoteStatus || 'draft'),
      currency: String(existing.currency || existing.data?.currency || 'VND'),
      total: Number.isFinite(Number(existing.total)) ? Number(existing.total) : 0,
      data: clone(existing.data)
    });
  }

  const revision = existing ? previousRevision + 1 : 1;
  return {
    id: recordId,
    recordId,
    quotationId: String(existing?.quotationId || recordId),
    revision,
    revisions,
    savedAt: String(savedAt || ''),
    status: String(status || 'draft'),
    currency: String(currency || 'VND'),
    total: Number.isFinite(Number(total)) ? Number(total) : 0,
    data: clone(data || {})
  };
}
