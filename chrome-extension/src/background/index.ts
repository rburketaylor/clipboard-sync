import { getConfig } from '../shared/storage';
import { ClipPayload, ClipSource, DEFAULT_MIME_TYPE } from '../shared/types';
import { readClipboardFromOffscreen, teardownOffscreenIfIdle } from './offscreen-manager';
import { sendViaNative, pingViaNative } from './transports/native';

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

async function buildPayloadFromMessage(msg: any): Promise<ClipPayload> {
  const source = (msg?.source as ClipSource | undefined) ?? 'selection';

  if (source === 'clipboard') {
    const { text, mimeType } = await readClipboardFromOffscreen();
    return {
      type: 'text',
      content: text,
      mimeType: mimeType || DEFAULT_MIME_TYPE,
      source,
      createdAt: new Date().toISOString(),
    };
  }

  const payload = msg?.payload as ClipPayload | undefined;
  if (!payload?.content || !payload?.type) {
    throw new Error('Invalid payload');
  }

  return {
    ...payload,
    source,
    createdAt: new Date().toISOString(),
    mimeType: payload.mimeType || (payload.type === 'url' ? 'text/uri-list' : DEFAULT_MIME_TYPE),
  };
}

async function handleSendClip(msg: any) {
  const cfg = await getConfig();
  const payload = await buildPayloadFromMessage(msg);

  try {
    await sendViaNative(payload, { backendBaseUrl: cfg.backendBaseUrl });
    return { ok: true };
  } finally {
    if (payload.source === 'clipboard') {
      // Allow Chrome to reclaim the offscreen document when idle.
      void teardownOffscreenIfIdle();
    }
  }
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
      try {
        const result = await handleSendClip(msg);
        sendResponse(result);
      } catch (e: any) {
        const error = e instanceof Error ? e.message : String(e);
        sendResponse({ ok: false, error });
      }
      return;
    }

    if (msg?.kind === 'testConnection') {
      const ok = await pingViaNative();
      sendResponse({ ok });
      return;
    }
  })();
  // Return true to keep the message channel open for async response
  return true;
});

chrome.commands?.onCommand.addListener(async command => {
  if (command !== 'send-current-clipboard') return;
  try {
    await handleSendClip({ source: 'clipboard' });
  } catch (err) {
    console.error('Clipboard command failed', err);
  }
});
