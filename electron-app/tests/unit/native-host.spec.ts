import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const native = require('../../native-host.js') as any;

function frame(message: Record<string, any>) {
  const payload = Buffer.from(JSON.stringify(message), 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(payload.length, 0);
  return Buffer.concat([header, payload]);
}

function decodeMessages(buffers: Buffer[]) {
  const combined = Buffer.concat(buffers);
  const messages: any[] = [];
  let offset = 0;
  while (offset + 4 <= combined.length) {
    const length = combined.readUInt32LE(offset);
    if (offset + 4 + length > combined.length) break;
    const data = combined.subarray(offset + 4, offset + 4 + length).toString('utf8');
    messages.push(JSON.parse(data));
    offset += 4 + length;
  }
  return messages;
}

describe('native-host message handling', () => {
  let writes: Buffer[];
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    native.resetStateForTests();
    writes = [];
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(chunk => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
      writes.push(buf);
      return true;
    });
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('parses framed stdin data and responds to ping', () => {
    const ping = frame({ kind: 'ping', requestId: 1 });

    native.appendChunk(ping.subarray(0, 5));
    native.processInputBuffer();
    expect(decodeMessages(writes)).toHaveLength(0);

    native.appendChunk(ping.subarray(5));
    native.processInputBuffer();

    const messages = decodeMessages(writes);
    expect(messages).toEqual([{ kind: 'pong', requestId: 1, ok: true }]);
  });

  it('sends success for clip messages when backend responds ok', async () => {
    vi.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, status: 200 });

    await native.handleMessage({ kind: 'clip', requestId: 2, payload: { type: 'text', content: 'hello' } });

    const messages = decodeMessages(writes);
    expect(messages).toEqual([{ kind: 'clipResult', requestId: 2, ok: true }]);
  });

  it('reports backend errors from clip handling', async () => {
    vi.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      text: () => Promise.resolve('boom')
    });

    await native.handleMessage({ kind: 'clip', requestId: 3, payload: { type: 'text', content: 'hello' } });

    const messages = decodeMessages(writes);
    expect(messages[0]).toMatchObject({ kind: 'error', requestId: 3, ok: false });
    expect(messages[0].error).toContain('500');
  });

  it('surfaces timeout errors when backend is unresponsive', async () => {
    vi.useFakeTimers();
    vi.spyOn(global, 'fetch' as any).mockImplementation((_url: string, options: any) => {
      const { signal } = options;
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          const err = new Error('aborted');
          (err as any).name = 'AbortError';
          reject(err);
        });
      });
    });

    const promise = native.handleMessage({
      kind: 'clip',
      requestId: 4,
      payload: { type: 'text', content: 'timeout' }
    });

    await vi.advanceTimersByTimeAsync(native.DEFAULT_TIMEOUT_MS + 1);
    await promise;

    const messages = decodeMessages(writes);
    expect(messages[0]).toEqual({ kind: 'error', requestId: 4, ok: false, error: 'Timed out contacting backend' });
    vi.useRealTimers();
  });
});
