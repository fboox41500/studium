import { useEffect, useMemo, useState } from 'react';
import wasmUrl from '@rdkit/rdkit/Code/MinimalLib/dist/RDKit_minimal.wasm?url';

type RDKitModule = Awaited<ReturnType<typeof import('@rdkit/rdkit')['initRDKitModule']>>;

type StructureFormat = 'mol' | 'smiles';

type SvgOptions = string | Record<string, unknown>;

export interface RDKitStructureProps {
  structure: string;
  format?: StructureFormat;
  width?: number;
  height?: number;
  svgOptions?: SvgOptions;
  ariaLabel?: string;
}

const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 300;

let rdkitModulePromise: Promise<RDKitModule> | null = null;

const loadRDKitModule = () => {
  if (!rdkitModulePromise) {
    rdkitModulePromise = import('@rdkit/rdkit').then((rdkit) =>
      rdkit.initRDKitModule({ locateFile: () => wasmUrl })
    );
  }
  return rdkitModulePromise;
};

const normaliseSvgOptions = (options?: SvgOptions) => {
  if (!options) {
    return null;
  }

  if (typeof options === 'string') {
    return options;
  }

  try {
    return JSON.stringify(options);
  } catch (error) {
    console.warn('Unable to serialise RDKit SVG options', error);
    return null;
  }
};

const RDKitStructure = ({
  structure,
  format = 'mol',
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  svgOptions,
  ariaLabel = 'Rendered chemical structure'
}: RDKitStructureProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);

  const trimmedStructure = useMemo(() => structure.trim(), [structure]);
  const serialisedOptions = useMemo(() => normaliseSvgOptions(svgOptions), [svgOptions]);

  useEffect(() => {
    if (!trimmedStructure) {
      setSvg(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setSvg(null);

    loadRDKitModule()
      .then((module) => {
        if (cancelled) {
          return;
        }

        let mol: import('@rdkit/rdkit').JSMol | null = null;

        try {
          mol = module.get_mol(trimmedStructure);
          if (!mol) {
            throw new Error('Unable to parse structure.');
          }

          const svgMarkup = serialisedOptions
            ? mol.get_svg_with_highlights(serialisedOptions)
            : width && height
            ? mol.get_svg(width, height)
            : mol.get_svg();

          if (!cancelled) {
            setSvg(svgMarkup);
          }
        } catch (err) {
          if (!cancelled) {
            const message = err instanceof Error ? err.message : 'Unable to render structure.';
            setError(message);
          }
        } finally {
          if (mol) {
            try {
              mol.delete();
            } catch (cleanupError) {
              console.warn('Failed to dispose RDKit molecule', cleanupError);
            }
          }
          if (!cancelled) {
            setLoading(false);
          }
        }
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        const message = err instanceof Error ? err.message : 'Unable to initialise RDKit renderer.';
        setError(message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [trimmedStructure, format, width, height, serialisedOptions]);

  if (loading) {
    return <p data-loading>Rendering structure…</p>;
  }

  if (error) {
    return <p data-error>{error}</p>;
  }

  if (!svg) {
    return null;
  }

  return (
    <div
      data-rdkit-structure
      role="img"
      aria-label={ariaLabel}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default RDKitStructure;
