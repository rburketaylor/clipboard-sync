import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';

const getConfig = vi.fn();
const setConfig = vi.fn();

vi.mock('../../src/shared/storage', () => ({
  getConfig,
  setConfig,
  defaultConfig: { backendBaseUrl: 'http://localhost:8000', debug: false }
}));

async function flush() {
  await nextTick();
  await new Promise(resolve => setTimeout(resolve, 0));
}

describe('options page', () => {
  beforeEach(() => {
    vi.resetModules();
    getConfig.mockReset();
    setConfig.mockReset();
    (global as any).chrome.runtime.sendMessage = vi.fn().mockResolvedValue({ ok: true });
  });

  it('loads saved configuration on mount', async () => {
    getConfig.mockResolvedValue({ backendBaseUrl: 'http://api.test', debug: true });
    const { OptionsApp } = await import('../../src/options/main');

    const wrapper = mount(OptionsApp);
    await flush();

    const input = wrapper.find('input');
    const checkbox = wrapper.find('input[type="checkbox"]');

    expect(input.exists()).toBe(true);
    expect(checkbox.exists()).toBe(true);
    expect((input.element as HTMLInputElement).value).toBe('http://api.test');
    expect((checkbox.element as HTMLInputElement).checked).toBe(true);
  });

  it('persists configuration when Save is clicked', async () => {
    getConfig.mockResolvedValue({ backendBaseUrl: 'http://api.test', debug: false });
    setConfig.mockResolvedValue(undefined);
    const { OptionsApp } = await import('../../src/options/main');

    const wrapper = mount(OptionsApp);
    await flush();

    const input = wrapper.find('input');
    const checkbox = wrapper.find('input[type="checkbox"]');

    await input.setValue('http://changed');
    await checkbox.setValue(true);

    await wrapper.findAll('button')[0].trigger('click');
    await flush();

    expect(setConfig).toHaveBeenCalledWith({ backendBaseUrl: 'http://changed', debug: true });
    expect(wrapper.text()).toContain('Saved!');
  });

  it('displays connection status when Test Connection runs', async () => {
    getConfig.mockResolvedValue({ backendBaseUrl: 'http://api.test', debug: false });
    const sendMessage = vi.fn().mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false });
    (global as any).chrome.runtime.sendMessage = sendMessage;

    const { OptionsApp } = await import('../../src/options/main');
    const wrapper = mount(OptionsApp);
    await flush();

    const testButton = wrapper.findAll('button')[1];

    await testButton.trigger('click');
    await flush();
    expect(wrapper.text()).toContain('Connection OK');

    await testButton.trigger('click');
    await flush();
    expect(wrapper.text()).toContain('Connection failed');
  });
});
