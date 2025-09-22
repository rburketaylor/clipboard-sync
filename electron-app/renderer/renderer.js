const api = window.api;

const el = (id) => document.getElementById(id);
const backendUrlEl = el('backend-url');
const clipsEl = el('clips');
const statusEl = el('status');
const clipboardStatusEl = el('clipboard-status');
const sendClipboardBtn = el('send-clipboard-now');
const autoClipboardCheckbox = el('auto-clipboard');

backendUrlEl.textContent = api.backendUrl;

function setStatus(msg) {
  statusEl.textContent = msg;
}

function formatTime(timestamp) {
  try {
    return new Date(timestamp || Date.now()).toLocaleTimeString();
  } catch {
    return 'recently';
  }
}

let unsubscribeClipboard = null;
let watcherActive = false;
let autoClipboardEnabled = false;
let lastSyncedHash = '';

async function teardownClipboardWatch() {
  if (unsubscribeClipboard) {
    unsubscribeClipboard();
    unsubscribeClipboard = null;
  }
  if (watcherActive) {
    watcherActive = false;
    try {
      await api.stopClipboardWatch();
    } catch (err) {
      console.error('Failed stopping clipboard watch', err);
    }
  }
}

async function ensureClipboardWatch() {
  if (watcherActive) return;
  try {
    const response = await api.startClipboardWatch();
    watcherActive = true;
    clipboardStatusEl.textContent = 'Watching clipboard…';
    if (autoClipboardEnabled && response?.hash) {
      await maybeSendClipboard(response, { viaAuto: true, allowDuplicate: false });
    }
    if (!unsubscribeClipboard) {
      unsubscribeClipboard = api.onClipboardChanged(async payload => {
        clipboardStatusEl.textContent = `Clipboard updated ${formatTime(payload?.timestamp)}`;
        if (autoClipboardEnabled) {
          await maybeSendClipboard(payload, { viaAuto: true });
        }
      });
    }
  } catch (err) {
    console.error('Clipboard watch failed', err);
    clipboardStatusEl.textContent = `Clipboard watch failed: ${err.message}`;
    autoClipboardCheckbox.checked = false;
    autoClipboardEnabled = false;
    await teardownClipboardWatch();
  }
}

async function maybeSendClipboard(snapshot, { viaAuto = false, allowDuplicate = false } = {}) {
  if (!snapshot) {
    setStatus('Clipboard is empty');
    return false;
  }

  const text = (snapshot.text ?? '').trim();
  const hash = snapshot.hash ?? `manual:${text}`;

  if (!text) {
    if (!viaAuto) {
      setStatus('Clipboard is empty');
      clipboardStatusEl.textContent = 'Clipboard empty';
    }
    return false;
  }

  if (!allowDuplicate && hash && hash === lastSyncedHash) {
    if (viaAuto) {
      clipboardStatusEl.textContent = 'Clipboard already synced';
    }
    return false;
  }

  try {
    setStatus(viaAuto ? 'Syncing clipboard…' : 'Sending clipboard…');
    await api.createClip({ type: 'text', content: text, title: null });
    lastSyncedHash = hash;
    const statusLabel = viaAuto ? 'Clipboard synced automatically' : 'Clipboard sent';
    clipboardStatusEl.textContent = `${statusLabel} at ${formatTime(snapshot.timestamp)}`;
    await loadClips();
    setStatus(statusLabel);
    return true;
  } catch (err) {
    console.error('Error sending clipboard', err);
    const message = err?.message || 'Unknown error';
    setStatus(`Error sending clipboard: ${message}`);
    clipboardStatusEl.textContent = `Error syncing clipboard: ${message}`;
    if (viaAuto) {
      autoClipboardCheckbox.checked = false;
      autoClipboardEnabled = false;
      await teardownClipboardWatch();
    }
    return false;
  }
}

async function loadClips() {
  try {
    setStatus('Loading…');
    const clips = await api.getClips(10);
    clipsEl.innerHTML = '';
    for (const c of clips) {
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="clip-grid">
          <div style="min-width:0">
            <div class="row" style="gap:8px; min-width:0; flex-wrap:wrap">
              <span class="badge">${c.type}</span>
              <strong style="min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:inline-block; max-width:40ch">${c.title || '(untitled)'}</strong>
              <span class="muted">${c.created_at || ''}</span>
            </div>
            <div class="muted content-wrap">${c.content}</div>
          </div>
          <div class="actions">
            <button class="copy">Copy</button>
            <button class="delete" aria-label="Delete clip">Delete</button>
          </div>
        </div>`;
      li.querySelector('.copy').addEventListener('click', async () => {
        try {
          await api.writeClipboardText(c.content);
          setStatus('Copied to clipboard');
        } catch (err) {
          console.error(err);
          setStatus(`Failed to copy: ${err.message}`);
        }
      });
      li.querySelector('.delete').addEventListener('click', async () => {
        try {
          setStatus('Deleting…');
          await api.deleteClip(c.id);
          await loadClips();
          setStatus('Clip removed');
        } catch (e) {
          console.error(e);
          setStatus(`Error deleting clip: ${e.message}`);
        }
      });
      clipsEl.appendChild(li);
    }
    setStatus(`Loaded ${clips.length} clips`);
  } catch (e) {
    console.error(e);
    setStatus(`Error loading clips: ${e.message}`);
  }
}

async function createClipFromInputs() {
  const type = el('type').value;
  const content = el('content').value.trim();
  const title = el('title').value.trim() || null;
  if (!content) return setStatus('Content is required');
  try {
    setStatus('Creating…');
    await api.createClip({ type, content, title });
    el('content').value = '';
    el('title').value = '';
    await loadClips();
    setStatus('Clip created');
  } catch (e) {
    console.error(e);
    setStatus(`Error creating clip: ${e.message}`);
  }
}

el('refresh').addEventListener('click', loadClips);
el('create').addEventListener('click', createClipFromInputs);
el('from-clipboard').addEventListener('click', async () => {
  const text = await api.readClipboardText();
  if (text) {
    el('content').value = text;
    setStatus('Pasted current clipboard');
  } else {
    setStatus('Clipboard is empty');
  }
});

sendClipboardBtn.addEventListener('click', async () => {
  const snapshot = await api.readClipboardSnapshot();
  await maybeSendClipboard(snapshot, { viaAuto: false, allowDuplicate: true });
});

autoClipboardCheckbox.addEventListener('change', async (event) => {
  autoClipboardEnabled = event.target.checked;
  if (autoClipboardEnabled) {
    await ensureClipboardWatch();
  } else {
    clipboardStatusEl.textContent = 'Clipboard idle';
    await teardownClipboardWatch();
  }
});

window.addEventListener('beforeunload', () => {
  autoClipboardEnabled = false;
  void teardownClipboardWatch();
});

loadClips();
