let port: chrome.runtime.Port | null = null;
let nextRequestId = 1;
const pending = new Map<number, {
  resolve: (message: any) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();

function resetPending(error: Error) {
  pending.forEach(({ reject, timeout }) => {
    clearTimeout(timeout);
    reject(error);
  });
  pending.clear();
}

function ensurePort(): chrome.runtime.Port {
  if (!port) {
    port = chrome.runtime.connectNative('com.clipboardsync.host');
    port.onDisconnect.addListener(() => {
      const err = new Error('Native messaging host disconnected');
      if (chrome.runtime.lastError) {
        console.error('Native messaging disconnect:', chrome.runtime.lastError.message);
      }
      resetPending(err);
      port = null;
    });
    port.onMessage.addListener((message: any) => {
      const requestId = message?.requestId;
      if (!requestId) return;
      const entry = pending.get(requestId);
      if (!entry) return;
      clearTimeout(entry.timeout);
      pending.delete(requestId);
      entry.resolve(message);
    });
  }
  return port;
}

function sendNativeRequest(message: Record<string, unknown>, timeoutMs = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    const p = ensurePort();
    const requestId = nextRequestId++;
    const timeout = setTimeout(() => {
      pending.delete(requestId);
      reject(new Error('Native messaging request timed out'));
    }, timeoutMs);

    pending.set(requestId, { resolve, reject, timeout });

    try {
      p.postMessage({ ...message, requestId });
    } catch (err: any) {
      clearTimeout(timeout);
      pending.delete(requestId);
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

export async function pingViaNative(): Promise<boolean> {
  try {
    const response = await sendNativeRequest({ kind: 'ping' }, 2000);
    return response?.ok === true;
  } catch {
    return false;
  }
}

export async function sendViaNative(payload: ClipPayload, options?: { backendBaseUrl?: string }) {
  const response = await sendNativeRequest({ kind: 'clip', payload, backendBaseUrl: options?.backendBaseUrl });
  if (!response?.ok) {
    throw new Error(response?.error || 'Native messaging host reported an error');
  }
}
import type { ClipPayload } from '../../shared/types';
