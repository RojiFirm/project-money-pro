/**
 * components/sidebar/sidebar.js
 * Numbering reflects the app's real build/data-flow order from
 * the project spec: Settings → Accounts → Transactions & Transfers
 * → Liabilities → Assets → Savings → Dashboards.
 */
const NAV_ITEMS = [
  { idx: '01', label: 'Settings', route: '/settings' },
  { idx: '02', label: 'Accounts', route: '/accounts' },
  { idx: '03', label: 'Transactions', route: '/transactions' },
  { idx: '03', label: 'Transfers', route: '/transfer' },
  { idx: '04', label: 'Liabilities', route: '/liabilities' },
  { idx: '05', label: 'Assets', route: '/assets' },
  { idx: '06', label: 'Savings', route: '/savings' },
  { idx: '07', label: 'Dashboard', route: '/dashboard' },
];

export function renderSidebar(container) {
  container.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="mark">Money PRO</div>
        <div class="tagline">Ledger &amp; Analytics</div>
      </div>
      <nav class="sidebar-nav">
        ${NAV_ITEMS.map(
          (item) => `
          <a href="#${item.route}" data-route="${item.route}">
            <span class="idx">${item.idx}</span>
            <span>${item.label}</span>
          </a>`
        ).join('')}
      </nav>
      <div class="sidebar-foot">v1.0 · Supabase</div>
    </aside>
  `;
}
