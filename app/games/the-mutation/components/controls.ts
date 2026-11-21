const CONTROL_SELECTOR = 'input, textarea, select, button, a, [contenteditable="true"]'

/** True when a key press belongs to a form control or button rather than to the game. */
export function isControlTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(CONTROL_SELECTOR) !== null
}
