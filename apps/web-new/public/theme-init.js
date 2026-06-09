(function () {
  try {
    var s = localStorage.getItem('theme-storage');
    var t = s ? JSON.parse(s).state?.theme : null;
    var dark =
      t === 'dark' ||
      (!t || t === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
  } catch (_) {}
})();
