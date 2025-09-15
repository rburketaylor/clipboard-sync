let ws: WebSocket | null = null;
let wsUrl = 'ws://127.0.0.1:17373';
let connecting = false;

export function setWsUrl(url: string) {
  wsUrl = url;
}

export function getWsState(): number | null {
  return ws ? ws.readyState : null;
}

async function ensureConnected(): Promise<void> {
  if (ws && ws.readyState === WebSocket.OPEN) return;
  if (connecting) {
    // wait for existing attempt
    await new Promise((r) => setTimeout(r, 100));
    if (ws && ws.readyState === WebSocket.OPEN) return;
  }
  connecting = true;
  await new Promise<void>((resolve, reject) => {
    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => { connecting = false; resolve(); };
      ws.onerror = (ev) => { connecting = false; reject(new Error('WS error')); };
      ws.onclose = () => { /* allow reconnect later */ };
    } catch (e) {
      connecting = false;
      reject(e);
    }
  });
}

export async function pingViaWs(url: string): Promise<boolean> {
  setWsUrl(url);
  try {
    await ensureConnected();
    return true;
  } catch {
    return false;
  }
}

export async function sendViaWs(url: string, payload: { content?: string; type: 'text' | 'url'; title?: string }) {
  setWsUrl(url);
  await ensureConnected();
  if (!ws || ws.readyState !== WebSocket.OPEN) throw new Error('WS not connected');
  ws.send(JSON.stringify({ kind: 'clip', payload }));
}

