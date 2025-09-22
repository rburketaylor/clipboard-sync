import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: vi.fn() },
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn()
  }
}));

describe('preload HTTP helper', () => {
  let preload: any;

  beforeEach(async () => {
    vi.resetModules();
    preload = await import('../../preload.js');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns parsed JSON for successful responses', async () => {
    vi.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: 123 })
    });

    const result = await preload.http('/clips');
    expect(result).toEqual({ data: 123 });
  });

  it('returns undefined for 204 responses', async () => {
    vi.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, status: 204, json: () => Promise.resolve() });

    const result = await preload.http('/clip/1', { method: 'DELETE' });
    expect(result).toBeUndefined();
  });

  it('throws on non-ok responses', async () => {
    vi.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) });

    await expect(preload.http('/clip', { method: 'POST' })).rejects.toThrow('Request failed: 500');
  });
});
