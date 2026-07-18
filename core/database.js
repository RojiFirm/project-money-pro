/**
 * core/database.js
 * ------------------------------------------------------------
 * One named service per table (thin wrappers over api.js), plus
 * the business-logic functions that sit on top of raw CRUD:
 * the tax rule engine and the dashboard aggregations.
 * ------------------------------------------------------------
 */
import { createService } from './api.js';

export const db = {
  categoryGroups: createService('category_groups'),
  categories: createService('categories'),
  transactionTypes: createService('transaction_types'),
  accountTypes: createService('account_types'),
  liabilityTypes: createService('liability_types'),
  assetTypes: createService('asset_types'),
  savingsTypes: createService('savings_types'),
  taxTypes: createService('tax_types'),
  systemSettings: createService('system_settings'),

  accounts: createService('accounts'),
  transactions: createService('transactions'),
  transfers: createService('transfers'),
  liabilities: createService('liabilities'),
  liabilityPayments: createService('liability_payments'),
  assets: createService('assets'),
  savingsGoals: createService('savings_goals'),
  taxRules: createService('tax_rules'),
};

/* ============================================================
   Dynamic Tax & Rules Engine
   Flow: Transaction Input → Trigger Detection → Rule Matching
         → Tax Calculation → Save Transaction → Update Dashboards
   ============================================================ */

/**
 * Evaluates all active tax rules against a draft transaction and
 * returns the combined tax breakdown. Rules run in `priority` order
 * (lower number = earlier) and matching rules stack.
 */
export async function calculateTax(draftTransaction) {
  const rules = await db.taxRules.list({
    filters: { status: 'active' },
    orderBy: 'priority',
    ascending: true,
  });

  let totalTax = 0;
  const applied = [];

  for (const rule of rules) {
    if (!ruleMatches(rule, draftTransaction)) continue;
    const taxAmount = round2((draftTransaction.amount * rule.tax_rate) / 100);
    totalTax += taxAmount;
    applied.push({ rule_id: rule.id, name: rule.tax_name, rate: rule.tax_rate, amount: taxAmount });
  }

  return { totalTax: round2(totalTax), applied };
}

function ruleMatches(rule, txn) {
  if (rule.transaction_type && rule.transaction_type !== txn.type) return false;
  if (rule.category_id && rule.category_id !== txn.category_id) return false;
  if (rule.account_id && rule.account_id !== txn.account_id) return false;
  if (rule.minimum_amount != null && txn.amount < rule.minimum_amount) return false;
  if (rule.maximum_amount != null && txn.amount > rule.maximum_amount) return false;
  return true;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/* ============================================================
   Dashboard Aggregations
   ============================================================ */

export async function getBalanceSheet() {
  const [accounts, assets, liabilities] = await Promise.all([
    db.accounts.list(),
    db.assets.list({ filters: { status: 'held' } }),
    db.liabilities.list(),
  ]);

  const totalAccountBalance = sum(accounts, 'current_balance');
  const totalAssets = sum(assets, 'current_value');
  const totalLiabilities = sum(
    liabilities.filter((l) => l.status !== 'paid_off'),
    'current_balance'
  );

  return {
    totalAccountBalance,
    totalAssets,
    totalLiabilities,
    netWorth: round2(totalAccountBalance + totalAssets - totalLiabilities),
  };
}

export async function getCashFlow({ from, to } = {}) {
  const txns = await db.transactions.list({ filters: { status: 'posted' } });
  const inRange = txns.filter((t) => (!from || t.txn_date >= from) && (!to || t.txn_date <= to));

  const income = sum(inRange.filter((t) => t.type === 'income'), 'amount');
  const expenses = sum(inRange.filter((t) => t.type === 'expense'), 'amount');
  const netCashFlow = round2(income - expenses);
  const savingsRate = income > 0 ? round2((netCashFlow / income) * 100) : 0;

  return { income: round2(income), expenses: round2(expenses), netCashFlow, savingsRate };
}

export async function getSavingsSummary() {
  const goals = await db.savingsGoals.list({ filters: { status: 'active' } });
  return goals.map((g) => {
    const remaining = round2(g.target_goal - g.current_balance);
    const daysLeft = g.end_date
      ? Math.max(1, Math.ceil((new Date(g.end_date) - new Date()) / 86400000))
      : null;
    return {
      ...g,
      remaining,
      dailyContribution: daysLeft ? round2(remaining / daysLeft) : null,
      progressPct: g.target_goal > 0 ? Math.min(100, round2((g.current_balance / g.target_goal) * 100)) : 0,
    };
  });
}

export async function getLiabilitySummary() {
  const liabilities = await db.liabilities.list();
  const active = liabilities.filter((l) => l.status === 'active' || l.status === 'overdue');
  return {
    totalDebt: sum(liabilities, 'original_amount'),
    outstandingBalance: sum(active, 'current_balance'),
    activeCount: active.length,
    overdueCount: liabilities.filter((l) => l.status === 'overdue').length,
  };
}

export async function getAssetSummary() {
  const assets = await db.assets.list({ filters: { status: 'held' } });
  const purchaseCost = sum(assets, 'purchase_cost');
  const currentValue = sum(assets, 'current_value');
  return {
    totalPortfolioValue: currentValue,
    purchaseCost,
    gainLoss: round2(currentValue - purchaseCost),
    count: assets.length,
  };
}

function sum(rows, field) {
  return round2(rows.reduce((acc, r) => acc + Number(r[field] || 0), 0));
}
