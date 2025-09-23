import { beforeEach, describe, expect, it, vi } from 'vitest';

const listeners: Array<(msg: any, sender: any, sendResponse: (res: any) => void) => boolean> = [];

vi.mock('../../src/shared/storage', () => ({
  getConfig: vi.fn(async () => ({ backendBaseUrl: 'http://localhost:8000' }))
}));

const sendViaNative = vi.fn(async () => {});
const pingViaNative = vi.fn(async () => true);
const readClipboardFromOffscreen = vi.fn(async () => ({
  text: 'clipboard text',
  mimeType: 'text/plain'
}));
const teardownOffscreenIfIdle = vi.fn(async () => {});

vi.mock('../../src/background/transports/native', () => ({
  sendViaNative,
  pingViaNative
}));

vi.mock('../../src/background/offscreen-manager', () => ({
  readClipboardFromOffscreen,
  teardownOffscreenIfIdle
}));

async function loadBackground() {
  await import('../../src/background/index');
  return listeners[0];
}

function invokeListener(message: any) {
  const listener = listeners[0];
  return new Promise((resolve) => {
    listener(message, {}, (response: any) => resolve(response));
  });
}

describe('background message router', () => {
  beforeEach(() => {
    vi.resetModules();
    listeners.length = 0;
    sendViaNative.mockClear();
    pingViaNative.mockClear();
    readClipboardFromOffscreen.mockReset();
    teardownOffscreenIfIdle.mockReset();

    (global as any).chrome.runtime.onMessage.addListener = vi.fn((cb: any) => {
      listeners.push(cb);
    });

    (global as any).chrome.tabs.query = vi.fn(async () => [{ id: 99 }]);
    (global as any).chrome.commands = {
      onCommand: {
        addListener: vi.fn()
      }
    };
  });

  it('responds to popupOpened with selection and tab meta', async () => {
    const executeScript = vi
      .fn()
      .mockResolvedValueOnce([{ result: '  selection text  ' }, { result: '' }])
      .mockResolvedValueOnce([{ result: { href: 'https://example.com', title: 'Example' } }]);
    (global as any).chrome.scripting.executeScript = executeScript;

    await loadBackground();

    const response: any = await invokeListener({ kind: 'popupOpened' });

    expect(response.selection).toBe('selection text');
    expect(response.tabMeta).toEqual({ href: 'https://example.com', title: 'Example' });
    expect(executeScript).toHaveBeenCalledTimes(2);
  });

  it('handles sendClip by delegating to native transport', async () => {
    (global as any).chrome.scripting.executeScript = vi.fn();
    await loadBackground();

    const payload = { kind: 'sendClip', payload: { type: 'text', content: 'hi' } };
    const response: any = await invokeListener(payload);

    expect(sendViaNative).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'text',
        content: 'hi',
        source: 'selection',
        mimeType: 'text/plain'
      }),
      expect.objectContaining({ backendBaseUrl: 'http://localhost:8000' })
    );
    expect(response).toEqual({ ok: true, error: undefined });
  });

  it('returns an error when sendClip payload is invalid', async () => {
    (global as any).chrome.scripting.executeScript = vi.fn();
    await loadBackground();

    const response: any = await invokeListener({ kind: 'sendClip', payload: { type: 'text' } });

    expect(sendViaNative).not.toHaveBeenCalled();
    expect(response.ok).toBe(false);
    expect(response.error).toBe('Invalid payload');
  });

  it('surfaces errors from native transport', async () => {
    (global as any).chrome.scripting.executeScript = vi.fn();
    sendViaNative.mockRejectedValueOnce(new Error('boom'));
    await loadBackground();

    const response: any = await invokeListener({
      kind: 'sendClip',
      payload: { type: 'text', content: 'x' }
    });

    expect(response.ok).toBe(false);
    expect(response.error).toBe('boom');
  });

  it('responds to testConnection using pingViaNative', async () => {
    (global as any).chrome.scripting.executeScript = vi.fn();
    pingViaNative.mockResolvedValueOnce(true);
    await loadBackground();

    const okResponse: any = await invokeListener({ kind: 'testConnection' });
    expect(okResponse).toEqual({ ok: true });

    pingViaNative.mockResolvedValueOnce(false);
    const failResponse: any = await invokeListener({ kind: 'testConnection' });
    expect(failResponse).toEqual({ ok: false });
  });

  it('reads clipboard when requested', async () => {
    (global as any).chrome.scripting.executeScript = vi.fn();
    readClipboardFromOffscreen.mockResolvedValueOnce({
      text: 'from clipboard',
      mimeType: 'text/plain'
    });
    await loadBackground();

    const response: any = await invokeListener({ kind: 'sendClip', source: 'clipboard' });

    expect(readClipboardFromOffscreen).toHaveBeenCalled();
    expect(sendViaNative).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'from clipboard', source: 'clipboard' }),
      expect.any(Object)
    );
    expect(teardownOffscreenIfIdle).toHaveBeenCalled();
    expect(response).toEqual({ ok: true, error: undefined });
  });

  it('returns error when clipboard read fails', async () => {
    (global as any).chrome.scripting.executeScript = vi.fn();
    readClipboardFromOffscreen.mockRejectedValueOnce(new Error('no access'));
    await loadBackground();

    const response: any = await invokeListener({ kind: 'sendClip', source: 'clipboard' });

    expect(response.ok).toBe(false);
    expect(response.error).toBe('no access');
  });
});
