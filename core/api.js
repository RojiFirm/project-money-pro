/**
 * core/api.js
 * ------------------------------------------------------------
 * One generic CRUD service, reused by every table in the schema.
 * When Supabase isn't configured yet (see config.js), calls are
 * served from an in-memory store per table so pages remain fully
 * interactive during development.
 * ------------------------------------------------------------
 */
import { getSupabaseClient, IS_CONFIGURED } from './config.js';

const _memoryStore = {};

function uuid() {
  return crypto.randomUUID();
}

function memTable(table) {
  if (!_memoryStore[table]) _memoryStore[table] = [];
  return _memoryStore[table];
}

/**
 * Creates a CRUD service scoped to one table.
 * @param {string} table - table name, matching database/schema.sql
 */
export function createService(table) {
  return {
    async list({ filters = {}, orderBy = null, ascending = false, limit = null } = {}) {
      if (IS_CONFIGURED) {
        const client = await getSupabaseClient();
        let query = client.from(table).select('*');
        for (const [key, value] of Object.entries(filters)) {
          query = query.eq(key, value);
        }
        if (orderBy) query = query.order(orderBy, { ascending });
        if (limit) query = query.limit(limit);
        const { data, error } = await query;
        if (error) throw error;
        return data;
      }
      let rows = memTable(table).filter((row) =>
        Object.entries(filters).every(([k, v]) => row[k] === v)
      );
      if (orderBy) {
        rows = [...rows].sort((a, b) => {
          const dir = ascending ? 1 : -1;
          return a[orderBy] > b[orderBy] ? dir : -dir;
        });
      }
      return limit ? rows.slice(0, limit) : rows;
    },

    async get(id) {
      if (IS_CONFIGURED) {
        const client = await getSupabaseClient();
        const { data, error } = await client.from(table).select('*').eq('id', id).single();
        if (error) throw error;
        return data;
      }
      return memTable(table).find((r) => r.id === id) || null;
    },

    async create(record) {
      if (IS_CONFIGURED) {
        const client = await getSupabaseClient();
        const { data, error } = await client.from(table).insert(record).select().single();
        if (error) throw error;
        return data;
      }
      const row = { id: uuid(), created_at: new Date().toISOString(), ...record };
      memTable(table).push(row);
      return row;
    },

    async update(id, patch) {
      if (IS_CONFIGURED) {
        const client = await getSupabaseClient();
        const { data, error } = await client.from(table).update(patch).eq('id', id).select().single();
        if (error) throw error;
        return data;
      }
      const rows = memTable(table);
      const idx = rows.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error(`${table} record ${id} not found`);
      rows[idx] = { ...rows[idx], ...patch };
      return rows[idx];
    },

    async remove(id) {
      if (IS_CONFIGURED) {
        const client = await getSupabaseClient();
        const { error } = await client.from(table).delete().eq('id', id);
        if (error) throw error;
        return true;
      }
      const rows = memTable(table);
      const idx = rows.findIndex((r) => r.id === id);
      if (idx > -1) rows.splice(idx, 1);
      return true;
    },

    /** Subscribes to realtime changes (no-op offline). Returns an unsubscribe fn. */
    async subscribe(onChange) {
      if (!IS_CONFIGURED) return () => {};
      const client = await getSupabaseClient();
      const channel = client
        .channel(`realtime:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, onChange)
        .subscribe();
      return () => client.removeChannel(channel);
    },
  };
}
