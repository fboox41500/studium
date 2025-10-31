import type { JsonValue } from './types';

const DEFAULT_BASE_URL = 'http://localhost:8000';
const ENV_KEYS = ['VITE_API_BASE_URL', 'NEXT_PUBLIC_API_BASE_URL', 'REACT_APP_API_BASE_URL'] as const;

let explicitBaseUrl: string | null = null;

function readFromImportMeta(key: string): string | undefined {
  try {
    // @ts-ignore - import.meta may not exist depending on the bundler/runtime.
    const importMeta = typeof import.meta !== 'undefined' ? import.meta : undefined;
    if (!importMeta || !importMeta.env) return undefined;
    return typeof importMeta.env[key] === 'string' ? importMeta.env[key] : undefined;
  } catch {
    return undefined;
  }
}

function readFromProcessEnv(key: string): string | undefined {
  try {
    if (typeof process === 'undefined' || !process.env) return undefined;
    const value = process.env[key];
    return typeof value === 'string' ? value : undefined;
  } catch {
    return undefined;
  }
}

function normaliseUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\/$/, '');
}

export function setApiBaseUrl(url: string) {
  explicitBaseUrl = normaliseUrl(url) ?? null;
}

export interface ResolveApiBaseUrlOptions {
  fallback?: string;
  override?: string | null;
}

export function resolveApiBaseUrl(options: ResolveApiBaseUrlOptions = {}): string {
  const { fallback = DEFAULT_BASE_URL, override } = options;
  if (override) {
    return normaliseUrl(override) ?? fallback;
  }

  if (explicitBaseUrl) {
    return explicitBaseUrl;
  }

  for (const key of ENV_KEYS) {
    const value = normaliseUrl(readFromImportMeta(key) ?? readFromProcessEnv(key));
    if (value) {
      return value;
    }
  }

  return normaliseUrl(fallback) ?? DEFAULT_BASE_URL;
}

export function getConfiguredApiBaseUrl(): string {
  return resolveApiBaseUrl();
}

export function getEnvironmentSnapshot(): Record<string, JsonValue> {
  const snapshot: Record<string, JsonValue> = {};
  for (const key of ENV_KEYS) {
    snapshot[key] = normaliseUrl(readFromImportMeta(key) ?? readFromProcessEnv(key)) ?? null;
  }
  snapshot.defaultBaseUrl = DEFAULT_BASE_URL;
  snapshot.activeBaseUrl = getConfiguredApiBaseUrl();
  return snapshot;
}
