/**
 * core/config.js
 * ------------------------------------------------------------
 * Fill in SUPABASE_URL and SUPABASE_ANON_KEY with the values
 * from your Supabase project's Settings → API page, then this
 * file initializes a single shared client used everywhere else.
 *
 * Until you do, the app runs in "offline" mode: api.js falls
 * back to an in-memory store so every page still works for
 * building/testing the UI without a live backend.
 * ------------------------------------------------------------
 */

export const SUPABASE_URL = 'https://YOUR-PROJECT-REF.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR-ANON-PUBLIC-KEY';

export const IS_CONFIGURED =
  !SUPABASE_URL.includes('YOUR-PROJECT-REF') &&
  !SUPABASE_ANON_KEY.includes('YOUR-ANON-PUBLIC-KEY');

let _client = null;

/**
 * Lazily creates and returns the Supabase client.
 * Loads the SDK from the CDN so no build step is required.
 */
export async function getSupabaseClient() {
  if (_client) return _client;
  if (!IS_CONFIGURED) return null;

  const { createClient } = await import(
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
  );
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return _client;
}

export const APP_TABLES = [
  'category_groups', 'categories', 'transaction_types', 'account_types',
  'liability_types', 'asset_types', 'savings_types', 'tax_types',
  'system_settings', 'accounts', 'transactions', 'transfers', 'liabilities',
  'liability_payments', 'assets', 'savings_goals', 'tax_rules',
];
