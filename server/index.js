import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import appRouter from '../src/index.js';
import { createStaticAssets } from './assets.js';
import { PostgresKV, sanitizeDatabaseUrl } from './kv-postgres.js';
import { SqliteKV } from './kv.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

function firstHeaderValue(value) {
	if (Array.isArray(value)) return value[0];
	if (typeof value === 'string') return value.split(',')[0].trim();
	return '';
}

function getRequestProtocol(req, trustProxy) {
	if (trustProxy) {
		const forwardedProto = firstHeaderValue(req.headers['x-forwarded-proto']);
		if (forwardedProto === 'https' || forwardedProto === 'http') {
			return forwardedProto;
		}
	}
	return req.socket?.encrypted ? 'https' : 'http';
}

function getRequestHost(req, trustProxy, fallbackPort) {
	if (trustProxy) {
		const forwardedHost = firstHeaderValue(req.headers['x-forwarded-host']);
		if (forwardedHost) return forwardedHost;
	}
	return req.headers.host || `127.0.0.1:${fallbackPort}`;
}

async function readNodeRequestBody(req) {
	const chunks = [];
	for await (const chunk of req) {
		chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
	}
	return Buffer.concat(chunks);
}

async function toWebRequest(req, { trustProxy = true, port = 8787 } = {}) {
	const protocol = getRequestProtocol(req, trustProxy);
	const host = getRequestHost(req, trustProxy, port);
	const url = `${protocol}://${host}${req.url || '/'}`;

	const headers = new Headers();
	for (const [key, value] of Object.entries(req.headers)) {
		if (value === undefined) continue;
		if (Array.isArray(value)) {
			for (const item of value) {
				headers.append(key, item);
			}
		} else {
			headers.set(key, value);
		}
	}

	const method = (req.method || 'GET').toUpperCase();
	const init = { method, headers };

	if (method !== 'GET' && method !== 'HEAD') {
		const body = await readNodeRequestBody(req);
		if (body.byteLength > 0) {
			init.body = body;
		}
	}

	return new Request(url, init);
}

async function writeWebResponse(webResponse, res) {
	res.statusCode = webResponse.status;

	const setCookies = typeof webResponse.headers.getSetCookie === 'function'
		? webResponse.headers.getSetCookie()
		: [];

	for (const [key, value] of webResponse.headers.entries()) {
		if (key.toLowerCase() === 'set-cookie') continue;
		res.setHeader(key, value);
	}

	if (setCookies.length > 0) {
		res.setHeader('Set-Cookie', setCookies);
	}

	if (!webResponse.body) {
		res.end();
		return;
	}

	const buffer = Buffer.from(await webResponse.arrayBuffer());
	res.end(buffer);
}

export function buildAppEnv(options = {}) {
	const sourceEnv = options.env || process.env;
	const publicDir = options.publicDir || resolve(PROJECT_ROOT, 'public');
	const databaseUrl = (options.databaseUrl ?? sourceEnv.DATABASE_URL ?? '').trim();

	let kv;
	let storageType;
	let storageTarget;

	if (options.kv) {
		kv = options.kv;
		storageType = 'custom';
		storageTarget = 'custom';
	} else if (databaseUrl) {
		kv = new PostgresKV(databaseUrl, {
			databaseSsl: options.databaseSsl ?? sourceEnv.DATABASE_SSL,
			databaseCaCert: options.databaseCaCert ?? sourceEnv.DATABASE_CA_CERT,
			databaseCaCertPath: options.databaseCaCertPath ?? sourceEnv.DATABASE_CA_CERT_PATH,
			maxConnections: sourceEnv.PG_POOL_MAX
		});
		storageType = 'postgresql';
		storageTarget = sanitizeDatabaseUrl(databaseUrl);
	} else {
		const dataDir = options.dataDir || sourceEnv.DATA_DIR || resolve(PROJECT_ROOT, 'data');
		const dbPath = options.dbPath || sourceEnv.DB_PATH || (dataDir === ':memory:' ? ':memory:' : resolve(dataDir, 'clash-sub.sqlite'));
		kv = new SqliteKV(dbPath);
		storageType = 'sqlite';
		storageTarget = dbPath;
	}

	const assets = options.assets || createStaticAssets(publicDir);

	// ACCESS_TOKEN_ENABLED defaults to "true" unless explicitly disabled
	const accessTokenEnabled = sourceEnv.ACCESS_TOKEN_ENABLED !== undefined
		? String(sourceEnv.ACCESS_TOKEN_ENABLED)
		: 'true';

	const appEnv = {
		CLASH_KV: kv,
		ASSETS: assets,
		ACCESS_TOKEN_ENABLED: accessTokenEnabled,
		ACCESS_TOKEN: sourceEnv.ACCESS_TOKEN || '',
		ACCESS_TOKEN_DEV: sourceEnv.ACCESS_TOKEN_DEV || '',
		ENVIRONMENT: sourceEnv.ENVIRONMENT || ''
	};

	return { appEnv, kv, storageType, storageTarget };
}

