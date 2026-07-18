import { db, calculateTax } from '../../../core/database.js';
import { formatCurrency, formatDate, required, toast, debounce } from '../../../core/utils.js';
import { openModal } from '../../../components/modal/modal.js';

export async function init(container) {
  const newBtn = document.getElementById('btn-new-txn');
  const handler = () => openTxnModal();
  newBtn.addEventListener('click', handler);

  await renderTable();

  return () => newBtn.removeEventListener('click', handler);
}

async function renderTable() {
  const wrap = document.getElementById('transactions-table-wrap');
  const [txns, categories, accounts] = await Promise.all([
    db.transactions.list({ orderBy: 'txn_date', ascending: false }),
    db.categories.list(),
    db.accounts.list(),
  ]);

  if (!txns.length) {
    wrap.innerHTML = `<div class="ledger-card empty-state"><h3>No transactions yet</h3><p>Log your first income or expense to see it here.</p></div>`;
    return;
  }

  const catName = (id) => categories.find((c) => c.id === id)?.name || '—';
  const acctName = (id) => accounts.find((a) => a.id === id)?.account_name || '—';

  wrap.innerHTML = `
    <table class="ledger-table">
      <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Account</th><th>Description</th><th style="text-align:right">Tax</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>
        ${txns.map((t) => `
          <tr>
            <td>${formatDate(t.txn_date)}</td>
            <td><span class="tag ${t.type}">${t.type}</span></td>
            <td>${catName(t.category_id)}</td>
            <td>${acctName(t.account_id)}</td>
            <td>${t.description || '—'}</td>
            <td class="num">${formatCurrency(t.total_tax_amount)}</td>
            <td class="num">${formatCurrency(t.amount)}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  `;
}

async function openTxnModal() {
  const [categories, accounts] = await Promise.all([db.categories.list(), db.accounts.list()]);

  const catOptions = categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join('')
    || '<option value="">No categories yet — add in Settings</option>';
  const acctOptions = accounts.map((a) => `<option value="${a.id}">${a.account_name}</option>`).join('')
    || '<option value="">No accounts yet — add in Accounts</option>';

  const modalEl = openModal({
    title: 'New Transaction',
    submitLabel: 'Save Transaction',
    bodyHTML: `
      <div class="form-row">
        <div class="field">
          <label for="f-date">Date</label>
          <input id="f-date" type="date" value="${new Date().toISOString().slice(0,10)}" />
        </div>
        <div class="field">
          <label for="f-type">Type</label>
          <select id="f-type">
            <option value="income">Income</option>
            <option value="expense" selected>Expense</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="field"><label for="f-category">Category</label><select id="f-category">${catOptions}</select></div>
        <div class="field"><label for="f-account">Account</label><select id="f-account">${acctOptions}</select></div>
      </div>
      <div class="field num">
        <label for="f-amount">Amount</label>
        <input id="f-amount" type="number" step="0.01" value="0" />
      </div>
      <div class="field">
        <label for="f-desc">Description</label>
        <input id="f-desc" type="text" placeholder="Optional note" />
      </div>
      <div class="ledger-card tone-gold" id="tax-preview" style="font-size:13px;">
        <div class="stat-label">Calculated Tax</div>
        <div class="stat-value num" id="tax-preview-value">$0.00</div>
      </div>
    `,
    onSubmit: async (el) => {
      const draft = buildDraft(el);
      required(draft.account_id, 'Account');
      const { totalTax } = await calculateTax(draft);
      await db.transactions.create({ ...draft, total_tax_amount: totalTax, status: 'posted' });
      await adjustAccountBalance(draft.account_id, draft.type, draft.amount, totalTax);
      toast('Transaction saved', 'success');
      await renderTable();
    },
  });

  const recalc = debounce(async () => {
    const draft = buildDraft(modalEl);
    if (!draft.amount) return;
    const { totalTax } = await calculateTax(draft);
    modalEl.querySelector('#tax-preview-value').textContent = formatCurrency(totalTax);
  }, 200);
  ['f-type', 'f-category', 'f-account', 'f-amount'].forEach((id) =>
    modalEl.querySelector(`#${id}`).addEventListener('input', recalc)
  );
}

function buildDraft(el) {
  return {
    txn_date: el.querySelector('#f-date').value,
    type: el.querySelector('#f-type').value,
    category_id: el.querySelector('#f-category').value || null,
    account_id: el.querySelector('#f-account').value || null,
    amount: parseFloat(el.querySelector('#f-amount').value || '0'),
    description: el.querySelector('#f-desc').value.trim(),
  };
}

async function adjustAccountBalance(accountId, type, amount, tax) {
  const account = await db.accounts.get(accountId);
  if (!account) return;
  const net = type === 'income' ? amount - tax : -(amount + tax);
  await db.accounts.update(accountId, { current_balance: Number(account.current_balance) + net });
}
