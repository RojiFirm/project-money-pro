import { db } from '../../../core/database.js';
import { formatCurrency, formatDate, required, toast } from '../../../core/utils.js';
import { openModal } from '../../../components/modal/modal.js';

export async function init(container) {
  const newBtn = document.getElementById('btn-new-transfer');
  const handler = () => openTransferModal();
  newBtn.addEventListener('click', handler);

  await renderTable();

  return () => newBtn.removeEventListener('click', handler);
}

async function renderTable() {
  const wrap = document.getElementById('transfers-table-wrap');
  const [transfers, accounts] = await Promise.all([
    db.transfers.list({ orderBy: 'ts', ascending: false }),
    db.accounts.list(),
  ]);

  if (!transfers.length) {
    wrap.innerHTML = `<div class="ledger-card empty-state"><h3>No transfers yet</h3><p>Move funds between two of your accounts to see history here.</p></div>`;
    return;
  }

  const acctName = (id) => accounts.find((a) => a.id === id)?.account_name || '—';

  wrap.innerHTML = `
    <table class="ledger-table">
      <thead><tr><th>Date</th><th>From</th><th>To</th><th>Notes</th><th style="text-align:right">Self Tax</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>
        ${transfers.map((t) => `
          <tr>
            <td>${formatDate(t.ts)}</td>
            <td>${acctName(t.from_account_id)}</td>
            <td>${acctName(t.to_account_id)}</td>
            <td>${t.notes || '—'}</td>
            <td class="num">${formatCurrency(t.self_tax)}</td>
            <td class="num">${formatCurrency(t.amount)}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  `;
}

async function openTransferModal() {
  const accounts = await db.accounts.list();
  const options = accounts.map((a) => `<option value="${a.id}">${a.account_name}</option>`).join('')
    || '<option value="">No accounts yet</option>';

  const modalEl = openModal({
    title: 'New Transfer',
    submitLabel: 'Transfer Funds',
    bodyHTML: `
      <div class="form-row">
        <div class="field"><label for="f-from">From Account</label><select id="f-from">${options}</select></div>
        <div class="field"><label for="f-to">To Account</label><select id="f-to">${options}</select></div>
      </div>
      <div class="form-row">
        <div class="field num"><label for="f-amount">Amount</label><input id="f-amount" type="number" step="0.01" value="0" /></div>
        <div class="field num"><label for="f-tax">Self Tax (optional)</label><input id="f-tax" type="number" step="0.01" value="0" /></div>
      </div>
      <div class="field"><label for="f-notes">Notes</label><input id="f-notes" type="text" placeholder="Optional note" /></div>
    `,
    onSubmit: async (el) => {
      const fromId = el.querySelector('#f-from').value;
      const toId = el.querySelector('#f-to').value;
      const amount = parseFloat(el.querySelector('#f-amount').value || '0');
      const selfTax = parseFloat(el.querySelector('#f-tax').value || '0');
      required(fromId, 'From account');
      required(toId, 'To account');
      if (fromId === toId) throw new Error('From and To accounts must be different.');
      if (amount <= 0) throw new Error('Amount must be greater than zero.');

      await db.transfers.create({
        from_account_id: fromId,
        to_account_id: toId,
        amount,
        self_tax: selfTax,
        notes: el.querySelector('#f-notes').value.trim(),
      });

      const [fromAcct, toAcct] = await Promise.all([db.accounts.get(fromId), db.accounts.get(toId)]);
      await db.accounts.update(fromId, { current_balance: Number(fromAcct.current_balance) - amount - selfTax });
      await db.accounts.update(toId, { current_balance: Number(toAcct.current_balance) + amount });

      toast('Transfer complete', 'success');
      await renderTable();
    },
  });
}
