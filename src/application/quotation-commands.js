const clone = (value) => JSON.parse(JSON.stringify(value));

function idSet(ids) {
  return new Set((Array.isArray(ids) ? ids : []).map(value => String(value || '')).filter(Boolean));
}

export function quotationItemIdsFromIndices(items, indices) {
  const list = Array.isArray(items) ? items : [];
  return (Array.isArray(indices) ? indices : [])
    .map(index => String(list[index]?.itemId || ''))
    .filter(Boolean);
}

export function quotationItemsById(items, ids) {
  const selected = idSet(ids);
  return (Array.isArray(items) ? items : []).filter(item => selected.has(String(item?.itemId || '')));
}

export function patchQuotationItemsById(items, ids, patcher) {
  const selected = idSet(ids);
  const apply = typeof patcher === 'function' ? patcher : item => item;
  return (Array.isArray(items) ? items : []).map(item => {
    if (!selected.has(String(item?.itemId || ''))) return item;
    const next = apply(clone(item));
    return next && typeof next === 'object' ? next : item;
  });
}

export function duplicateQuotationItemsById(items, ids, createId) {
  const list = Array.isArray(items) ? items : [];
  const selected = idSet(ids);
  const copies = list
    .filter(item => selected.has(String(item?.itemId || '')))
    .map(item => {
      const copy = clone(item);
      copy.itemId = typeof createId === 'function' ? String(createId()) : '';
      return copy;
    });
  return [...list, ...copies];
}

export function removeQuotationItemsById(items, ids) {
  const selected = idSet(ids);
  return (Array.isArray(items) ? items : []).filter(item => !selected.has(String(item?.itemId || '')));
}

export function moveQuotationItemById(items, itemId, targetIndex) {
  const list = [...(Array.isArray(items) ? items : [])];
  const index = list.findIndex(item => String(item?.itemId || '') === String(itemId || ''));
  if (index < 0) return list;
  const bounded = Math.max(0, Math.min(list.length - 1, Math.trunc(Number(targetIndex) || 0));
  const [item] = list.splice(index, 1);
  list.splice(bounded, 0, item);
  return list;
}
