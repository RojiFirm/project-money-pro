/**
 * core/router.js
 * ------------------------------------------------------------
 * Minimal hash router. Each route points at a page fragment
 * (HTML), an optional stylesheet, and a JS module that exports
 * an init(container) function. Routes are declared in app.js.
 * ------------------------------------------------------------
 */

const routes = new Map();
const loadedStyles = new Set();
let currentCleanup = null;
let outlet = null;

export function registerRoute(path, config) {
  routes.set(path, config);
}

export function initRouter(outletEl) {
  outlet = outletEl;
  window.addEventListener('hashchange', renderCurrentRoute);
  renderCurrentRoute();
}

export function navigate(path) {
  window.location.hash = path;
}

function currentPath() {
  const hash = window.location.hash.replace(/^#/, '');
  return hash || '/dashboard';
}

async function renderCurrentRoute() {
  const path = currentPath();
  const route = routes.get(path) || routes.get('/dashboard');
  if (!route) return;

  if (typeof currentCleanup === 'function') {
    try { currentCleanup(); } catch (_) { /* ignore */ }
    currentCleanup = null;
  }

  highlightNav(path);

  outlet.innerHTML = '<div class="route-loading eyebrow">Loading…</div>';

  if (route.css && !loadedStyles.has(route.css)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = route.css;
    document.head.appendChild(link);
    loadedStyles.add(route.css);
  }

  const html = await fetch(route.html).then((r) => r.text());
  outlet.innerHTML = html;

  const mod = await import(route.js);
  currentCleanup = await mod.init(outlet);
}

function highlightNav(path) {
  document.querySelectorAll('[data-route]').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('data-route') === path);
  });
}
