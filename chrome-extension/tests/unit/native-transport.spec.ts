import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let messageListener: ((message: any) => void) | null = null;
let disconnectListener: (() => void) | null = null;
let postMessage: ReturnType<typeof vi.fn>;

function setupPort() {
  messageListener = null;
  disconnectListener = null;
  postMessage = vi.fn();

  (global as any).chrome.runtime.connectNative = vi.fn(() => ({
    onDisconnect: {
      addListener: (cb: () => void) => {
        disconnectListener = cb;
      }
    },
    onMessage: {
      addListener: (cb: (message: any) => void) => {
        messageListener = cb;
      }
    },
    postMessage
  }));
  (global as any).chrome.runtime.lastError = null;
}

describe('native transport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    setupPort();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('resolves when native host responds with ok', async () => {
    const { sendViaNative } = await import('../../src/background/transports/native');

    const promise = sendViaNative({ type: 'text', content: 'hello' });
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'clip', requestId: 1 })
    );

    messageListener?.({ requestId: 1, ok: true });

    await expect(promise).resolves.toBeUndefined();
  });

  it('rejects when native host returns an error', async () => {
    const { sendViaNative } = await import('../../src/background/transports/native');

    const promise = sendViaNative({ type: 'text', content: 'hello' });
    messageListener?.({ requestId: 1, ok: false, error: 'nope' });

    await expect(promise).rejects.toThrow('nope');
  });

  it('rejects when request times out', async () => {
    const { sendViaNative } = await import('../../src/background/transports/native');

    const invocation = sendViaNative({ type: 'text', content: 'slow' });
    invocation.catch(() => {});
    await vi.advanceTimersByTimeAsync(5000);

    await expect(invocation).rejects.toThrow('timed out');
    await vi.runAllTimersAsync();
  });

  it('rejects pending requests when port disconnects', async () => {
    const { sendViaNative } = await import('../../src/background/transports/native');

    const promise = sendViaNative({ type: 'text', content: 'disconnect' });
    disconnectListener?.();

    await expect(promise).rejects.toThrow('Native messaging host disconnected');
  });

  it('pingViaNative returns false when request fails', async () => {
    const { pingViaNative } = await import('../../src/background/transports/native');

    const promise = pingViaNative();
    await vi.advanceTimersByTimeAsync(2000);

    expect(await promise).toBe(false);
  });
});
