import { db } from '../../../core/database.js';
import { formatCurrency, required, toast } from '../../../core/utils.js';
import { openModal, closeModal } from '../../../components/modal/modal.js';

export async function init(container) {
  const newBtn = document.getElementById('btn-new-account');
  const handler = () => openAccountModal();
  newBtn.addEventListener('click', handler);

  await renderTable();

  return () => newBtn.removeEventListener('click', handler);
}

async function renderTable() {
  const wrap = document.getElementById('accounts-table-wrap');
  const accountTypes = await db.accountTypes.list();
  const accounts = await db.accounts.list({ orderBy: 'created_at', ascending: false });

  if (!accounts.length) {
    wrap.innerHTML = `
      <div class="ledger-card empty-state">
        <h3>No accounts yet</h3>
        <p>Add your first cash, bank, or e-wallet account to start tracking balances.</p>
        <button class="btn btn-primary" id="btn-empty-new">+ New Account</button>
      </div>`;
    document.getElementById('btn-empty-new').addEventListener('click', () => openAccountModal());
    return;
  }

  const typeName = (id) => accountTypes.find((t) => t.id === id)?.name || '—';

  wrap.innerHTML = `
    <table class="ledger-table">
      <thead><tr><th>Account</th><th>Type</th><th>Status</th><th style="text-align:right">Balance</th><th></th></tr></thead>
      <tbody>
        ${accounts.map((a) => `
          <tr data-id="${a.id}">
            <td>${a.account_name}</td>
            <td>${typeName(a.account_type_id)}</td>
            <td><span class="tag ${a.status}">${a.status}</span></td>
            <td class="num">${formatCurrency(a.current_balance)}</td>
            <td><button class="btn btn-edit" data-id="${a.id}">Edit</button></td>
          </tr>`).join('')}
      </tbody>
    </table>
  `;

  wrap.querySelectorAll('.btn-edit').forEach((btn) =>
    btn.addEventListener('click', () => {
      const account = accounts.find((a) => a.id === btn.dataset.id);
      openAccountModal(account);
    })
  );
}

async function openAccountModal(existing = null) {
  const accountTypes = await db.accountTypes.list();
  const typeOptions = accountTypes
    .map((t) => `<option value="${t.id}" ${existing?.account_type_id === t.id ? 'selected' : ''}>${t.name}</option>`)
    .join('') || '<option value="">No account types yet — add in Settings</option>';

  openModal({
    title: existing ? 'Edit Account' : 'New Account',
    submitLabel: existing ? 'Save Changes' : 'Create Account',
    bodyHTML: `
      <div class="field">
        <label for="f-name">Account Name</label>
        <input id="f-name" type="text" value="${existing?.account_name || ''}" placeholder="e.g. Main Checking" />
      </div>
      <div class="form-row">
        <div class="field">
          <label for="f-type">Type</label>
          <select id="f-type">${typeOptions}</select>
        </div>
        <div class="field num">
          <label for="f-balance">Current Balance</label>
          <input id="f-balance" type="number" step="0.01" value="${existing?.current_balance ?? 0}" />
        </div>
      </div>
      <div class="field">
        <label for="f-status">Status</label>
        <select id="f-status">
          <option value="active" ${existing?.status === 'active' ? 'selected' : ''}>Active</option>
          <option value="inactive" ${existing?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
          <option value="closed" ${existing?.status === 'closed' ? 'selected' : ''}>Closed</option>
        </select>
      </div>
    `,
    onSubmit: async (modalEl) => {
      const record = {
        account_name: required(modalEl.querySelector('#f-name').value.trim(), 'Account name'),
        account_type_id: modalEl.querySelector('#f-type').value || null,
        current_balance: parseFloat(modalEl.querySelector('#f-balance').value || '0'),
        status: modalEl.querySelector('#f-status').value,
      };
      if (existing) {
        await db.accounts.update(existing.id, record);
        toast('Account updated', 'success');
      } else {
        await db.accounts.create(record);
        toast('Account created', 'success');
      }
      await renderTable();
    },
  });
}
