import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import Popup from '../../src/popup/Popup.vue';
import { nextTick } from 'vue';

describe('Popup.vue', () => {
  let sendMessageMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendMessageMock = vi.fn(async (msg: any) => {
      if (msg.kind === 'popupOpened') {
        return { selection: 'hello world', tabMeta: { href: 'https://example.com', title: 'Example' } };
      }
      if (msg.kind === 'sendClip') {
        return { ok: true };
      }
      return {};
    });
    (global as any).chrome.runtime.sendMessage = sendMessageMock;
    (global as any).chrome.runtime.openOptionsPage = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders selection and tab meta on mount', async () => {
    const wrapper = mount(Popup);
    await nextTick();
    await new Promise(r => setTimeout(r, 0));
    expect(wrapper.text()).toContain('hello world');
    expect(wrapper.text()).toContain('Example');
  });

  it('sends text when clicking Send Text', async () => {
    const wrapper = mount(Popup);
    await nextTick();
    await new Promise(r => setTimeout(r, 0));
    const btn = wrapper.findAll('button')[0];
    expect(btn.attributes('disabled')).toBeUndefined();
    await btn.trigger('click');
    expect((global as any).chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'sendClip', payload: expect.objectContaining({ type: 'text' }) })
    );
  });

  it('disables URL sending when active tab URL is unsupported', async () => {
    sendMessageMock.mockImplementation(async (msg: any) => {
      if (msg.kind === 'popupOpened') {
        return { selection: 'text', tabMeta: { href: 'ftp://example.com', title: 'FTP' } };
      }
      return { ok: true };
    });

    const wrapper = mount(Popup);
    await nextTick();
    await new Promise(r => setTimeout(r, 0));

    const buttons = wrapper.findAll('button');
    expect(buttons[1].attributes('disabled')).toBe('');
  });

  it('shows error message when sending fails', async () => {
    sendMessageMock.mockImplementation(async (msg: any) => {
      if (msg.kind === 'popupOpened') {
        return { selection: 'text', tabMeta: { href: 'https://example.com', title: 'Example' } };
      }
      if (msg.kind === 'sendClip') {
        return { ok: false, error: 'backend down' };
      }
      return {};
    });

    const wrapper = mount(Popup);
    await nextTick();
    await new Promise(r => setTimeout(r, 0));

    await wrapper.findAll('button')[0].trigger('click');
    await nextTick();

    expect(wrapper.text()).toContain('backend down');
  });

  it('opens options page via link', async () => {
    const wrapper = mount(Popup);
    await nextTick();
    await new Promise(r => setTimeout(r, 0));

    await wrapper.find('a').trigger('click.prevent');
    expect((global as any).chrome.runtime.openOptionsPage).toHaveBeenCalled();
  });

  it('shows busy state while sending', async () => {
    let resolveSend: (() => void) | null = null;
    sendMessageMock.mockImplementation(async (msg: any) => {
      if (msg.kind === 'popupOpened') {
        return { selection: 'text', tabMeta: { href: 'https://example.com', title: 'Example' } };
      }
      if (msg.kind === 'sendClip') {
        return new Promise(resolve => {
          resolveSend = () => resolve({ ok: true });
        });
      }
      return {};
    });

    const wrapper = mount(Popup);
    await nextTick();
    await new Promise(r => setTimeout(r, 0));

    const [textButton, urlButton] = wrapper.findAll('button');
    await textButton.trigger('click');
    await nextTick();

    expect(textButton.text()).toBe('Sending…');
    expect(urlButton.attributes('disabled')).toBe('');

    resolveSend?.();
    await nextTick();
    await new Promise(r => setTimeout(r, 0));
    expect(textButton.text()).toBe('Send Text');
  });
});
