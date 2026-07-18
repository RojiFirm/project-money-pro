/**
 * components/navbar/navbar.js
 * Renders a slim date strip. Page-specific titles live in each
 * page's own header (see each page's html file) so the topbar stays
 * a shared, content-agnostic shell element.
 */
export function renderNavbar(container) {
  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  }).format(new Date());

  container.innerHTML = `
    <div class="topbar">
      <span class="eyebrow">Project Money PRO</span>
      <span class="date">${today}</span>
    </div>
  `;
}
