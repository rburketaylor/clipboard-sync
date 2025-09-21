// Basic chrome API mock for tests
// Only the pieces we use in unit tests are mocked here.
// Tests can further stub behavior as needed.
// @ts-ignore
const memoryStore: Record<string, any> = {};

// @ts-ignore
global.chrome = {
  runtime: {
    sendMessage: (_msg: any) => Promise.resolve({ ok: true }),
    onMessage: {
      addListener: (_cb: any) => {}
    },
    openOptionsPage: () => {},
    connectNative: () => ({
      onDisconnect: { addListener: () => {} },
      onMessage: { addListener: () => {} },
      postMessage: () => {}
    }),
    lastError: null
  },
  tabs: {
    query: async () => [{ id: 1 }]
  },
  scripting: {
    executeScript: async () => []
  },
  storage: {
    local: {
      get: async (keys?: string[] | Record<string, any>) => {
        if (!keys) return { ...memoryStore };
        if (Array.isArray(keys)) {
          const out: Record<string, any> = {};
          for (const k of keys) if (k in memoryStore) out[k] = memoryStore[k];
          return out;
        }
        // keys as object with defaults
        const out: Record<string, any> = { ...keys };
        for (const k of Object.keys(keys)) if (k in memoryStore) out[k] = memoryStore[k];
        return out;
      },
      set: async (obj: Record<string, any>) => {
        Object.assign(memoryStore, obj);
      }
    }
  }
} as any;
