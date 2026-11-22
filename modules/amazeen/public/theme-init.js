// Applies the saved Day/Night edition before first paint (no flash of the wrong theme).
// Loaded as a blocking classic script; mirrors src/lib/theme.ts. Kept tiny on purpose.
(function () {
  var pref = 'system';
  try {
    var saved = localStorage.getItem('amazeen:theme');
    if (saved === 'light' || saved === 'dark') pref = saved;
  } catch {
    /* storage blocked: follow the system */
  }
  var dark = pref === 'dark' || (pref === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  var root = document.documentElement;
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  root.style.colorScheme = dark ? 'dark' : 'light';
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#070605' : '#15130f');
})();
