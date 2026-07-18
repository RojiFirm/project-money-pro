import { db } from '../../core/database.js';
import { required, toast } from '../../core/utils.js';

const LOOKUP_SERVICES = {
  categories: { service: db.categories, label: 'Category', placeholder: 'e.g. Groceries' },
  account_types: { service: db.accountTypes, label: 'Account Type', placeholder: 'e.g. Bank' },
  liability_types: { service: db.liabilityTypes, label: 'Liability Type', placeholder: 'e.g. Mortgage' },
  asset_types: { service: db.assetTypes, label: 'Asset Type', placeholder: 'e.g. Vehicle' },
  savings_types: { service: db.savingsTypes, label: 'Savings Type', placeholder: 'e.g. Emergency Fund' },
};

let activeTab = 'categories';

export async function init(container) {
  const tabBar = document.getElementById('settings-tabs');
  const clickHandler = (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    activeTab = btn.dataset.tab;
    tabBar.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
    renderPanel();
  };
  tabBar.addEventListener('click', clickHandler);

  await renderPanel();

  return () => tabBar.removeEventListener('click', clickHandler);
}

async function renderPanel() {
  const panel = document.getElementById('settings-panel');
  if (activeTab === 'tax') return renderTaxPanel(panel);
  if (activeTab === 'system') return renderSystemPanel(panel);
  return renderLookupPanel(panel, activeTab);
}

/* ---------------- Generic lookup CRUD (categories, account/liability/asset/savings types) ---------------- */

async function renderLookupPanel(panel, key) {
  const cfg = LOOKUP_SERVICES[key];
  const rows = await cfg.service.list({ orderBy: 'created_at', ascending: true });

  panel.innerHTML = `
    <div class="ledger-card" style="padding:0;">
      ${rows.length
        ? rows.map((r) => `
          <div class="lookup-row" data-id="${r.id}">
            <span>${r.name}</span>
            <span class="row-actions">
              <button data-action="toggle" data-id="${r.id}" data-status="${r.status}">${r.status === 'active' ? 'Deactivate' : 'Activate'}</button>
              <button data-action="delete" data-id="${r.id}">Delete</button>
            </span>
          </div>`).join('')
        : `<div class="empty-state"><p>No ${cfg.label.toLowerCase()}s yet.</p></div>`
      }
      <div class="lookup-add-row">
        <input id="lookup-new-name" type="text" placeholder="New ${cfg.label.toLowerCase()} name…" />
        <button class="btn btn-primary" id="lookup-add-btn">Add</button>
      </div>
    </div>
  `;

  panel.querySelector('#lookup-add-btn').addEventListener('click', async () => {
    const input = panel.querySelector('#lookup-new-name');
    try {
      const name = required(input.value.trim(), `${cfg.label} name`);
      await cfg.service.create({ name, status: 'active' });
      toast(`${cfg.label} added`, 'success');
      await renderLookupPanel(panel, key);
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  panel.querySelectorAll('[data-action="toggle"]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const next = btn.dataset.status === 'active' ? 'inactive' : 'active';
      await cfg.service.update(btn.dataset.id, { status: next });
      await renderLookupPanel(panel, key);
    })
  );
  panel.querySelectorAll('[data-action="delete"]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      await cfg.service.remove(btn.dataset.id);
      toast(`${cfg.label} removed`, 'success');
      await renderLookupPanel(panel, key);
    })
  );
}

/* ---------------- Tax Rules ---------------- */

