const BLOCKED_CTRL_KEYS = new Set(['a', 'c', 's', 'u', 'x']);
const BLOCKED_DEVTOOLS_KEYS = new Set(['c', 'e', 'i', 'j', 'k']);

function stopEvent(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  return false;
}

export function initContentProtection() {
  if (document.documentElement.dataset.contentProtection === '1') return;
  document.documentElement.dataset.contentProtection = '1';

  ['contextmenu', 'copy', 'cut', 'selectstart', 'dragstart'].forEach(type => {
    document.addEventListener(type, stopEvent, { capture: true });
  });

  document.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    const commandKey = event.ctrlKey || event.metaKey;
    const devtoolsShortcut = commandKey && event.shiftKey && BLOCKED_DEVTOOLS_KEYS.has(key);
    const protectedShortcut = commandKey && BLOCKED_CTRL_KEYS.has(key);

    if (event.key === 'F12' || devtoolsShortcut || protectedShortcut) stopEvent(event);
  }, { capture: true });
}
