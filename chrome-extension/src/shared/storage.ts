export type TransportMode = 'http' | 'native' | 'ws';

export interface ExtensionConfig {
  mode: TransportMode;
  backendBaseUrl: string;
  wsUrl: string;
  debug: boolean;
}

export const defaultConfig: ExtensionConfig = {
  mode: 'http',
  backendBaseUrl: 'http://localhost:8000',
  wsUrl: 'ws://127.0.0.1:17373',
  debug: false
};

export async function getConfig(): Promise<ExtensionConfig> {
  const data = await chrome.storage.local.get(Object.keys(defaultConfig));
  return { ...defaultConfig, ...(data as Partial<ExtensionConfig>) };
}

export async function setConfig(cfg: Partial<ExtensionConfig>): Promise<void> {
  await chrome.storage.local.set(cfg);
}

