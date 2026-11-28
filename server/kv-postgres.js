import { readFileSync } from 'node:fs';
import pg from 'pg';

const { Pool } = pg;

function normalizeCaCert(caCert, caCertPath) {
	let raw = typeof caCert === 'string' ? caCert.trim() : '';
	if (!raw && typeof caCertPath === 'string' && caCertPath.trim()) {
		raw = readFileSync(caCertPath.trim(), 'utf8').trim();
	}
	if (!raw) return null;

	// Support literal \n sequences pasted into single-line env var inputs
	if (raw.includes('\\n')) {
		raw = raw.replace(/\\n/g, '\n');
	}
	if (raw.includes('-----BEGIN CERTIFICATE-----')) {
		return raw;
	}

	// Support Base64-encoded PEM certificate (convenient for Render / Docker env vars)
	try {
		const decoded = Buffer.from(raw, 'base64').toString('utf8').trim();
		if (decoded.includes('-----BEGIN CERTIFICATE-----')) {
			return decoded;
		}
	} catch {
		// Fall through and return raw
	}

	return raw;
}

export function resolveSslConfig(connectionString, { databaseSsl, databaseCaCert, databaseCaCertPath } = {}) {
	const explicit = typeof databaseSsl === 'string' ? databaseSsl.trim().toLowerCase() : '';
	if (explicit === 'false' || explicit === '0' || explicit === 'disable' || explicit === 'off') {
		return false;
	}

	const ca = normalizeCaCert(databaseCaCert, databaseCaCertPath);
	if (ca) {
		const rejectUnauthorized = explicit !== 'no-verify';
		return { rejectUnauthorized, ca };
	}

	if (explicit === 'verify-full' || explicit === 'verify-ca' || explicit === 'strict') {
		return { rejectUnauthorized: true };
	}
	if (explicit === 'true' || explicit === '1' || explicit === 'require' || explicit === 'no-verify') {
		return { rejectUnauthorized: false };
	}

	try {
		const parsed = new URL(connectionString);
		const sslmode = (parsed.searchParams.get('sslmode') || '').toLowerCase();
		if (sslmode === 'disable') {
			return false;
		}
		if (sslmode === 'verify-full' || sslmode === 'verify-ca') {
			return { rejectUnauthorized: true };
		}
		if (sslmode === 'require' || sslmode === 'prefer' || sslmode === 'allow') {
			return { rejectUnauthorized: false };
		}

		const host = parsed.hostname.toLowerCase();
		const isLocalHost =
			host === 'localhost' ||
			host === '127.0.0.1' ||
			host === '::1' ||
			!host.includes('.');
		return isLocalHost ? false : { rejectUnauthorized: false };
	} catch {
		return false;
	}
}

export function stripSslParams(connectionString) {
	try {
		const parsed = new URL(connectionString);
		for (const param of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'uselibpqcompat', 'channel_binding']) {
			if (parsed.searchParams.has(param)) {
				parsed.searchParams.delete(param);
			}
		}
		return parsed.toString();
	} catch {
		return connectionString;
	}
}

export function sanitizeDatabaseUrl(connectionString) {
	try {
		const parsed = new URL(connectionString);
		const dbName = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : '';
		return `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}${dbName}`;
	} catch {
		return 'postgresql://<configured>';
	}
}

/**
 * Persistent key-value store backed by PostgreSQL.
 * Compatible with Aiven, Neon, Supabase, Railway, Render Postgres, and self-hosted PostgreSQL.
 * Preserves the exact KV key contract and expirationTtl semantics.
 */
export class PostgresKV {
	constructor(connectionString, options = {}) {
		if (!connectionString) {
			throw new Error('DATABASE_URL is required for PostgresKV');
		}

		const ssl = options.ssl !== undefined
			? options.ssl
			: resolveSslConfig(connectionString, {
				databaseSsl: options.databaseSsl,
				databaseCaCert: options.databaseCaCert,
				databaseCaCertPath: options.databaseCaCertPath
			});

		this.connectionString = connectionString;
		this.displayTarget = sanitizeDatabaseUrl(connectionString);
		this.pool = options.pool || new Pool({
			// Strip sslmode/ssl* query params so pg never silently overrides our explicit ssl object (fixes Aiven self-signed CA)
			connectionString: stripSslParams(connectionString),
			ssl,
			// Default 5 connections keeps usage well within Aiven Free Tier's 20-connection limit during rolling deploys
			max: Number(options.maxConnections) || 5,
			idleTimeoutMillis: 30_000,
			connectionTimeoutMillis: Number(options.connectionTimeoutMillis) || 15_000
		});

		this.pool.on('error', (err) => {
			console.error('[pg-kv] Unexpected idle client error:', err.message);
		});

		this._initPromise = null;
	}

