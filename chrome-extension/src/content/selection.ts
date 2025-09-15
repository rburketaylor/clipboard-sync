(() => {
  try {
    const sel = window.getSelection?.();
    const text = sel ? String(sel) : '';
    return text?.trim() || '';
  } catch {
    return '';
  }
})();
