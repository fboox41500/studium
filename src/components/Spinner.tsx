import type { FC } from 'react';

export const Spinner: FC<{ label?: string }> = ({ label = 'Loading reactions…' }) => (
  <div role="status" aria-live="polite" aria-busy="true">
    <span>{label}</span>
  </div>
);
