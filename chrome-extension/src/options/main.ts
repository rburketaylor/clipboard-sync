import { createApp, ref, onMounted } from 'vue';
import { getConfig, setConfig, defaultConfig } from '../shared/storage';

const App = {
  setup() {
    const backendBaseUrl = ref('');
    const mode = ref<'http' | 'native' | 'ws'>('http');
    const wsUrl = ref('ws://127.0.0.1:17373');
    const debug = ref(false);
    const saved = ref('');

    onMounted(async () => {
      const cfg = await getConfig();
      backendBaseUrl.value = cfg.backendBaseUrl ?? defaultConfig.backendBaseUrl;
      mode.value = (cfg.mode as any) ?? defaultConfig.mode;
      wsUrl.value = cfg.wsUrl ?? defaultConfig.wsUrl;
      debug.value = !!cfg.debug;
    });

    async function save() {
      await setConfig({ backendBaseUrl: backendBaseUrl.value, mode: mode.value, wsUrl: wsUrl.value, debug: debug.value });
      saved.value = 'Saved!';
      setTimeout(() => (saved.value = ''), 1500);
    }

    return { backendBaseUrl, mode, wsUrl, debug, save, saved };
  },
  template: `
  <div>
    <h2>Clipboard Sync — Options</h2>
    <p>Configure transport and endpoints used by the extension.</p>

    <div style="margin-bottom:12px;">
      <label>Transport Mode</label><br/>
      <select v-model="mode">
        <option value="http">HTTP (backend direct)</option>
        <option value="native" disabled>Native (Electron) — coming soon</option>
        <option value="ws" disabled>WebSocket (Electron) — coming soon</option>
      </select>
    </div>

    <div style="margin-bottom:12px;">
      <label>Backend Base URL</label>
      <input v-model="backendBaseUrl" placeholder="http://localhost:8000" />
    </div>

    <div style="margin-bottom:12px;">
      <label>WS URL</label>
      <input v-model="wsUrl" placeholder="ws://127.0.0.1:17373" />
      <p class="muted">Used when mode is WebSocket.</p>
    </div>

    <div style="margin-bottom:12px;">
      <label><input type="checkbox" v-model="debug" /> Enable debug logging</label>
    </div>

    <button @click="save">Save</button>
    <span style="margin-left:8px; color:#0a7;">{{ saved }}</span>
  </div>
  `
};

createApp(App).mount('#app');

