/**
 * components/modal/modal.js
 * Usage:
 *   import { openModal, closeModal } from '/components/modal/modal.js';
 *   openModal({ title: 'New Account', bodyHTML, onSubmit: async () => {...} });
 */
let stylesLoaded = false;

function ensureStyles() {
  if (stylesLoaded) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/components/modal/modal.css';
  document.head.appendChild(link);
  stylesLoaded = true;
}

export function openModal({ title, bodyHTML, submitLabel = 'Save', onSubmit }) {
  ensureStyles();
  closeModal();

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.id = 'active-modal';
  backdrop.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="modal-head">
        <h3>${title}</h3>
        <button class="modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="modal-body">${bodyHTML}</div>
      <div class="modal-foot">
        <button class="btn" data-action="cancel">Cancel</button>
        <button class="btn btn-primary" data-action="submit">${submitLabel}</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('visible'));

  backdrop.querySelector('.modal-close').addEventListener('click', closeModal);
  backdrop.querySelector('[data-action="cancel"]').addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });

  backdrop.querySelector('[data-action="submit"]').addEventListener('click', async (e) => {
    if (typeof onSubmit !== 'function') return closeModal();
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      await onSubmit(backdrop);
      closeModal();
    } catch (err) {
      btn.disabled = false;
      alert(err.message || 'Something went wrong. Check the form and try again.');
    }
  });

  return backdrop;
}

export function closeModal() {
  const existing = document.getElementById('active-modal');
  if (existing) existing.remove();
}
