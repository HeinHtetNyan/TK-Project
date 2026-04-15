import Dexie from 'dexie';

/**
 * UUID generator that works in both secure (HTTPS) and non-secure (HTTP LAN)
 * contexts. Android Chrome over a local IP does NOT have crypto.randomUUID().
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: RFC 4122 v4 using Math.random()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Local IndexedDB database for offline-first support.
 *
 * Naming convention:
 *   client_id  — UUID generated on the client. Always present. Primary key locally.
 *   server_id  — Integer assigned by the backend after a successful sync. Null until synced.
 *   sync_status — 'synced' | 'pending' | 'failed'
 *
 * For customers that already exist on the server, client_id = 'server_<server_id>'.
 * For records created while offline, client_id = crypto.randomUUID().
 */
const db = new Dexie('TKPlasticPress');

db.version(1).stores({
  // Cached + offline-created customers
  customers: '&client_id, server_id, name, sync_status, created_at',

  // Cached + offline-created vouchers
  vouchers:
    '&client_id, server_id, customer_client_id, customer_server_id, voucher_number, sync_status, created_at',

  // Cached + offline-created standalone payments
  payments:
    '&client_id, server_id, customer_client_id, customer_server_id, sync_status, created_at',

  /**
   * sync_queue — one entry per operation that needs to reach the server.
   * localId    — auto-increment surrogate key (ordering guarantee)
   * client_id  — UUID of the record being synced (matches the record's client_id)
   * type       — 'customer' | 'voucher' | 'payment'
   * action     — 'create'  (update/delete are handled online-only for now)
   * payload    — full JSON to POST to the backend
   * status     — 'pending' | 'processing' | 'done' | 'failed'
   * retries    — how many times this item has failed
   * depends_on_client_id — if not null, this item must wait until the referenced
   *                         item reaches 'done' (used when a voucher/payment belongs
   *                         to a customer that was also created offline)
   */
  sync_queue:
    '++localId, client_id, type, action, status, depends_on_client_id, created_at',
});

export default db;
