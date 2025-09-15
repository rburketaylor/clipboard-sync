import { getConfig } from '../shared/storage';
import { sendViaHttp } from './transports/http';
// Placeholders for future transports
// import { sendViaNative } from './transports/native';
// import { sendViaWs } from './transports/ws';

type ClipPayload = { content?: string; type: 'text' | 'url'; title?: string };

async function executeScriptsOnActiveTab<T>(files: string[]): Promise<T | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return null;
  let lastResult: any = null;
  for (const file of files) {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [file]
    });
    lastResult = result?.result ?? lastResult;
  }
  return lastResult as T | null;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.kind === 'popupOpened') {
      try {
        const selection = await executeScriptsOnActiveTab<string>(['src/content/selection.ts']);
        const tabMeta = await executeScriptsOnActiveTab<{ href: string; title: string }>(['src/content/tabMeta.ts']);
        sendResponse({ selection, tabMeta });
      } catch (e: any) {
        sendResponse({ selection: '', tabMeta: null, error: e?.message || String(e) });
      }
      return;
    }

    if (msg?.kind === 'sendClip') {
      const payload = (msg?.payload || {}) as ClipPayload;
      try {
        // Basic client-side validation; detailed rules will live in validators
        if (!payload?.content || !payload?.type) throw new Error('Invalid payload');

        const cfg = await getConfig();
        let ok = false; let error: string | undefined;

        // For now use HTTP as default transport; native/ws can be added later
        try {
          await sendViaHttp(cfg.backendBaseUrl || 'http://localhost:8000', payload);
          ok = true;
        } catch (err: any) {
          ok = false; error = err?.message || String(err);
        }

        sendResponse({ ok, error });
      } catch (e: any) {
        sendResponse({ ok: false, error: e?.message || String(e) });
      }
      return;
    }
  })();
  // Return true to keep the message channel open for async response
  return true;
});

