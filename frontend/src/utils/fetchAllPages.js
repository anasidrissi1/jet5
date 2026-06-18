export async function fetchAllPages(loader, baseParams = {}) {
  const items = [];
  let page = 1;
  let hasNext = true;

  while (hasNext && page <= 50) {
    const response = await loader({ ...baseParams, page, page_size: 200 });
    const payload = response.data;
    const batch = Array.isArray(payload) ? payload : payload.results ?? [];
    items.push(...batch);
    hasNext = Boolean(payload?.next);
    page += 1;
  }

  return items;
}
