import { db, getAssetSummary } from '../../../core/database.js';
import { formatCurrency, formatDate, required, toast, signedClass } from '../../../core/utils.js';
import { openModal } from '../../../components/modal/modal.js';

export async function init(container) {
  const newBtn = document.getElementById('btn-new-asset');
  const handler = () => openAssetModal();
  newBtn.addEventListener('click', handler);

  await Promise.all([renderSummary(), renderTable()]);

  return () => newBtn.removeEventListener('click', handler);
}

async function renderSummary() {
  const grid = document.getElementById('asset-summary-grid');
  const { totalPortfolioValue, purchaseCost, gainLoss, count } = await getAssetSummary();
  grid.innerHTML = `
    <div class="ledger-card"><div class="stat-label">Portfolio Value</div><div class="stat-value num">${formatCurrency(totalPortfolioValue)}</div></div>
    <div class="ledger-card"><div class="stat-label">Purchase Cost</div><div class="stat-value num">${formatCurrency(purchaseCost)}</div></div>
    <div class="ledger-card ${gainLoss >= 0 ? 'tone-green' : 'tone-rust'}"><div class="stat-label">Gain / Loss</div><div class="stat-value num ${signedClass(gainLoss)}">${formatCurrency(gainLoss)}</div></div>
    <div class="ledger-card"><div class="stat-label">Assets Held</div><div class="stat-value num">${count}</div></div>
  `;
}

async function renderTable() {
  const wrap = document.getElementById('assets-table-wrap');
  const [assets, types] = await Promise.all([
    db.assets.list({ orderBy: 'purchase_date', ascending: false }),
    db.assetTypes.list(),
  ]);

  if (!assets.length) {
    wrap.innerHTML = `<div class="ledger-card empty-state"><h3>No assets yet</h3><p>Add a vehicle, property, or investment to track its value over time.</p></div>`;
    return;
  }

  const typeName = (id) => types.find((t) => t.id === id)?.name || '—';

  wrap.innerHTML = `
    <table class="ledger-table">
      <thead><tr><th>Asset</th><th>Type</th><th>Purchased</th><th>Status</th><th style="text-align:right">Cost</th><th style="text-align:right">Current Value</th><th style="text-align:right">Gain/Loss</th></tr></thead>
      <tbody>
        ${assets.map((a) => {
          const gl = Number(a.current_value) - Number(a.purchase_cost);
          return `
          <tr>
            <td>${a.asset_name}</td>
            <td>${typeName(a.asset_type_id)}</td>
            <td>${formatDate(a.purchase_date)}</td>
            <td><span class="tag ${a.status}">${a.status}</span></td>
            <td class="num">${formatCurrency(a.purchase_cost)}</td>
            <td class="num">${formatCurrency(a.current_value)}</td>
            <td class="num ${signedClass(gl)}">${formatCurrency(gl)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  `;
}

async function openAssetModal() {
  const types = await db.assetTypes.list();
  const typeOptions = types.map((t) => `<option value="${t.id}">${t.name}</option>`).join('')
    || '<option value="">No asset types yet — add in Settings</option>';

  openModal({
    title: 'New Asset',
    submitLabel: 'Create Asset',
    bodyHTML: `
      <div class="field"><label for="f-name">Asset Name</label><input id="f-name" type="text" placeholder="e.g. Honda Civic" /></div>
      <div class="form-row">
        <div class="field"><label for="f-type">Type</label><select id="f-type">${typeOptions}</select></div>
        <div class="field"><label for="f-date">Purchase Date</label><input id="f-date" type="date" /></div>
      </div>
      <div class="form-row">
        <div class="field num"><label for="f-cost">Purchase Cost</label><input id="f-cost" type="number" step="0.01" value="0" /></div>
        <div class="field num"><label for="f-value">Current Value</label><input id="f-value" type="number" step="0.01" value="0" /></div>
      </div>
    `,
    onSubmit: async (el) => {
      await db.assets.create({
        asset_name: required(el.querySelector('#f-name').value.trim(), 'Asset name'),
        asset_type_id: el.querySelector('#f-type').value || null,
        purchase_date: el.querySelector('#f-date').value || null,
        purchase_cost: parseFloat(el.querySelector('#f-cost').value || '0'),
        current_value: parseFloat(el.querySelector('#f-value').value || '0'),
        status: 'held',
      });
      toast('Asset created', 'success');
      await Promise.all([renderSummary(), renderTable()]);
    },
  });
}
