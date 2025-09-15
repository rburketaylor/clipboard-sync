import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import Popup from '../../src/popup/Popup.vue';
import { nextTick } from 'vue';

describe('Popup.vue', () => {
  beforeEach(() => {
    // mock sendMessage behavior
    (global as any).chrome.runtime.sendMessage = vi.fn(async (msg: any) => {
      if (msg.kind === 'popupOpened') {
        return { selection: 'hello world', tabMeta: { href: 'https://example.com', title: 'Example' } };
      }
      if (msg.kind === 'sendClip') {
        return { ok: true };
      }
      return {};
    });
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
});
