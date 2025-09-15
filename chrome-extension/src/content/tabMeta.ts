(() => {
  try {
    return { href: location.href, title: document.title };
  } catch {
    return { href: '', title: '' };
  }
})();
