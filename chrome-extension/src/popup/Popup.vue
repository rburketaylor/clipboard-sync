<template>
  <div>
    <h3 style="margin:0 0 8px;">Clipboard Sync</h3>
    <p class="muted" style="margin:0 0 12px;">Capture selection or page URL and send.</p>

    <section style="margin-bottom:10px;">
      <label class="muted">Selection</label>
      <pre style="white-space:pre-wrap; background:#f6f8fa; padding:8px; border-radius:6px; max-height:120px; overflow:auto;">{{ selection || 'No selection detected' }}</pre>
    </section>

    <section style="margin-bottom:10px;">
      <label class="muted">Active Tab</label>
      <div style="font-size:12px; color:#333;">
        <div><strong>Title:</strong> {{ tabMeta?.title || '—' }}</div>
        <div style="overflow:hidden; text-overflow:ellipsis;"><strong>URL:</strong> {{ tabMeta?.href || '—' }}</div>
      </div>
    </section>

    <div style="display:flex; gap:8px;">
      <button :disabled="!selection || busy" @click="send('text')">{{ busy ? 'Sending…' : 'Send Text' }}</button>
      <button :disabled="!urlAllowed || busy" @click="send('url')">{{ busy ? 'Sending…' : 'Send URL' }}</button>
    </div>

    <p v-if="message" :style="{color: messageOk ? '#0a7' : '#c00', marginTop: '10px', fontSize:'12px'}">{{ message }}</p>
    <p style="margin-top:12px;"><a href="#" @click.prevent="openOptions">Options</a></p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';

type TabMeta = { href: string; title: string } | null;

const selection = ref<string>('');
const tabMeta = ref<TabMeta>(null);
const busy = ref(false);
const message = ref('');
const messageOk = ref(false);
const urlAllowed = computed(() => {
  const href = tabMeta.value?.href || '';
  return /^https?:\/\//i.test(href);
});

function openOptions() {
  chrome.runtime.openOptionsPage();
}

async function send(kind: 'text' | 'url') {
  busy.value = true;
  message.value = '';
  try {
    const payload = kind === 'text'
      ? { type: 'text', content: selection.value, title: tabMeta.value?.title }
      : { type: 'url', content: tabMeta.value?.href, title: tabMeta.value?.title };

    const res = await chrome.runtime.sendMessage({ kind: 'sendClip', payload });
    messageOk.value = !!res?.ok;
    message.value = res?.ok ? 'Sent successfully' : (res?.error || 'Failed to send');
  } catch (err: any) {
    messageOk.value = false;
    message.value = err?.message || String(err);
  } finally {
    busy.value = false;
  }
}

onMounted(async () => {
  try {
    const res = await chrome.runtime.sendMessage({ kind: 'popupOpened' });
    selection.value = res?.selection || '';
    tabMeta.value = res?.tabMeta || null;
    if (res?.error) {
      messageOk.value = false;
      message.value = `Read error: ${res.error}`;
    }
  } catch (e) {
    // ignore
  }
});
</script>

<style scoped>
.muted { color: #666; font-size: 12px; }
button { padding: 6px 10px; border-radius: 6px; border: 1px solid #ccc; background: #fff; }
button:hover { background: #f3f4f6; }
button:disabled { opacity: .6; cursor: not-allowed; }
</style>
