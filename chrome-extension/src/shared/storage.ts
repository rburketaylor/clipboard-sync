export interface ExtensionConfig {
  backendBaseUrl: string;
  debug: boolean;
}

export const defaultConfig: ExtensionConfig = {
  backendBaseUrl: 'http://localhost:8000',
  debug: false
};

export async function getConfig(): Promise<ExtensionConfig> {
  const data = await chrome.storage.local.get(Object.keys(defaultConfig));
  return { ...defaultConfig, ...(data as Partial<ExtensionConfig>) };
}

export async function setConfig(cfg: Partial<ExtensionConfig>): Promise<void> {
  await chrome.storage.local.set(cfg);
}
