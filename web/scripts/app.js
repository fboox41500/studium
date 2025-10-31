import { createLoader } from './components/loader.js';
import { createAlert } from './components/alert.js';
import { ErrorBoundary } from './components/error-boundary.js';

const THEME_STORAGE_KEY = 'studium:preferred-theme';

const appRoot = document.querySelector('[data-app-root]');
const themeToggle = document.querySelector('[data-theme-toggle]');
const navToggle = document.querySelector('[data-nav-toggle]');
const sidebar = document.getElementById('sidebar');
const navOverlay = document.querySelector('[data-nav-overlay]');
const alertStack = document.getElementById('alertStack');

const activityBody = document.querySelector('[data-activity-body]');
const summaryBody = document.querySelector('[data-error-boundary] [data-summary-body]');

const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)');

let currentTheme = getStartingTheme();
applyTheme(currentTheme);

if (prefersDark) {
  const handleSchemeChange = (event) => {
    if (!getStoredTheme()) {
      applyTheme(event.matches ? 'dark' : 'light');
    }
  };

  if (typeof prefersDark.addEventListener === 'function') {
    prefersDark.addEventListener('change', handleSchemeChange);
  } else if (typeof prefersDark.addListener === 'function') {
    prefersDark.addListener(handleSchemeChange);
  }
}

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme, { persist: true });
  });
}

if (navToggle && sidebar) {
  navToggle.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    document.body.classList.toggle('nav-open', isOpen);
    toggleOverlay(isOpen);

    if (isOpen) {
      focusElement(sidebar.querySelector('.sidebar__link'));
    } else {
      focusElement(navToggle);
    }
  });
}

if (navOverlay) {
  navOverlay.addEventListener('click', () => {
    closeSidebar();
  });
}

window.addEventListener('resize', () => {
  if (window.innerWidth > 1024) {
    closeSidebar({ restoreFocus: false });
  }
});

appRoot?.addEventListener('keyup', (event) => {
  if (event.key === 'Escape') {
    closeSidebar();
  }
});

const boundary = summaryBody
  ? new ErrorBoundary({
      target: summaryBody,
      fallback: (error) => {
        const container = document.createElement('div');
        container.className = 'error-fallback';
        const alert = createAlert({
          title: 'Unable to render summaries',
          description: error?.message ?? 'Try again shortly. We are retrying for you.',
          variant: 'danger',
          dismissible: false
        });
        container.appendChild(alert);
        return container;
      }
    })
  : null;

renderActivityFeed();
renderSummaries();

const alertDemoButton = document.querySelector('[data-alert-demo]');
if (alertDemoButton) {
  alertDemoButton.addEventListener('click', () => {
    showAlert({
      variant: 'info',
      title: '2 lab updates',
      description: 'Synthesis workflow reran successfully and chromatogram anomalies were resolved.',
      autoDismiss: 7000
    });
  });
}

function renderActivityFeed() {
  if (!activityBody) return;

  const loader = createLoader({ label: 'Loading activity', size: 'lg' });
  activityBody.replaceChildren(loader);

  wait(900).then(() => {
    const items = [
      {
        title: 'Automated assay clean-up complete',
        meta: '5 minutes ago • Chromatography automation'
      },
      {
        title: 'New dataset shared by Pharmacology team',
        meta: '22 minutes ago • Access granted to Ava Harper'
      },
      {
        title: 'AI summarisation drafted findings',
        meta: '33 minutes ago • Review pending approval'
      },
      {
        title: 'Spectrometer calibration finished',
        meta: '1 hour ago • Chemistry Lab'
      }
    ];

    const list = document.createElement('ul');
    list.className = 'activity-list';
    list.setAttribute('role', 'list');

    items.forEach(({ title, meta }) => {
      const item = document.createElement('li');
      item.className = 'activity-list__item';

      const headline = document.createElement('p');
      headline.className = 'activity-list__title';
      headline.textContent = title;

      const detail = document.createElement('p');
      detail.className = 'activity-list__meta';
      detail.textContent = meta;

      item.append(headline, detail);
      list.appendChild(item);
    });

    activityBody.replaceChildren(list);
  });
}

