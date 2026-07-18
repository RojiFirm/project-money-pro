-- ============================================================
-- Project Money PRO — Supabase / PostgreSQL Schema
-- Run this in the Supabase SQL Editor (or via `supabase db push`)
-- ============================================================

-- Extensions -----------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. LOOKUP / SETTINGS TABLES  (Control Center)
-- ============================================================

create table if not exists category_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid references category_groups(id) on delete set null,
  name text not null,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);

create table if not exists transaction_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (name in ('income','expense')),
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists account_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, -- Cash, Bank, E-Wallet, Investment, Credit Card
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists liability_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, -- Loan, Mortgage, Subscription, Utility Bill, Personal Debt
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists asset_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, -- Vehicle, Property, Electronics, Investment, Business Asset
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists savings_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, -- Emergency Fund, Vacation, Retirement, Education, Investment Fund
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists tax_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

-- App-wide preferences, one row per user
create table if not exists system_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  currency text not null default 'USD',
  date_format text not null default 'YYYY-MM-DD',
  decimal_precision int not null default 2,
  timezone text not null default 'UTC',
  theme text not null default 'light',
  layout text not null default 'comfortable',
  notifications_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 2. CORE FINANCIAL TABLES
-- ============================================================

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_name text not null,
  account_type_id uuid references account_types(id) on delete set null,
  current_balance numeric(14,2) not null default 0,
  status text not null default 'active' check (status in ('active','inactive','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ts timestamptz not null default now(),
  txn_date date not null default current_date,
  type text not null check (type in ('income','expense')),
  category_id uuid references categories(id) on delete set null,
  account_id uuid not null references accounts(id) on delete cascade,
  amount numeric(14,2) not null check (amount >= 0),
  tax_type_id uuid references tax_types(id) on delete set null,
  additional_tax_type_id uuid references tax_types(id) on delete set null,
  additional_tax_amount numeric(14,2) not null default 0,
  total_tax_amount numeric(14,2) not null default 0,
  description text,
  status text not null default 'posted' check (status in ('posted','pending','void')),
  created_at timestamptz not null default now()
);

create table if not exists transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ts timestamptz not null default now(),
  from_account_id uuid not null references accounts(id) on delete cascade,
  to_account_id uuid not null references accounts(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  self_tax numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  constraint different_accounts check (from_account_id <> to_account_id)
);

create table if not exists liabilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date_incurred date not null default current_date,
  liability_name text not null,
  liability_type_id uuid references liability_types(id) on delete set null,
  creditor text,
  original_amount numeric(14,2) not null,
  current_balance numeric(14,2) not null,
  interest_type text check (interest_type in ('fixed','variable','none')),
  interest_rate numeric(6,3) default 0,
  interest_period text check (interest_period in ('monthly','annual')),
  due_date date,
  status text not null default 'active' check (status in ('active','paid_off','overdue','defaulted')),
  created_at timestamptz not null default now()
);

create table if not exists liability_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  liability_id uuid not null references liabilities(id) on delete cascade,
  payment_date date not null default current_date,
  amount_paid numeric(14,2) not null check (amount_paid > 0),
  principal_amount numeric(14,2) not null default 0,
  interest_amount numeric(14,2) not null default 0,
  source_account_id uuid references accounts(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_name text not null,
  asset_type_id uuid references asset_types(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  purchase_date date,
  purchase_cost numeric(14,2) not null default 0,
  current_value numeric(14,2) not null default 0,
  status text not null default 'held' check (status in ('held','sold','written_off')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  savings_name text not null,
  savings_type_id uuid references savings_types(id) on delete set null,
  interest_type text check (interest_type in ('fixed','variable','none')),
  current_balance numeric(14,2) not null default 0,
  target_goal numeric(14,2) not null,
  start_date date not null default current_date,
  end_date date,
  status text not null default 'active' check (status in ('active','completed','abandoned')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 3. DYNAMIC TAX & RULES ENGINE
-- ============================================================

create table if not exists tax_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tax_name text not null,
  trigger_type text not null check (trigger_type in ('type','category','account','amount')),
  transaction_type text check (transaction_type in ('income','expense')),
  category_id uuid references categories(id) on delete set null,
  account_id uuid references accounts(id) on delete set null,
  minimum_amount numeric(14,2),
  maximum_amount numeric(14,2),
  tax_rate numeric(6,3) not null,
  priority int not null default 100,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);

-- Generated (net gain/loss) columns -------------------------------
alter table assets
  add column if not exists net_gain_loss numeric(14,2)
  generated always as (current_value - purchase_cost) stored;

-- ============================================================
-- 4. INDEXES
-- ============================================================
create index if not exists idx_transactions_user_date on transactions(user_id, txn_date desc);
create index if not exists idx_transactions_account on transactions(account_id);
create index if not exists idx_transfers_user on transfers(user_id, ts desc);
create index if not exists idx_liabilities_user on liabilities(user_id, status);
create index if not exists idx_assets_user on assets(user_id, status);
create index if not exists idx_savings_user on savings_goals(user_id, status);
create index if not exists idx_tax_rules_priority on tax_rules(user_id, priority);

-- ============================================================
-- 5. updated_at TRIGGER HELPER
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_accounts_updated on accounts;
create trigger trg_accounts_updated before update on accounts
  for each row execute function set_updated_at();

drop trigger if exists trg_assets_updated on assets;
create trigger trg_assets_updated before update on assets
  for each row execute function set_updated_at();

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'category_groups','categories','transaction_types','account_types',
    'liability_types','asset_types','savings_types','tax_types',
    'system_settings','accounts','transactions','transfers','liabilities',
    'liability_payments','assets','savings_goals','tax_rules'
  ])
  loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;

-- system_settings uses user_id as PK, everything else has a user_id column
create policy "select_own_settings" on system_settings for select using (auth.uid() = user_id);
create policy "modify_own_settings" on system_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'category_groups','categories','transaction_types','account_types',
    'liability_types','asset_types','savings_types','tax_types',
    'accounts','transactions','transfers','liabilities',
    'liability_payments','assets','savings_goals','tax_rules'
  ])
  loop
    execute format('create policy "select_own_%1$s" on %1$I for select using (auth.uid() = user_id);', t);
    execute format('create policy "insert_own_%1$s" on %1$I for insert with check (auth.uid() = user_id);', t);
    execute format('create policy "update_own_%1$s" on %1$I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
    execute format('create policy "delete_own_%1$s" on %1$I for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;