	async init() {
		if (!this._initPromise) {
			this._initPromise = (async () => {
				await this.pool.query(`
					CREATE TABLE IF NOT EXISTS clash_sub_kv (
						key TEXT PRIMARY KEY,
						value TEXT NOT NULL,
						expires_at BIGINT,
						updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
					)
				`);
				await this.pool.query(`
					CREATE INDEX IF NOT EXISTS idx_clash_sub_kv_expires_at
					ON clash_sub_kv (expires_at)
					WHERE expires_at IS NOT NULL
				`);
			})().catch((error) => {
				this._initPromise = null;
				throw error;
			});
		}
		return this._initPromise;
	}

	async get(key, options) {
		await this.init();
		const keyStr = String(key);
		const result = await this.pool.query(
			'SELECT value, expires_at FROM clash_sub_kv WHERE key = $1',
			[keyStr]
		);
		const row = result.rows[0];
		if (!row) return null;

		const expiresAt = row.expires_at !== null && row.expires_at !== undefined
			? Number(row.expires_at)
			: null;
		if (expiresAt !== null && expiresAt <= Date.now()) {
			await this.pool.query('DELETE FROM clash_sub_kv WHERE key = $1', [keyStr]);
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
		await this.init();
		let expiresAt = null;
		if (options && typeof options === 'object') {
			if (Number.isFinite(options.expiration)) {
				expiresAt = Math.floor(options.expiration * 1000);
			} else if (Number.isFinite(options.expirationTtl)) {
				expiresAt = Date.now() + Math.floor(options.expirationTtl * 1000);
			}
		}

		const stringValue = typeof value === 'string' ? value : String(value);
		await this.pool.query(
			`INSERT INTO clash_sub_kv (key, value, expires_at, updated_at)
			 VALUES ($1, $2, $3, NOW())
			 ON CONFLICT (key) DO UPDATE SET
				value = EXCLUDED.value,
				expires_at = EXCLUDED.expires_at,
				updated_at = NOW()`,
			[String(key), stringValue, expiresAt]
		);
	}

	async delete(key) {
		await this.init();
		await this.pool.query('DELETE FROM clash_sub_kv WHERE key = $1', [String(key)]);
	}

	async list(options = {}) {
		await this.init();
		const prefix = options?.prefix ? String(options.prefix) : '';
		const limit = Number.isFinite(options?.limit) && options.limit > 0 ? Math.min(options.limit, 1000) : 1000;
		const escapedPrefix = prefix.replace(/[\\%_]/g, '\\$&') + '%';
		const now = Date.now();

		const result = await this.pool.query(
			`SELECT key, expires_at FROM clash_sub_kv
			 WHERE (expires_at IS NULL OR expires_at > $1)
			 AND key LIKE $2 ESCAPE '\\'
			 ORDER BY key ASC
			 LIMIT $3`,
			[now, escapedPrefix, limit]
		);

		return {
			keys: result.rows.map((row) => ({
				name: row.key,
				expiration: row.expires_at !== null && row.expires_at !== undefined
					? Math.floor(Number(row.expires_at) / 1000)
					: undefined
			})),
			list_complete: result.rows.length < limit,
			cursor: undefined
		};
	}

	async purgeExpired() {
		await this.init();
		return this.pool.query(
			'DELETE FROM clash_sub_kv WHERE expires_at IS NOT NULL AND expires_at <= $1',
			[Date.now()]
		);
	}

	async ping() {
		await this.pool.query('SELECT 1');
		return true;
	}

	async close() {
		await this.pool.end();
	}
}
