import { db, getSavingsSummary } from '../../../core/database.js';
import { formatCurrency, formatDate, required, toast } from '../../../core/utils.js';
import { openModal } from '../../../components/modal/modal.js';

export async function init(container) {
  const newBtn = document.getElementById('btn-new-goal');
  const handler = () => openGoalModal();
  newBtn.addEventListener('click', handler);

  await renderGoals();

  return () => newBtn.removeEventListener('click', handler);
}

async function renderGoals() {
  const wrap = document.getElementById('savings-goals-wrap');
  const goals = await getSavingsSummary();

  if (!goals.length) {
    wrap.innerHTML = `<div class="ledger-card empty-state"><h3>No savings goals yet</h3><p>Set a target — emergency fund, vacation, retirement — and track daily progress.</p></div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="goal-grid">
      ${goals.map((g) => `
        <div class="ledger-card tone-gold">
          <h3>${g.savings_name}</h3>
          <div class="stat-value num">${formatCurrency(g.current_balance)} <span style="font-size:13px;color:var(--ink-soft);">/ ${formatCurrency(g.target_goal)}</span></div>
          <div class="goal-progress-track"><div class="goal-progress-fill" style="width:${g.progressPct}%"></div></div>
          <div class="goal-meta">
            <span>${g.progressPct}% funded</span>
            <span>${g.end_date ? `by ${formatDate(g.end_date)}` : 'no deadline'}</span>
          </div>
          ${g.dailyContribution != null ? `<div class="goal-meta" style="margin-top:6px;"><span>Daily contribution needed</span><span class="num">${formatCurrency(g.dailyContribution)}</span></div>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

async function openGoalModal() {
  const types = await db.savingsTypes.list();
  const typeOptions = types.map((t) => `<option value="${t.id}">${t.name}</option>`).join('')
    || '<option value="">No savings types yet — add in Settings</option>';

  openModal({
    title: 'New Savings Goal',
    submitLabel: 'Create Goal',
    bodyHTML: `
      <div class="field"><label for="f-name">Goal Name</label><input id="f-name" type="text" placeholder="e.g. Emergency Fund" /></div>
      <div class="field"><label for="f-type">Type</label><select id="f-type">${typeOptions}</select></div>
      <div class="form-row">
        <div class="field num"><label for="f-current">Starting Balance</label><input id="f-current" type="number" step="0.01" value="0" /></div>
        <div class="field num"><label for="f-target">Target Goal</label><input id="f-target" type="number" step="0.01" value="0" /></div>
      </div>
      <div class="form-row">
        <div class="field"><label for="f-start">Start Date</label><input id="f-start" type="date" value="${new Date().toISOString().slice(0,10)}" /></div>
        <div class="field"><label for="f-end">End Date</label><input id="f-end" type="date" /></div>
      </div>
    `,
    onSubmit: async (el) => {
      await db.savingsGoals.create({
        savings_name: required(el.querySelector('#f-name').value.trim(), 'Goal name'),
        savings_type_id: el.querySelector('#f-type').value || null,
        current_balance: parseFloat(el.querySelector('#f-current').value || '0'),
        target_goal: parseFloat(el.querySelector('#f-target').value || '0'),
        start_date: el.querySelector('#f-start').value,
        end_date: el.querySelector('#f-end').value || null,
        status: 'active',
      });
      toast('Savings goal created', 'success');
      await renderGoals();
    },
  });
}
