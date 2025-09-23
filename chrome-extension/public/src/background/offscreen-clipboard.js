const DEFAULT_MIME_TYPE = 'text/plain';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureFocus() {
  if (document.hasFocus?.()) return;

  if (typeof globalThis.focus === 'function') {
    globalThis.focus();
    await sleep(0);
    if (document.hasFocus?.()) return;
  }

  const probe = document.createElement('textarea');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:fixed;top:-200px;left:-200px;opacity:0;pointer-events:none;';
  document.body.appendChild(probe);
  probe.focus({ preventScroll: true });
  await sleep(50);
  document.body.removeChild(probe);
}

async function readClipboardViaPasteEvent() {
  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea');
    textarea.setAttribute('aria-hidden', 'true');
    textarea.style.cssText = 'position:fixed;top:-200px;left:-200px;opacity:0;pointer-events:none;';

    let timer = null;

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      textarea.removeEventListener('paste', onPaste);
      if (textarea.parentNode) textarea.parentNode.removeChild(textarea);
    };

    const onPaste = (event) => {
      event.preventDefault();
      const text = event.clipboardData?.getData('text/plain') || '';
      cleanup();
      resolve({ text, mimeType: DEFAULT_MIME_TYPE });
    };

    textarea.addEventListener('paste', onPaste, { once: true });
    document.body.appendChild(textarea);
    textarea.focus({ preventScroll: true });

    if (typeof document.execCommand !== 'function') {
      cleanup();
      reject(new Error('document.execCommand unavailable'));
      return;
    }

    try {
      const ok = document.execCommand('paste');
      if (ok === false) {
        cleanup();
        reject(new Error('Clipboard paste not permitted'));
        return;
      }
    } catch (err) {
      cleanup();
      reject(err instanceof Error ? err : new Error(String(err)));
      return;
    }

    // Fallback timeout in case paste never fires
    timer = setTimeout(() => {
      cleanup();
      reject(new Error('Clipboard paste timed out'));
    }, 200);
  });
}

async function readClipboardOnce() {
  try {
    const text = await navigator.clipboard.readText();
    return { text, mimeType: DEFAULT_MIME_TYPE };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      return readClipboardViaPasteEvent();
    }
    throw error;
  }
}

async function readClipboard() {
  await ensureFocus();

  try {
    return await readClipboardOnce();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Document is not focused')) {
      await sleep(50);
      await ensureFocus();
      return readClipboardOnce();
    }
    throw err instanceof Error ? err : new Error(String(err));
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.kind !== 'offscreenClipboardRead') {
    return false;
  }

  (async () => {
    try {
      const { text, mimeType } = await readClipboard();
      sendResponse({ ok: true, text, mimeType });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      sendResponse({ ok: false, error });
    }
  })();

  return true;
});
