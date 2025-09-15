(() => {
  try {
    return { href: location.href, title: document.title };
  } catch (e) {
    return { href: '', title: '' };
  }
})();

