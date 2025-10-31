import { useMemo } from 'react';

export interface KetcherViewerProps {
  structure: string;
  hiddenControls?: string[];
  height?: number;
  title?: string;
  className?: string;
  basePath?: string;
}

const DEFAULT_BASE_PATH = '/ketcher/index.html';
const DEFAULT_HEIGHT = 440;

const buildSearchParams = (structure: string, hiddenControls?: string[]) => {
  const params = new URLSearchParams();
  params.set('moll', structure);
  if (hiddenControls?.length) {
    const controls = hiddenControls.map((value) => value.trim()).filter(Boolean);
    if (controls.length) {
      params.set('hiddenControls', controls.join(','));
    }
  }
  return params;
};

export const buildKetcherUrl = (
  structure: string,
  options?: Pick<KetcherViewerProps, 'hiddenControls' | 'basePath'>
) => {
  const trimmed = structure.trim();
  if (!trimmed) {
    return null;
  }

  const { hiddenControls, basePath = DEFAULT_BASE_PATH } = options ?? {};
  const params = buildSearchParams(trimmed, hiddenControls);

  return `${basePath}?${params.toString()}`;
};

const KetcherViewer = ({
  structure,
  hiddenControls,
  height = DEFAULT_HEIGHT,
  title = 'Reaction diagram',
  className,
  basePath
}: KetcherViewerProps) => {
  const src = useMemo(
    () => buildKetcherUrl(structure, { hiddenControls, basePath }),
    [structure, hiddenControls, basePath]
  );

  if (!src) {
    return null;
  }

  return (
    <iframe
      src={src}
      title={title}
      className={className}
      style={{ width: '100%', border: 'none', height }}
      loading="lazy"
      allow="clipboard-read; clipboard-write"
    />
  );
};

export default KetcherViewer;
