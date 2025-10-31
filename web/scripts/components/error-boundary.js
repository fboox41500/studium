export class ErrorBoundary {
  constructor({ target, fallback }) {
    if (!target) {
      throw new Error('ErrorBoundary requires a target element.');
    }

    this.target = target;
    this.fallback = fallback;
    this.isShowingFallback = false;
  }

  async wrap(callback) {
    try {
      const result = await callback();
      if (this.isShowingFallback) {
        this.reset();
      }
      return result;
    } catch (error) {
      this.showFallback(error);
      return undefined;
    }
  }

  showFallback(error) {
    if (typeof this.fallback === 'function') {
      this.target.replaceChildren(this.fallback(error));
    } else if (this.fallback instanceof Node) {
      this.target.replaceChildren(this.fallback);
    } else {
      const fallbackMessage = document.createElement('p');
      fallbackMessage.className = 'panel__meta';
      fallbackMessage.textContent = 'Something went wrong while rendering content.';
      this.target.replaceChildren(fallbackMessage);
    }

    this.isShowingFallback = true;
    this.target.dispatchEvent(new CustomEvent('errorboundary:fallback', { detail: { error } }));
  }

  reset() {
    this.target.innerHTML = '';
    this.isShowingFallback = false;
    this.target.dispatchEvent(new CustomEvent('errorboundary:reset'));
  }
}
