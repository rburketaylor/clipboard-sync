import { afterEach, describe, expect, it, vi } from 'vitest';

import { pingViaHttp, sendViaHttp } from '../../src/background/transports/http';

const globalFetch = globalThis.fetch;

afterEach(() => {
  if (globalFetch) {
    globalThis.fetch = globalFetch;
  }
  vi.restoreAllMocks();
});

describe('HTTP transport helpers', () => {
  it('POSTs payloads to the /clip endpoint with trimmed base URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = mockFetch as any;

    await sendViaHttp('http://api.example.com/', { type: 'text', content: 'hi', title: undefined });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://api.example.com/clip',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws with status code details on failure', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('boom'), statusText: 'Server Error' });
    globalThis.fetch = mockFetch as any;

    await expect(sendViaHttp('http://api.example.com', { type: 'text', content: 'hi', title: undefined })).rejects.toThrow(
      'HTTP 500: boom'
    );
  });

  it('pingViaHttp returns false when fetch throws', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('network'));
    globalThis.fetch = mockFetch as any;

    const result = await pingViaHttp('http://api.example.com/');
    expect(result).toBe(false);
  });
});