export function createAppServer(options = {}) {
	const sourceEnv = options.env || process.env;
	const port = Number(options.port ?? sourceEnv.PORT ?? 8787);
	const host = options.host ?? sourceEnv.HOST ?? '0.0.0.0';
	const trustProxy = options.trustProxy ?? (sourceEnv.TRUST_PROXY !== 'false');

	const { appEnv, kv, storageType, storageTarget } = buildAppEnv(options);

	const server = createServer(async (req, res) => {
		try {
			// Lightweight container health endpoint
			if (req.url === '/healthz' && (req.method === 'GET' || req.method === 'HEAD')) {
				res.statusCode = 200;
				res.setHeader('Content-Type', 'application/json');
				res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ ok: true, storage: storageType }));
				return;
			}

			const webRequest = await toWebRequest(req, { trustProxy, port });
			const webResponse = await appRouter.fetch(webRequest, appEnv);
			await writeWebResponse(webResponse, res);
		} catch (error) {
			console.error('[server] Unhandled request error:', error);
			if (!res.headersSent) {
				res.statusCode = 500;
				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify({ success: false, error: 'Internal Server Error' }));
			} else if (!res.writableEnded) {
				res.end();
			}
		}
	});

	// Periodically purge expired subscription snapshots (every 6 hours)
	const purgeInterval = setInterval(async () => {
		try {
			await kv.purgeExpired?.();
		} catch (error) {
			console.warn('[kv] Failed to purge expired entries:', error.message);
		}
	}, 6 * 60 * 60 * 1000);
	purgeInterval.unref();

	server.on('close', () => {
		clearInterval(purgeInterval);
		if (!options.kv) {
			Promise.resolve(kv.close?.()).catch((error) => {
				console.warn('[kv] Failed to close storage:', error.message);
			});
		}
	});

	return { server, appEnv, kv, storageType, storageTarget, host, port };
}

const isMainModule = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
	const { server, appEnv, kv, storageType, storageTarget, host, port } = createAppServer();

	try {
		await kv.init?.();
	} catch (error) {
		console.error(`[storage] Failed to initialize ${storageType} (${storageTarget}):`, error.message);
		process.exit(1);
	}

	server.listen(port, host, () => {
		const authEnabled = appEnv.ACCESS_TOKEN_ENABLED === 'true';
		console.log(`Clash Sub Docker server listening on http://${host}:${port}`);
		console.log(`Storage (${storageType}): ${storageTarget}`);
		console.log(`Access token auth: ${authEnabled ? 'enabled' : 'disabled'}`);
		if (authEnabled && !appEnv.ACCESS_TOKEN && !appEnv.ACCESS_TOKEN_DEV) {
			console.warn('WARNING: ACCESS_TOKEN_ENABLED=true but neither ACCESS_TOKEN nor ACCESS_TOKEN_DEV is configured!');
		}
	});

	const shutdown = (signal) => {
		console.log(`Received ${signal}, shutting down gracefully...`);
		server.close(() => {
			process.exit(0);
		});
		setTimeout(() => process.exit(1), 5000).unref();
	};

	process.on('SIGINT', () => shutdown('SIGINT'));
	process.on('SIGTERM', () => shutdown('SIGTERM'));
}
