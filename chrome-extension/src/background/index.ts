import { getConfig } from '../shared/storage';
import { sendViaHttp, pingViaHttp } from './transports/http';
import { sendViaNative, pingViaNative } from './transports/native';
import { sendViaWs, pingViaWs } from './transports/ws';

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

        try {
          if (cfg.mode === 'native') {
            await sendViaNative(payload);
          } else if (cfg.mode === 'ws') {
            await sendViaWs(cfg.wsUrl || 'ws://127.0.0.1:17373', payload);
          } else {
            await sendViaHttp(cfg.backendBaseUrl || 'http://localhost:8000', payload);
          }
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

    if (msg?.kind === 'testConnection') {
      const cfg = await getConfig();
      let ok = false;
      if (cfg.mode === 'native') ok = await pingViaNative();
      else if (cfg.mode === 'ws') ok = await pingViaWs(cfg.wsUrl || 'ws://127.0.0.1:17373');
      else ok = await pingViaHttp(cfg.backendBaseUrl || 'http://localhost:8000');
      sendResponse({ ok });
      return;
    }
  })();
  // Return true to keep the message channel open for async response
  return true;
});
