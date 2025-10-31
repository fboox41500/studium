// Utilities for producing stable serialisations that can be used as React effect dependencies.

export function stableStringify(value: unknown): string {
  const seen = new WeakSet();

  return JSON.stringify(value, (_key, val) => {
    if (val === undefined) {
      return '__undefined__';
    }
    if (typeof val === 'function') {
      return `__function__:${val.name || 'anonymous'}`;
    }
    if (typeof val === 'symbol') {
      return `__symbol__:${String(val)}`;
    }
    if (val && typeof val === 'object') {
      if (seen.has(val as object)) {
        return '__cycle__';
      }
      seen.add(val as object);
      if (Array.isArray(val)) {
        return val;
      }
      const sortedEntries = Object.entries(val as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
      return Object.fromEntries(sortedEntries);
    }
    return val;
  });
}
