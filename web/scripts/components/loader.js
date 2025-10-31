export function createLoader({ label = 'Loading', size = 'md', inline = false } = {}) {
  const loader = document.createElement('div');
  loader.className = 'loader';
  loader.dataset.size = size;
  loader.setAttribute('role', 'status');
  loader.setAttribute('aria-live', 'polite');
  if (inline) {
    loader.style.display = 'inline-flex';
  }

  const spinner = document.createElement('span');
  spinner.className = 'loader__spinner';
  spinner.setAttribute('aria-hidden', 'true');

  const labelEl = document.createElement('span');
  labelEl.className = 'loader__label';
  labelEl.textContent = label;

  loader.append(spinner, labelEl);
  return loader;
}
