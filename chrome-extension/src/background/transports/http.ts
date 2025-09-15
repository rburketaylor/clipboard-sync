export async function sendViaHttp(baseUrl: string, payload: { content?: string; type: 'text' | 'url'; title?: string }) {
  const url = `${baseUrl.replace(/\/$/, '')}/clip`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: payload.content, type: payload.type, title: payload.title })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
}

