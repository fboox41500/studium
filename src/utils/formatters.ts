const NORMALISED_EMPTY_LABEL = '—';

const formatKey = (key: string) =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());

const serializeValue = (value: unknown): string => {
  if (value == null) {
    return NORMALISED_EMPTY_LABEL;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeValue(item)).join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  if (typeof value === 'string') {
    return value.trim() || NORMALISED_EMPTY_LABEL;
  }

  return String(value);
};

const keyValuePairs = (
  entries?: Record<string, unknown> | Array<{ key?: string; label?: string; value?: unknown }>
) => {
  if (!entries) {
    return [] as Array<{ term: string; description: string }>;
  }

  if (Array.isArray(entries)) {
    return entries
      .filter((item) => item && (item.label || item.key))
      .map((item) => ({
        term: formatKey(item.label ?? item.key ?? ''),
        description: serializeValue(item.value)
      }));
  }

  return Object.entries(entries)
    .filter(([, value]) => value != null)
    .map(([key, value]) => ({
      term: formatKey(key),
      description: serializeValue(value)
    }));
};

const timestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const format = {
  keyValuePairs,
  timestamp
};
