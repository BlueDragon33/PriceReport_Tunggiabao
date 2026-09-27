export function inspectRecordCollection(records, validateRecord) {
  const valid = [];
  const rejected = [];
  const source = Array.isArray(records) ? records : [];
  source.forEach((record, index) => {
    try {
      const result = typeof validateRecord === 'function' ? validateRecord(record, index) : true;
      if (result === true || result?.ok === true) valid.push(record);
      else rejected.push({ index, record, reason: result?.code || result?.reason || 'INVALID_RECORD' });
    } catch (error) {
      rejected.push({ index, record, reason: error?.code || error?.message || 'INVALID_RECORD' });
    }
  });
  return { valid, rejected };
}

export function quarantinePayload(dataset, rejected = [], createdAt = new Date().toISOString()) {
  return { dataset:String(dataset || 'unknown'), createdAt:String(createdAt), rejected:Array.isArray(rejected) ? rejected : [] };
}
