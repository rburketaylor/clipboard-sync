const { contextBridge, clipboard } = require('electron');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

async function http(path, options = {}) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

contextBridge.exposeInMainWorld('api', {
  backendUrl: BACKEND_URL,
  getClips: async (limit = 10) => http(`/clips?limit=${encodeURIComponent(limit)}`),
  createClip: async ({ type, content, title }) =>
    http('/clip', { method: 'POST', body: JSON.stringify({ type, content, title }) }),
  readClipboardText: () => clipboard.readText(),
  writeClipboardText: (text) => clipboard.writeText(text ?? ''),
});

