import { db, getLiabilitySummary } from '../../../core/database.js';
import { formatCurrency, formatDate, required, toast } from '../../../core/utils.js';
import { openModal } from '../../../components/modal/modal.js';

export async function init(container) {
  const newBtn = document.getElementById('btn-new-liability');
  const handler = () => openLiabilityModal();
  newBtn.addEventListener('click', handler);

  await Promise.all([renderSummary(), renderTable()]);

  return () => newBtn.removeEventListener('click', handler);
}

async function renderSummary() {
  const grid = document.getElementById('liability-summary-grid');
  const { totalDebt, outstandingBalance, activeCount, overdueCount } = await getLiabilitySummary();
  grid.innerHTML = `
    <div class="ledger-card"><div class="stat-label">Total Debt (original)</div><div class="stat-value num">${formatCurrency(totalDebt)}</div></div>
    <div class="ledger-card tone-rust"><div class="stat-label">Outstanding Balance</div><div class="stat-value num negative">${formatCurrency(outstandingBalance)}</div></div>
    <div class="ledger-card"><div class="stat-label">Active Liabilities</div><div class="stat-value num">${activeCount}</div></div>
    <div class="ledger-card tone-rust"><div class="stat-label">Overdue</div><div class="stat-value num">${overdueCount}</div></div>
  `;
}

async function renderTable() {
  const wrap = document.getElementById('liabilities-table-wrap');
  const [liabilities, types] = await Promise.all([
    db.liabilities.list({ orderBy: 'due_date', ascending: true }),
    db.liabilityTypes.list(),
  ]);

  if (!liabilities.length) {
    wrap.innerHTML = `<div class="ledger-card empty-state"><h3>No liabilities yet</h3><p>Add a loan, mortgage, subscription, or bill to start tracking it.</p></div>`;
    return;
  }

  const typeName = (id) => types.find((t) => t.id === id)?.name || '—';

  wrap.innerHTML = `
    <table class="ledger-table">
      <thead><tr><th>Name</th><th>Type</th><th>Creditor</th><th>Due</th><th>Status</th><th style="text-align:right">Balance</th><th></th></tr></thead>
      <tbody>
        ${liabilities.map((l) => `
          <tr>
            <td>${l.liability_name}</td>
            <td>${typeName(l.liability_type_id)}</td>
            <td>${l.creditor || '—'}</td>
            <td>${formatDate(l.due_date)}</td>
            <td><span class="tag ${l.status}">${l.status.replace('_',' ')}</span></td>
            <td class="num">${formatCurrency(l.current_balance)}</td>
            <td><button class="btn btn-pay" data-id="${l.id}">Log Payment</button></td>
          </tr>`).join('')}
      </tbody>
    </table>
  `;

  wrap.querySelectorAll('.btn-pay').forEach((btn) =>
    btn.addEventListener('click', () => openPaymentModal(liabilities.find((l) => l.id === btn.dataset.id)))
  );
}

async function openLiabilityModal() {
  const types = await db.liabilityTypes.list();
  const typeOptions = types.map((t) => `<option value="${t.id}">${t.name}</option>`).join('')
    || '<option value="">No liability types yet — add in Settings</option>';

  openModal({
    title: 'New Liability',
    submitLabel: 'Create Liability',
    bodyHTML: `
      <div class="field"><label for="f-name">Liability Name</label><input id="f-name" type="text" placeholder="e.g. Car Loan" /></div>
      <div class="form-row">
        <div class="field"><label for="f-type">Type</label><select id="f-type">${typeOptions}</select></div>
        <div class="field"><label for="f-creditor">Creditor</label><input id="f-creditor" type="text" /></div>
      </div>
      <div class="form-row">
        <div class="field num"><label for="f-original">Original Amount</label><input id="f-original" type="number" step="0.01" value="0" /></div>
        <div class="field num"><label for="f-rate">Interest Rate %</label><input id="f-rate" type="number" step="0.01" value="0" /></div>
      </div>
      <div class="field"><label for="f-due">Due Date</label><input id="f-due" type="date" /></div>
    `,
    onSubmit: async (el) => {
      const original = parseFloat(el.querySelector('#f-original').value || '0');
      await db.liabilities.create({
        liability_name: required(el.querySelector('#f-name').value.trim(), 'Liability name'),
        liability_type_id: el.querySelector('#f-type').value || null,
        creditor: el.querySelector('#f-creditor').value.trim(),
        original_amount: original,
        current_balance: original,
        interest_rate: parseFloat(el.querySelector('#f-rate').value || '0'),
        interest_type: 'fixed',
        due_date: el.querySelector('#f-due').value || null,
        status: 'active',
      });
      toast('Liability created', 'success');
      await Promise.all([renderSummary(), renderTable()]);
    },
  });
}

async function openPaymentModal(liability) {
  const accounts = await db.accounts.list();
  const acctOptions = accounts.map((a) => `<option value="${a.id}">${a.account_name}</option>`).join('')
    || '<option value="">No accounts yet</option>';

  openModal({
    title: `Log Payment — ${liability.liability_name}`,
    submitLabel: 'Save Payment',
    bodyHTML: `
      <div class="form-row">
        <div class="field num"><label for="f-amount">Amount Paid</label><input id="f-amount" type="number" step="0.01" value="0" /></div>
        <div class="field num"><label for="f-interest">Interest Portion</label><input id="f-interest" type="number" step="0.01" value="0" /></div>
      </div>
      <div class="field"><label for="f-source">Source Account</label><select id="f-source">${acctOptions}</select></div>
    `,
    onSubmit: async (el) => {
      const amountPaid = parseFloat(el.querySelector('#f-amount').value || '0');
      const interest = parseFloat(el.querySelector('#f-interest').value || '0');
      const principal = Math.max(0, amountPaid - interest);
      const sourceId = el.querySelector('#f-source').value || null;

      await db.liabilityPayments.create({
        liability_id: liability.id,
        amount_paid: amountPaid,
        principal_amount: principal,
        interest_amount: interest,
        source_account_id: sourceId,
      });

      const newBalance = Math.max(0, Number(liability.current_balance) - principal);
      await db.liabilities.update(liability.id, {
        current_balance: newBalance,
        status: newBalance === 0 ? 'paid_off' : liability.status,
      });

      if (sourceId) {
        const account = await db.accounts.get(sourceId);
        await db.accounts.update(sourceId, { current_balance: Number(account.current_balance) - amountPaid });
      }

      toast('Payment logged', 'success');
      await Promise.all([renderSummary(), renderTable()]);
    },
  });
}
