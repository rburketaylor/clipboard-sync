import { createApp, ref, onMounted } from 'vue';
import { getConfig, setConfig, defaultConfig } from '../shared/storage';

export const OptionsApp = {
  setup() {
    const backendBaseUrl = ref('');
    const debug = ref(false);
    const saved = ref('');

    onMounted(async () => {
      const cfg = await getConfig();
      backendBaseUrl.value = cfg.backendBaseUrl ?? defaultConfig.backendBaseUrl;
      debug.value = !!cfg.debug;
    });

    async function save() {
      await setConfig({ backendBaseUrl: backendBaseUrl.value, debug: debug.value });
      saved.value = 'Saved!';
      setTimeout(() => (saved.value = ''), 1500);
    }

    async function testConnection() {
      const res = await chrome.runtime.sendMessage({ kind: 'testConnection' });
      saved.value = res?.ok ? 'Connection OK' : 'Connection failed';
      setTimeout(() => (saved.value = ''), 1500);
    }

    return { backendBaseUrl, debug, save, saved, testConnection };
  },
  template: `
  <div style="max-width:420px;">
    <h2>Clipboard Sync — Options</h2>
    <p style="color:#555;">This extension now talks to the Clipboard Sync desktop app using Chrome native messaging. The desktop app forwards requests to the backend API.</p>

    <div style="margin-bottom:12px;">
      <label style="display:block; font-weight:600; margin-bottom:4px;">Backend Base URL</label>
      <input v-model="backendBaseUrl" placeholder="http://localhost:8000" style="width:100%; padding:6px 8px;" />
      <p class="muted" style="margin:6px 0 0; color:#777; font-size:12px;">The native host submits clips to this endpoint.</p>
    </div>

    <div style="margin-bottom:12px;">
      <label style="display:flex; align-items:center; gap:6px;">
        <input type="checkbox" v-model="debug" /> Enable debug logging
      </label>
    </div>

    <div>
      <button @click="save">Save</button>
      <button style="margin-left:8px;" @click="testConnection">Test Connection</button>
      <span style="margin-left:8px; color:#0a7; font-weight:600;">{{ saved }}</span>
    </div>
  </div>
  `
};

if (typeof document !== 'undefined' && document.getElementById('app')) {
  createApp(OptionsApp).mount('#app');
}