function renderSummaries() {
  if (!boundary) return;

  boundary.reset();
  summaryBody.replaceChildren(createLoader({ label: 'Compiling narratives', size: 'lg' }));

  boundary.wrap(async () => {
    await wait(1100);

    // Simulate intermittent failures that the error boundary can capture
    if (Math.random() < 0.12) {
      throw new Error('The AI summarisation service is temporarily unavailable.');
    }

    const summaries = [
      {
        title: 'Catalyst stability trending upward',
        body: 'AI detected improved half-life (+12%) in catalysts exposed to elevated humidity; recommended extending test window to confirm.'
      },
      {
        title: 'Notable outliers in assay 214B',
        body: 'Triplicate samples show signal drift beyond tolerance. Suggested recalibration of standard curve before next batch.'
      },
      {
        title: 'Potential synthesis shortcut identified',
        body: 'Machine learning flagged a two-step alternative reducing solvent consumption by 18% while preserving yield.'
      }
    ];

    const list = document.createElement('div');
    list.className = 'summary-list';

    summaries.forEach(({ title, body }) => {
      const card = document.createElement('article');
      card.className = 'summary-card';

      const heading = document.createElement('h4');
      heading.textContent = title;

      const content = document.createElement('p');
      content.textContent = body;

      const actionRow = document.createElement('div');
      actionRow.className = 'summary-card__actions';

      const approveBtn = document.createElement('button');
      approveBtn.type = 'button';
      approveBtn.className = 'btn btn--primary';
      approveBtn.textContent = 'Approve';
      approveBtn.addEventListener('click', () => {
        showAlert({
          variant: 'success',
          title: 'Summary approved',
          description: `${title} added to the knowledge base.`
        });
      });

      const refineBtn = document.createElement('button');
      refineBtn.type = 'button';
      refineBtn.className = 'btn btn--ghost';
      refineBtn.textContent = 'Refine';
      refineBtn.addEventListener('click', () => {
        showAlert({
          variant: 'warning',
          title: 'Refinement queued',
          description: 'We will regenerate this summary with additional context.'
        });
      });

      actionRow.append(approveBtn, refineBtn);
      card.append(heading, content, actionRow);
      list.appendChild(card);
    });

    summaryBody.replaceChildren(list);
  });
}

function showAlert({ variant = 'info', title, description, autoDismiss = 6000 } = {}) {
  if (!alertStack) return;

  const alert = createAlert({ variant, title, description });
  alertStack.appendChild(alert);

  requestAnimationFrame(() => {
    focusElement(alert);
  });

  if (autoDismiss) {
    const timer = setTimeout(() => {
      alert.remove();
    }, autoDismiss);

    alert.addEventListener('dismiss', () => {
      clearTimeout(timer);
    });
  }
}

function toggleOverlay(show) {
  if (!navOverlay) return;
  navOverlay.hidden = !show;
  navOverlay.setAttribute('aria-hidden', show ? 'false' : 'true');
}

function closeSidebar({ restoreFocus = true } = {}) {
  if (!sidebar) return;
  if (!sidebar.classList.contains('is-open')) return;
  sidebar.classList.remove('is-open');
  document.body.classList.remove('nav-open');
  navToggle?.setAttribute('aria-expanded', 'false');
  toggleOverlay(false);
  if (restoreFocus) {
    focusElement(navToggle);
  }
}

function applyTheme(theme, { persist = false } = {}) {
  currentTheme = theme;
  document.body.dataset.theme = theme;

  if (persist) {
    setStoredTheme(theme);
  }

  updateThemeToggle(theme);
}

function updateThemeToggle(theme) {
  if (!themeToggle) return;
  themeToggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Enable light theme' : 'Enable dark theme');
  const icon = themeToggle.querySelector('.icon');
  if (icon) {
    icon.classList.toggle('icon-moon', theme === 'dark');
    icon.classList.toggle('icon-sun', theme !== 'dark');
  }
}

function getStartingTheme() {
  const stored = getStoredTheme();
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  if (prefersDark?.matches) {
    return 'dark';
  }
  return 'light';
}

function focusElement(element, options = { preventScroll: true }) {
  if (!element || typeof element.focus !== 'function') {
    return;
  }

  try {
    element.focus(options);
  } catch (error) {
    element.focus();
  }
}

function wait(duration) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to read stored theme preference.', error);
    return null;
  }
}

function setStoredTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.warn('Unable to save theme preference.', error);
  }
}
