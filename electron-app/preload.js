const { contextBridge, ipcRenderer } = require('electron');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

async function http(path, options = {}) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  if (res.status === 204) return undefined;
  return res.json();
}

function withSafeCallback(fn) {
  return typeof fn === 'function' ? fn : () => undefined;
}

if (contextBridge?.exposeInMainWorld) {
  contextBridge.exposeInMainWorld('api', {
    backendUrl: BACKEND_URL,
    getClips: async (limit = 10) => http(`/clips?limit=${encodeURIComponent(limit)}`),
    createClip: async ({ type, content, title }) =>
      http('/clip', { method: 'POST', body: JSON.stringify({ type, content, title }) }),
    deleteClip: async (id) => http(`/clip/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    readClipboardText: async () => {
      const snapshot = await ipcRenderer.invoke('clipboard:read');
      return snapshot?.text ?? '';
    },
    readClipboardSnapshot: async () => {
      const snapshot = await ipcRenderer.invoke('clipboard:read');
      return snapshot ?? { text: '', hash: '', mimeType: 'text/plain' };
    },
    writeClipboardText: async (text) => {
      await ipcRenderer.invoke('clipboard:write', { text: text ?? '' });
    },
    startClipboardWatch: async () => {
      const response = await ipcRenderer.invoke('clipboard:watch-start');
      return response?.snapshot ?? null;
    },
    stopClipboardWatch: async () => {
      await ipcRenderer.invoke('clipboard:watch-stop');
    },
    onClipboardChanged: (callback) => {
      const safe = withSafeCallback(callback);
      const listener = (_event, payload) => safe(payload);
      ipcRenderer.on('clipboard:changed', listener);
      return () => ipcRenderer.removeListener('clipboard:changed', listener);
    },
  });
}

module.exports = {
  BACKEND_URL,
  http,
};
