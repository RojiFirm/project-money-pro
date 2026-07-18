/**
 * core/utils.js — formatting & small shared helpers
 */

export function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
  const value = Number(amount || 0);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDate(dateStr, opts = {}) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: '2-digit', ...opts,
  }).format(d);
}

export function formatPercent(value, decimals = 1) {
  return `${Number(value || 0).toFixed(decimals)}%`;
}

export function signedClass(value) {
  return Number(value) < 0 ? 'negative' : 'positive';
}

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

export function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export function required(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    throw new Error(`${fieldName} is required`);
  }
  return value;
}

export function toast(message, tone = 'info') {
  const container = document.getElementById('toast-root') || createToastRoot();
  const node = document.createElement('div');
  node.className = `toast toast-${tone}`;
  node.textContent = message;
  container.appendChild(node);
  requestAnimationFrame(() => node.classList.add('visible'));
  setTimeout(() => {
    node.classList.remove('visible');
    setTimeout(() => node.remove(), 200);
  }, 3200);
}

function createToastRoot() {
  const root = document.createElement('div');
  root.id = 'toast-root';
  document.body.appendChild(root);
  return root;
}
