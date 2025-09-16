(() => {
  try {
    // 1) Standard DOM selection (works for most pages and contenteditable)
    const sel = window.getSelection?.();
    let text = sel ? String(sel) : '';

    // 2) Fallback: selections inside <input>/<textarea>
    if (!text) {
      const ae = document.activeElement as HTMLElement | null;
      if (ae) {
        const tag = (ae.tagName || '').toUpperCase();
        const isInput = tag === 'INPUT' || tag === 'TEXTAREA';
        if (isInput) {
          const el = ae as HTMLInputElement | HTMLTextAreaElement;
          const start = (el.selectionStart ?? 0) as number;
          const end = (el.selectionEnd ?? 0) as number;
          if (typeof el.value === 'string' && end > start) {
            text = el.value.slice(start, end);
          }
        }
      }
    }

    return (text || '').trim();
  } catch {
    return '';
  }
})();
