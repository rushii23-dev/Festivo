/** Moving keyboard focus after an action, so screen reader users land where the change is. */

export function focusById(id: string): void {
  document.getElementById(id)?.focus();
}

/** Focuses after the next paint, for an element the current update is about to render. */
export function focusByIdNextFrame(id: string): void {
  requestAnimationFrame(() => focusById(id));
}
