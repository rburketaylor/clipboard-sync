let port: chrome.runtime.Port | null = null;

function ensurePort(): chrome.runtime.Port {
  if (!port) {
    port = chrome.runtime.connectNative('com.clipboardsync.host');
    port.onDisconnect.addListener(() => {
      port = null;
    });
  }
  return port;
}

export async function pingViaNative(): Promise<boolean> {
  try {
    const p = ensurePort();
    p.postMessage({ kind: 'ping' });
    return true;
  } catch {
    return false;
  }
}

export async function sendViaNative(payload: { content?: string; type: 'text' | 'url'; title?: string }) {
  const p = ensurePort();
  p.postMessage({ kind: 'clip', payload });
}

