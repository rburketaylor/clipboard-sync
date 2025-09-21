/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, getByText } from '@testing-library/dom';

function buildDom() {
  document.body.innerHTML = `
    <div>
      <span id="backend-url"></span>
      <div id="status"></div>
      <ul id="clips"></ul>
      <select id="type"><option value="text">Text</option></select>
      <textarea id="content"></textarea>
      <input id="title" />
      <button id="refresh"></button>
      <button id="create"></button>
      <button id="from-clipboard"></button>
    </div>
  `;
}

function flush() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

describe('renderer UI', () => {
  let api: any;

  beforeEach(async () => {
    vi.resetModules();
    buildDom();
    api = {
      backendUrl: 'http://backend',
      getClips: vi.fn().mockResolvedValue([
        { id: 1, type: 'text', title: 'First', content: 'hello', created_at: 'now' }
      ]),
      createClip: vi.fn(),
      deleteClip: vi.fn().mockResolvedValue(undefined),
      writeClipboardText: vi.fn(),
      readClipboardText: vi.fn().mockReturnValue('clip text')
    };
    (window as any).api = api;
    await import('../../renderer/renderer.js');
    await flush();
  });

  it('renders backend URL and initial clips', () => {
    expect(document.getElementById('backend-url')?.textContent).toBe('http://backend');
    expect(api.getClips).toHaveBeenCalled();
    expect(document.querySelectorAll('#clips li').length).toBe(1);
  });

  it('validates content before creating a clip', async () => {
    const createButton = document.getElementById('create') as HTMLButtonElement;
    fireEvent.click(createButton);
    await flush();
    expect(document.getElementById('status')?.textContent).toBe('Content is required');

    const content = document.getElementById('content') as HTMLTextAreaElement;
    content.value = 'new clip';
    content.dispatchEvent(new Event('input'));
    fireEvent.click(createButton);
    await flush();
    expect(api.createClip).toHaveBeenCalledWith({ type: 'text', content: 'new clip', title: null });
  });

  it('copies clip content via copy button', async () => {
    await flush();
    const copyButton = getByText(document.body, 'Copy');
    fireEvent.click(copyButton);
    expect(api.writeClipboardText).toHaveBeenCalledWith('hello');
  });

  it('deletes a clip and refreshes the list', async () => {
    await flush();
    const deleteButton = getByText(document.body, 'Delete');
    api.getClips.mockResolvedValueOnce([]);
    fireEvent.click(deleteButton);
    await flush();
    expect(api.deleteClip).toHaveBeenCalledWith(1);
    expect(api.getClips).toHaveBeenCalledTimes(2);
  });
});
