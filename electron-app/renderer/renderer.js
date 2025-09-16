const api = window.api;

const el = (id) => document.getElementById(id);
const backendUrlEl = el('backend-url');
const clipsEl = el('clips');
const statusEl = el('status');

backendUrlEl.textContent = api.backendUrl;

function setStatus(msg) {
  statusEl.textContent = msg;
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
          </div>
        </div>`;
      li.querySelector('.copy').addEventListener('click', () => {
        api.writeClipboardText(c.content);
        setStatus('Copied to clipboard');
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
  const text = api.readClipboardText();
  if (text) {
    el('content').value = text;
    setStatus('Pasted current clipboard');
  } else {
    setStatus('Clipboard is empty');
  }
});

loadClips();
