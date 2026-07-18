import { db, getBalanceSheet, getCashFlow } from '../../../core/database.js';
import { formatCurrency, signedClass } from '../../../core/utils.js';

export async function init(container) {
  await Promise.all([renderBalanceSheet(), renderCashFlow(), renderInsights()]);
  return () => {}; // no listeners to clean up
}

async function renderBalanceSheet() {
  const grid = document.getElementById('balance-sheet-grid');
  const { totalAccountBalance, totalAssets, totalLiabilities, netWorth } = await getBalanceSheet();

  grid.innerHTML = `
    ${statCard('Total Account Balance', totalAccountBalance)}
    ${statCard('Total Assets', totalAssets, 'green')}
    ${statCard('Total Liabilities', totalLiabilities, 'rust')}
    ${statCard('Net Worth', netWorth, netWorth >= 0 ? 'green' : 'rust')}
  `;
}

async function renderCashFlow() {
  const grid = document.getElementById('cashflow-grid');
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const { income, expenses, netCashFlow, savingsRate } = await getCashFlow({ from, to });

  grid.innerHTML = `
    ${statCard('Income', income, 'green')}
    ${statCard('Expenses', expenses, 'rust')}
    ${statCard('Net Cash Flow', netCashFlow, netCashFlow >= 0 ? 'green' : 'rust')}
    ${statCard('Savings Rate', savingsRate, 'gold', '%')}
  `;
}

async function renderInsights() {
  const list = document.getElementById('insights-list');
  const insights = await buildInsights();

  list.innerHTML = insights.length
    ? insights.map((i) => `<div class="insight-row"><span class="icon">›</span><span>${i}</span></div>`).join('')
    : `<div class="empty-state"><h3>All clear</h3><p>No alerts right now — add accounts, liabilities, and transactions to see insights here.</p></div>`;
}

async function buildInsights() {
  const insights = [];
  const [accounts, liabilities, txns] = await Promise.all([
    db.accounts.list(),
    db.liabilities.list(),
    db.transactions.list({ orderBy: 'txn_date', ascending: false, limit: 50 }),
  ]);

  accounts
    .filter((a) => a.status === 'active' && Number(a.current_balance) < 100)
    .forEach((a) => insights.push(`Low balance: ${a.account_name} is at ${formatCurrency(a.current_balance)}.`));

  const soon = new Date();
  soon.setDate(soon.getDate() + 7);
  liabilities
    .filter((l) => l.due_date && new Date(l.due_date) <= soon && l.status !== 'paid_off')
    .forEach((l) => insights.push(`Upcoming due date: ${l.liability_name} due ${l.due_date}.`));

  liabilities
    .filter((l) => l.status === 'overdue')
    .forEach((l) => insights.push(`Overdue: ${l.liability_name} needs attention.`));

  const avg = txns.length ? txns.reduce((s, t) => s + Number(t.amount), 0) / txns.length : 0;
  txns
    .filter((t) => avg > 0 && Number(t.amount) > avg * 3)
    .slice(0, 3)
    .forEach((t) => insights.push(`Large transaction: ${formatCurrency(t.amount)} on ${t.txn_date}.`));

  return insights;
}

function statCard(label, value, tone = '', suffix = '') {
  const isPercent = suffix === '%';
  const displayValue = isPercent ? `${value}%` : formatCurrency(value);
  const toneClass = tone ? `tone-${tone}` : '';
  return `
    <div class="ledger-card ${toneClass}">
      <div class="stat-label">${label}</div>
      <div class="stat-value num ${!isPercent ? signedClass(value) : ''}">${displayValue}</div>
    </div>
  `;
}
