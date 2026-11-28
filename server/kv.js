import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/**
 * Persistent key-value store backed by Node.js built-in SQLite.
 * Preserves the exact KV key contract (proxies, subscriptions, subscription_names,
 * proxy_collections, sub_collections, subproxy:{collectionId}:{sha256}) and expirationTtl semantics.
 */
export class SqliteKV {
	constructor(dbPath) {
		if (dbPath !== ':memory:') {
			mkdirSync(dirname(dbPath), { recursive: true });
		}
		this.db = new DatabaseSync(dbPath);
		this.db.exec('PRAGMA journal_mode = WAL;');
		this.db.exec('PRAGMA synchronous = NORMAL;');
		this.db.exec('PRAGMA busy_timeout = 5000;');
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS kv_entries (
				key TEXT PRIMARY KEY,
				value TEXT NOT NULL,
				expires_at INTEGER
			);
			CREATE INDEX IF NOT EXISTS idx_kv_expires_at ON kv_entries (expires_at);
		`);

		this._stmtGet = this.db.prepare('SELECT value, expires_at FROM kv_entries WHERE key = ?');
		this._stmtPut = this.db.prepare(`
			INSERT INTO kv_entries (key, value, expires_at)
			VALUES (?, ?, ?)
			ON CONFLICT(key) DO UPDATE SET
				value = excluded.value,
				expires_at = excluded.expires_at
		`);
		this._stmtDelete = this.db.prepare('DELETE FROM kv_entries WHERE key = ?');
		this._stmtPurgeExpired = this.db.prepare('DELETE FROM kv_entries WHERE expires_at IS NOT NULL AND expires_at <= ?');
		this._stmtList = this.db.prepare(`
			SELECT key, expires_at FROM kv_entries
			WHERE (expires_at IS NULL OR expires_at > ?)
			AND key LIKE ? ESCAPE '\\'
			ORDER BY key ASC
			LIMIT ?
		`);
	}

	async get(key, options) {
		const row = this._stmtGet.get(String(key));
		if (!row) return null;

		const now = Date.now();
		if (row.expires_at !== null && row.expires_at <= now) {
			this._stmtDelete.run(String(key));
			return null;
		}

		const type = typeof options === 'string' ? options : options?.type;
		if (type === 'json') {
			return JSON.parse(row.value);
		}
		if (type === 'arrayBuffer') {
			return new TextEncoder().encode(row.value).buffer;
		}
		return row.value;
	}

	async put(key, value, options = {}) {
		let expiresAt = null;
		if (options && typeof options === 'object') {
			if (Number.isFinite(options.expiration)) {
				expiresAt = Math.floor(options.expiration * 1000);
			} else if (Number.isFinite(options.expirationTtl)) {
				expiresAt = Date.now() + Math.floor(options.expirationTtl * 1000);
			}
		}

		const stringValue = typeof value === 'string' ? value : String(value);
		this._stmtPut.run(String(key), stringValue, expiresAt);
	}

	async delete(key) {
		this._stmtDelete.run(String(key));
	}

	async list(options = {}) {
		const prefix = options?.prefix ? String(options.prefix) : '';
		const limit = Number.isFinite(options?.limit) && options.limit > 0 ? Math.min(options.limit, 1000) : 1000;
		const escapedPrefix = prefix.replace(/[\\%_]/g, '\\$&') + '%';
		const now = Date.now();
		const rows = this._stmtList.all(now, escapedPrefix, limit);
		return {
			keys: rows.map(row => ({
				name: row.key,
				expiration: row.expires_at !== null ? Math.floor(row.expires_at / 1000) : undefined
			})),
			list_complete: rows.length < limit,
			cursor: undefined
		};
	}

	async init() {
		return;
	}

	async ping() {
		this.db.prepare('SELECT 1').get();
		return true;
	}

	purgeExpired() {
		return this._stmtPurgeExpired.run(Date.now());
	}

	async close() {
		this.db.close();
	}
}
