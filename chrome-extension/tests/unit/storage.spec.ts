import { describe, it, expect } from 'vitest';
import { getConfig, setConfig, defaultConfig } from '../../src/shared/storage';

describe('storage config', () => {
  it('returns defaults when storage is empty', async () => {
    const cfg = await getConfig();
    expect(cfg).toEqual(defaultConfig);
  });

  it('persists and reads config values', async () => {
    await setConfig({ backendBaseUrl: 'http://localhost:9999', debug: true });
    const cfg = await getConfig();
    expect(cfg.backendBaseUrl).toBe('http://localhost:9999');
    expect(cfg.debug).toBe(true);
  });
});
