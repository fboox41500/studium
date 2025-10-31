import { useMemo } from 'react';
import { createOrdApiClient, resolveApiBaseUrl, type OrdApiClient, type OrdApiClientConfig } from '../api';
import { stableStringify } from '../utils/serialization';

export function useOrdApiClient(config: OrdApiClientConfig = {}): OrdApiClient {
  const configKey = stableStringify(config ?? {});
  const configSnapshot = useMemo(() => config, [configKey]);

  return useMemo(() => {
    const mergedConfig: OrdApiClientConfig = { ...configSnapshot };
    mergedConfig.baseUrl = mergedConfig.baseUrl ?? resolveApiBaseUrl({ override: mergedConfig.baseUrl });
    return createOrdApiClient(mergedConfig);
  }, [configSnapshot]);
}
