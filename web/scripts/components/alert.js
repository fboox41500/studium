const VARIANT_LABELS = {
  info: 'Information',
  success: 'Success',
  warning: 'Warning',
  danger: 'Error'
};

export function createAlert({
  title,
  description = '',
  variant = 'info',
  dismissible = true,
  actions = [],
  onDismiss
} = {}) {
  const alert = document.createElement('section');
  alert.className = `alert alert--${variant}`;
  alert.setAttribute('role', 'alert');
  alert.setAttribute('tabindex', '-1');
  alert.dataset.variant = variant;

  const label = VARIANT_LABELS[variant] ?? 'Notice';
  alert.setAttribute('aria-label', label);

  if (title) {
    const titleEl = document.createElement('p');
    titleEl.className = 'alert__title';
    titleEl.textContent = title;
    alert.appendChild(titleEl);
  }

  if (description) {
    const descriptionEl = document.createElement('p');
    descriptionEl.className = 'alert__description';
    descriptionEl.textContent = description;
    alert.appendChild(descriptionEl);
  }

  if (actions.length) {
    const actionsGroup = document.createElement('div');
    actionsGroup.className = 'alert__actions';
    actionsGroup.setAttribute('role', 'group');

    actions.forEach(({ label: actionLabel, onClick, variant: actionVariant = 'ghost' }) => {
      const actionBtn = document.createElement('button');
      actionBtn.type = 'button';
      actionBtn.className = `btn btn--${actionVariant}`;
      actionBtn.textContent = actionLabel;
      actionBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        onClick?.(event);
      });
      actionsGroup.appendChild(actionBtn);
    });

    alert.appendChild(actionsGroup);
  }

  if (dismissible) {
    const dismissBtn = document.createElement('button');
    dismissBtn.type = 'button';
    dismissBtn.className = 'btn btn--ghost';
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.setAttribute('aria-label', 'Dismiss notification');
    dismissBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      alert.dispatchEvent(new CustomEvent('dismiss')); // allow external listeners
      alert.remove();
      onDismiss?.();
    });
    alert.appendChild(dismissBtn);
  }

  return alert;
}
