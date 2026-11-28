import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, before, after } from 'node:test';
import { parse as parseYaml } from 'yaml';
import { buildAppEnv, createAppServer } from '../server/index.js';
import { PostgresKV, resolveSslConfig, sanitizeDatabaseUrl, stripSslParams } from '../server/kv-postgres.js';
import { SqliteKV } from '../server/kv.js';

function startTestServer(envOverrides = {}, dataDir) {
	return new Promise((resolvePromise, reject) => {
		const app = createAppServer({
			port: 0,
			host: '127.0.0.1',
			dataDir,
			env: {
				ACCESS_TOKEN_ENABLED: 'true',
				ACCESS_TOKEN: 'my=secret;token',
				ENVIRONMENT: 'production',
				TRUST_PROXY: 'true',
				...envOverrides
			}
		});
		app.server.once('error', reject);
		app.server.listen(0, '127.0.0.1', () => {
			const address = app.server.address();
			resolvePromise({
				...app,
				baseUrl: `http://127.0.0.1:${address.port}`
			});
		});
	});
}

function closeServer(server) {
	return new Promise((resolvePromise, reject) => {
		server.close(err => (err ? reject(err) : resolvePromise()));
	});
}

describe('Docker Node.js runtime adapter', () => {
	let tempDir;
	let instance;

	before(async () => {
		tempDir = mkdtempSync(join(tmpdir(), 'clash-sub-docker-test-'));
		instance = await startTestServer({}, tempDir);
	});

	after(async () => {
		if (instance?.server) {
			await closeServer(instance.server);
		}
		if (tempDir) {
			rmSync(tempDir, { recursive: true, force: true });
		}
	});

	it('serves /healthz without authentication', async () => {
		const res = await fetch(`${instance.baseUrl}/healthz`);
		assert.equal(res.status, 200);
		assert.deepEqual(await res.json(), { ok: true, storage: 'sqlite' });
	});

	it('redirects unauthenticated page requests to /auth and serves /auth.html cleanly', async () => {
		const res = await fetch(`${instance.baseUrl}/?tab=sub`, { redirect: 'manual' });
		assert.equal(res.status, 302);
		assert.match(decodeURIComponent(res.headers.get('location') || ''), /\/auth\?redirect=\/\?tab=sub$/);

		const authPage = await fetch(`${instance.baseUrl}/auth`);
		assert.equal(authPage.status, 200);
		assert.match(authPage.headers.get('content-type') || '', /text\/html/);
		const html = await authPage.text();
		assert.match(html, /访问验证/);
	});

	it('returns 401 JSON for unauthenticated API calls and preserves dual Set-Cookie headers on login', async () => {
		const unauth = await fetch(`${instance.baseUrl}/api/proxy-collections`);
		assert.equal(unauth.status, 401);
		assert.match(unauth.headers.get('content-type') || '', /application\/json/);

		const loginRes = await fetch(`${instance.baseUrl}/api/verify-token`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Forwarded-Proto': 'https'
			},
			body: JSON.stringify({ token: 'my=secret;token' })
		});
		assert.equal(loginRes.status, 200);
		const setCookies = loginRes.headers.getSetCookie();
		assert.equal(setCookies.length, 2);

		const httpOnlyCookie = setCookies.find(c => c.startsWith('access_token='));
		const clientCookie = setCookies.find(c => c.startsWith('access_token_client='));
		assert.ok(httpOnlyCookie);
		assert.ok(clientCookie);
		assert.match(httpOnlyCookie, /HttpOnly/);
		assert.match(httpOnlyCookie, /SameSite=Lax/);
		assert.match(httpOnlyCookie, /Secure/);
		assert.match(clientCookie, /SameSite=Lax/);
		assert.match(clientCookie, /Secure/);

		const cookieHeader = setCookies.map(c => c.split(';')[0]).join('; ');
		const indexRes = await fetch(`${instance.baseUrl}/`, { headers: { Cookie: cookieHeader } });
		assert.equal(indexRes.status, 200);
		assert.match(indexRes.headers.get('content-type') || '', /text\/html/);

		// Create proxy collection, add a node, and generate Clash/Stash/sing-box/QX configs
		const createRes = await fetch(`${instance.baseUrl}/api/proxy-collections`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
			body: JSON.stringify({ action: 'create', data: { name: 'DockerTest' } })
		});
		assert.equal(createRes.status, 200);
		const created = await createRes.json();
		assert.equal(created.success, true);
		const collectionId = created.collection.id;

		const addProxyRes = await fetch(`${instance.baseUrl}/api/proxy-collections`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
			body: JSON.stringify({
				action: 'addProxy',
				data: {
					collectionId,
					region: 'HK',
					proxyUrls: 'vless://11111111-1111-1111-1111-111111111111@hk.example.com:443?encryption=none&security=tls#HK-Node-01'
				}
			})
		});
		assert.equal(addProxyRes.status, 200);
		const added = await addProxyRes.json();
		assert.equal(added.success, true);
		assert.equal(added.successCount, 1);

		// Subscription endpoint is whitelisted (no cookie needed)
		const clashRes = await fetch(`${instance.baseUrl}/clash/proxies/${collectionId}`);
		assert.equal(clashRes.status, 200);
		assert.match(clashRes.headers.get('content-type') || '', /text\/yaml/);
		const clashConfig = parseYaml(await clashRes.text());
		assert.equal(clashConfig.proxies.length, 1);
		assert.equal(clashConfig.rules.at(-1), 'MATCH,🚀 默认代理');
		assert.equal(clashConfig['proxy-groups'].length, 23);

		const singboxRes = await fetch(`${instance.baseUrl}/clash/proxies/${collectionId}?target=singbox`);
		assert.equal(singboxRes.status, 200);
		const singboxConfig = await singboxRes.json();
		assert.equal(singboxConfig.route.final, '🚀 默认代理');

		const qxRes = await fetch(`${instance.baseUrl}/clash/proxies/${collectionId}?target=qx`);
		assert.equal(qxRes.status, 200);
		assert.match(qxRes.headers.get('content-type') || '', /text\/plain/);

		// Verify clear-token returns both clearing Set-Cookie headers
		const clearRes = await fetch(`${instance.baseUrl}/api/clear-token`, {
			method: 'POST',
			headers: { Cookie: cookieHeader, 'X-Forwarded-Proto': 'https' }
		});
		assert.equal(clearRes.status, 200);
		assert.equal(clearRes.headers.getSetCookie().length, 2);
	});

	it('persists SQLite KV data across restarts and honors expirationTtl', async () => {
		const persistDir = mkdtempSync(join(tmpdir(), 'clash-sub-persist-'));
		try {
			const dbPath = join(persistDir, 'clash-sub.sqlite');
			const kv1 = new SqliteKV(dbPath);
			await kv1.put('proxy_collections', JSON.stringify([{ id: 'col_1', name: 'Persist', proxies: [] }]));
			await kv1.put('temp_key', 'short-lived', { expirationTtl: -1 });
			await kv1.close();

			const kv2 = new SqliteKV(dbPath);
			const saved = await kv2.get('proxy_collections');
			assert.equal(JSON.parse(saved)[0].name, 'Persist');
			assert.equal(await kv2.get('temp_key'), null);
			await kv2.close();
		} finally {
			rmSync(persistDir, { recursive: true, force: true });
		}
	});

	it('selects PostgreSQL storage when DATABASE_URL is configured and supports KV semantics', async () => {
		const store = new Map();
		const fakePool = {
			on() {},
			async end() {},
			async query(sql, params = []) {
				const normalized = sql.replace(/\s+/g, ' ').trim();
				if (normalized.startsWith('CREATE TABLE') || normalized.startsWith('CREATE INDEX')) {
					return { rows: [] };
				}
				if (normalized.startsWith('INSERT INTO clash_sub_kv')) {
					const [key, value, expiresAt] = params;
					store.set(key, { value, expires_at: expiresAt });
					return { rows: [] };
				}
				if (normalized.startsWith('SELECT value, expires_at FROM clash_sub_kv')) {
					const row = store.get(params[0]);
					return { rows: row ? [row] : [] };
				}
				if (normalized.startsWith('DELETE FROM clash_sub_kv WHERE key = $1')) {
					store.delete(params[0]);
					return { rows: [] };
				}
				if (normalized.startsWith('SELECT key, expires_at FROM clash_sub_kv')) {
					const [now, pattern, limit] = params;
					const prefix = pattern.slice(0, -1).replace(/\\([%_\\])/g, '$1');
					const rows = [...store.entries()]
						.filter(([k, v]) => (v.expires_at === null || Number(v.expires_at) > now) && k.startsWith(prefix))
						.sort(([a], [b]) => a.localeCompare(b))
						.slice(0, limit)
						.map(([key, v]) => ({ key, expires_at: v.expires_at }));
					return { rows };
				}
				if (normalized.startsWith('DELETE FROM clash_sub_kv WHERE expires_at IS NOT NULL')) {
					const [now] = params;
					for (const [k, v] of store.entries()) {
						if (v.expires_at !== null && Number(v.expires_at) <= now) store.delete(k);
					}
					return { rows: [] };
				}
				throw new Error(`Unexpected SQL in fakePool: ${normalized}`);
			}
		};

		const pgKv = new PostgresKV('postgresql://user:secret@ep-demo.aws.neon.tech/neondb?sslmode=require', { pool: fakePool });
		await pgKv.put('proxy_collections', JSON.stringify([{ id: 'pg_1', name: 'NeonCol', proxies: [] }]));
		await pgKv.put('subproxy:col1:abc', JSON.stringify({ proxies: [{ name: 'HK' }] }), { expirationTtl: 3600 });
		await pgKv.put('subproxy:col1:expired', 'old', { expirationTtl: -10 });

		assert.deepEqual(await pgKv.get('proxy_collections', 'json'), [{ id: 'pg_1', name: 'NeonCol', proxies: [] }]);
		assert.equal(await pgKv.get('subproxy:col1:expired'), null);

		const listed = await pgKv.list({ prefix: 'subproxy:col1:' });
		assert.deepEqual(listed.keys.map(k => k.name), ['subproxy:col1:abc']);
		await pgKv.delete('proxy_collections');
		assert.equal(await pgKv.get('proxy_collections'), null);

		assert.equal(
			sanitizeDatabaseUrl('postgresql://user:supersecret@ep-demo.aws.neon.tech:5432/neondb?sslmode=require'),
			'postgresql://ep-demo.aws.neon.tech:5432/neondb'
		);

		const built = buildAppEnv({
			env: {
				DATABASE_URL: 'postgresql://user:pass@db.example.com/clash_sub?sslmode=require',
				ACCESS_TOKEN_ENABLED: 'true',
				ACCESS_TOKEN: 'tok'
			}
		});
		assert.equal(built.storageType, 'postgresql');
		assert.equal(built.storageTarget, 'postgresql://db.example.com/clash_sub');
		await built.kv.close();

		// Aiven SSL compatibility: strips sslmode so pg doesn't override ssl object, supports raw/escaped/base64 CA cert
		const aivenUrl = 'postgres://avnadmin:secret@pg-demo.aivencloud.com:16625/defaultdb?sslmode=require';
		assert.equal(stripSslParams(aivenUrl), 'postgres://avnadmin:secret@pg-demo.aivencloud.com:16625/defaultdb');
		assert.deepEqual(resolveSslConfig(aivenUrl), { rejectUnauthorized: false });

		const fakePem = '-----BEGIN CERTIFICATE-----\nMIIFakeCertData\n-----END CERTIFICATE-----';
		const escapedPem = fakePem.replace(/\n/g, '\\n');
		const base64Pem = Buffer.from(fakePem, 'utf8').toString('base64');
		assert.deepEqual(resolveSslConfig(aivenUrl, { databaseCaCert: escapedPem }), {
			rejectUnauthorized: true,
			ca: fakePem
		});
		assert.deepEqual(resolveSslConfig(aivenUrl, { databaseCaCert: base64Pem }), {
			rejectUnauthorized: true,
			ca: fakePem
		});
	});
});
