import { getConfig } from '../shared/storage';
import { sendViaHttp, pingViaHttp } from './transports/http';
import { sendViaNative, pingViaNative } from './transports/native';
import { sendViaWs, pingViaWs } from './transports/ws';

type ClipPayload = { content?: string; type: 'text' | 'url'; title?: string };

// Use lastFocusedWindow for reliability from a service worker context
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab;
}

// Inline page functions to avoid relying on built file paths
function pageReadSelection() {
  try {
    const sel = window.getSelection?.();
    let text = sel ? String(sel) : '';
    if (!text) {
      const ae = document.activeElement as any;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) {
        const start = ae.selectionStart ?? 0;
        const end = ae.selectionEnd ?? 0;
        if (typeof ae.value === 'string' && end > start) text = ae.value.slice(start, end);
      }
    }
    return (text || '').trim();
  } catch {
    return '';
  }
}

function pageReadTabMeta() {
  try {
    return { href: location.href, title: document.title };
  } catch {
    return { href: '', title: '' };
  }
}

async function readSelectionFromActiveTab(): Promise<string | null> {
  const tab = await getActiveTab();
  if (!tab?.id) return null;
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    func: pageReadSelection
  });
  const strings = results
    .map(r => (typeof r.result === 'string' ? r.result.trim() : ''))
    .filter(s => s.length > 0)
    .sort((a, b) => b.length - a.length);
  return strings[0] ?? '';
}

async function readTabMetaFromActiveTab(): Promise<{ href: string; title: string } | null> {
  const tab = await getActiveTab();
  if (!tab?.id) return null;
  // Run only in the top frame for accuracy
  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tab.id, frameIds: [0] },
    func: pageReadTabMeta
  });
  return (result?.result as any) ?? null;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.kind === 'popupOpened') {
      try {
        const selection = await readSelectionFromActiveTab();
        const tabMeta = await readTabMetaFromActiveTab();
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