async function renderTaxPanel(panel) {
  const [rules, categories] = await Promise.all([
    db.taxRules.list({ orderBy: 'priority', ascending: true }),
    db.categories.list(),
  ]);
  const catName = (id) => categories.find((c) => c.id === id)?.name || 'Any';

  panel.innerHTML = `
    <div class="ledger-card" style="padding:0; margin-bottom:16px;">
      ${rules.length
        ? rules.map((r) => `
          <div class="lookup-row">
            <span>
              <strong>${r.tax_name}</strong>
              <span class="eyebrow">&nbsp;·&nbsp;${r.transaction_type || 'any type'} · ${catName(r.category_id)} · ${r.tax_rate}% · priority ${r.priority}</span>
            </span>
            <span class="row-actions">
              <button data-action="toggle" data-id="${r.id}" data-status="${r.status}">${r.status === 'active' ? 'Deactivate' : 'Activate'}</button>
              <button data-action="delete" data-id="${r.id}">Delete</button>
            </span>
          </div>`).join('')
        : `<div class="empty-state"><p>No tax rules yet — the transaction tax engine applies nothing until you add one.</p></div>`
      }
    </div>

    <h3>New Tax Rule</h3>
    <div class="ledger-card tone-gold">
      <div class="form-row">
        <div class="field"><label for="f-name">Tax Name</label><input id="f-name" type="text" placeholder="e.g. Income Tax" /></div>
        <div class="field num"><label for="f-rate">Tax Rate %</label><input id="f-rate" type="number" step="0.01" value="0" /></div>
      </div>
      <div class="form-row">
        <div class="field">
          <label for="f-txn-type">Applies to Transaction Type</label>
          <select id="f-txn-type">
            <option value="">Any</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        <div class="field">
          <label for="f-category">Applies to Category</label>
          <select id="f-category">
            <option value="">Any</option>
            ${categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="field num"><label for="f-min">Minimum Amount</label><input id="f-min" type="number" step="0.01" placeholder="Optional" /></div>
        <div class="field num"><label for="f-max">Maximum Amount</label><input id="f-max" type="number" step="0.01" placeholder="Optional" /></div>
        <div class="field num"><label for="f-priority">Priority</label><input id="f-priority" type="number" value="100" /></div>
      </div>
      <button class="btn btn-primary" id="add-rule-btn">Add Tax Rule</button>
    </div>
  `;

  panel.querySelector('#add-rule-btn').addEventListener('click', async () => {
    try {
      await db.taxRules.create({
        tax_name: required(panel.querySelector('#f-name').value.trim(), 'Tax name'),
        transaction_type: panel.querySelector('#f-txn-type').value || null,
        category_id: panel.querySelector('#f-category').value || null,
        tax_rate: parseFloat(panel.querySelector('#f-rate').value || '0'),
        minimum_amount: panel.querySelector('#f-min').value ? parseFloat(panel.querySelector('#f-min').value) : null,
        maximum_amount: panel.querySelector('#f-max').value ? parseFloat(panel.querySelector('#f-max').value) : null,
        priority: parseInt(panel.querySelector('#f-priority').value || '100', 10),
        status: 'active',
        trigger_type: 'type',
      });
      toast('Tax rule added', 'success');
      await renderTaxPanel(panel);
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  panel.querySelectorAll('[data-action="toggle"]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const next = btn.dataset.status === 'active' ? 'inactive' : 'active';
      await db.taxRules.update(btn.dataset.id, { status: next });
      await renderTaxPanel(panel);
    })
  );
  panel.querySelectorAll('[data-action="delete"]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      await db.taxRules.remove(btn.dataset.id);
      await renderTaxPanel(panel);
    })
  );
}

/* ---------------- System Settings ---------------- */

async function renderSystemPanel(panel) {
  const rows = await db.systemSettings.list();
  const settings = rows[0] || {
    currency: 'USD', date_format: 'YYYY-MM-DD', decimal_precision: 2,
    timezone: 'UTC', theme: 'light', notifications_enabled: true,
  };

  panel.innerHTML = `
    <div class="ledger-card">
      <div class="form-row">
        <div class="field"><label for="f-currency">Currency</label><input id="f-currency" type="text" value="${settings.currency}" /></div>
        <div class="field"><label for="f-timezone">Timezone</label><input id="f-timezone" type="text" value="${settings.timezone}" /></div>
      </div>
      <div class="form-row">
        <div class="field"><label for="f-dateformat">Date Format</label><input id="f-dateformat" type="text" value="${settings.date_format}" /></div>
        <div class="field num"><label for="f-precision">Decimal Precision</label><input id="f-precision" type="number" value="${settings.decimal_precision}" /></div>
      </div>
      <div class="field">
        <label for="f-notifications">Notifications</label>
        <select id="f-notifications">
          <option value="true" ${settings.notifications_enabled ? 'selected' : ''}>Enabled</option>
          <option value="false" ${!settings.notifications_enabled ? 'selected' : ''}>Disabled</option>
        </select>
      </div>
      <button class="btn btn-primary" id="save-settings-btn">Save Settings</button>
    </div>
  `;

  panel.querySelector('#save-settings-btn').addEventListener('click', async () => {
    const patch = {
      currency: panel.querySelector('#f-currency').value.trim() || 'USD',
      timezone: panel.querySelector('#f-timezone').value.trim() || 'UTC',
      date_format: panel.querySelector('#f-dateformat').value.trim() || 'YYYY-MM-DD',
      decimal_precision: parseInt(panel.querySelector('#f-precision').value || '2', 10),
      notifications_enabled: panel.querySelector('#f-notifications').value === 'true',
    };
    if (settings.user_id) {
      await db.systemSettings.update(settings.user_id, patch);
    } else {
      await db.systemSettings.create(patch);
    }
    toast('Settings saved', 'success');
  });
}
