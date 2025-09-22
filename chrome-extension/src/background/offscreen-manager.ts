import { ClipboardReadResult, DEFAULT_MIME_TYPE } from '../shared/types';

const OFFSCREEN_DOCUMENT_PATH = 'src/background/offscreen-clipboard.html';
let creatingDocument: Promise<void> | null = null;

async function hasDocument(): Promise<boolean> {
  try {
    if (!chrome.offscreen?.hasDocument) return false;
    return await chrome.offscreen.hasDocument();
  } catch (err) {
    console.warn('offscreen.hasDocument failed', err);
    return false;
  }
}

async function ensureDocument(): Promise<void> {
  if (!chrome.offscreen?.createDocument) {
    throw new Error('Offscreen documents are not supported in this browser');
  }

  if (await hasDocument()) {
    return;
  }

  if (!creatingDocument) {
    const url = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
    creatingDocument = chrome.offscreen
      .createDocument({
        url,
        reasons: ['CLIPBOARD'],
        justification: 'Read clipboard contents for sync',
      })
      .catch(err => {
        console.error('Failed to create offscreen document', err);
        throw err;
      })
      .finally(() => {
        creatingDocument = null;
      });
  }

  return creatingDocument;
}

export async function readClipboardFromOffscreen(): Promise<ClipboardReadResult> {
  await ensureDocument();

  try {
    const response: any = await chrome.runtime.sendMessage({ kind: 'offscreenClipboardRead' });
    if (!response?.ok) {
      throw new Error(response?.error || 'Clipboard read failed');
    }

    const text = typeof response.text === 'string' ? response.text : '';
    const mimeType = typeof response.mimeType === 'string' ? response.mimeType : DEFAULT_MIME_TYPE;

    if (!text.trim()) {
      throw new Error('Clipboard is empty');
    }

    return { text, mimeType };
  } catch (err) {
    const lastError = chrome.runtime.lastError;
    if (lastError) {
      throw new Error(lastError.message);
    }
    throw err instanceof Error ? err : new Error(String(err));
  }
}

export async function teardownOffscreenIfIdle(): Promise<void> {
  if (!chrome.offscreen?.hasDocument || !chrome.offscreen?.closeDocument) return;
  try {
    const exists = await chrome.offscreen.hasDocument();
    if (exists) {
      await chrome.offscreen.closeDocument();
    }
  } catch (err) {
    console.warn('Failed to close offscreen document', err);
  }
}
