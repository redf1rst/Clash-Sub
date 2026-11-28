import { resolve } from 'node:path';
import { createStaticAssets } from '../../server/assets.js';

export function createMemoryKV(initialEntries = []) {
	const store = new Map(initialEntries);
	return {
		async get(key, options) {
			const entry = store.get(String(key));
			if (!entry) return null;
			if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
				store.delete(String(key));
				return null;
			}
			const type = typeof options === 'string' ? options : options?.type;
			if (type === 'json') return JSON.parse(entry.value);
			if (type === 'arrayBuffer') return new TextEncoder().encode(entry.value).buffer;
			return entry.value;
		},
		async put(key, value, options = {}) {
			let expiresAt = null;
			if (options && typeof options === 'object') {
				if (Number.isFinite(options.expiration)) {
					expiresAt = Math.floor(options.expiration * 1000);
				} else if (Number.isFinite(options.expirationTtl)) {
					expiresAt = Date.now() + Math.floor(options.expirationTtl * 1000);
				}
			}
			store.set(String(key), { value: typeof value === 'string' ? value : String(value), expiresAt });
		},
		async delete(key) {
			store.delete(String(key));
		},
		async list(options = {}) {
			const prefix = options?.prefix ? String(options.prefix) : '';
			const limit = Number.isFinite(options?.limit) && options.limit > 0 ? Math.min(options.limit, 1000) : 1000;
			const now = Date.now();
			const keys = [];
			for (const [name, entry] of store.entries()) {
				if (entry.expiresAt !== null && entry.expiresAt <= now) continue;
				if (!name.startsWith(prefix)) continue;
				keys.push({
					name,
					expiration: entry.expiresAt !== null ? Math.floor(entry.expiresAt / 1000) : undefined
				});
			}
			keys.sort((a, b) => a.name.localeCompare(b.name));
			const sliced = keys.slice(0, limit);
			return { keys: sliced, list_complete: sliced.length < limit, cursor: undefined };
		},
		clear() {
			store.clear();
		}
	};
}

export function createTestEnv(overrides = {}) {
	return {
		ACCESS_TOKEN_ENABLED: 'false',
		ACCESS_TOKEN: '',
		ACCESS_TOKEN_DEV: 'dev-token-123',
		CLASH_KV: createMemoryKV(),
		ASSETS: createStaticAssets(resolve(process.cwd(), 'public')),
		...overrides
	};
}

/**
 * Lightweight fetch mock helper for pure Node.js tests.
 */
export function createFetchMock() {
	const interceptors = [];
	let originalFetch = null;
	let netConnectDisabled = false;

	async function mockedFetch(input, init) {
		const reqUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
		const parsed = new URL(reqUrl);
		const method = (init?.method || (typeof input === 'object' && input?.method) || 'GET').toUpperCase();

		const matchIndex = interceptors.findIndex(item =>
			item.origin === parsed.origin &&
			item.path === (parsed.pathname + parsed.search) &&
			(!item.method || item.method === method)
		);

		if (matchIndex === -1) {
			if (netConnectDisabled) {
				throw new Error(`Unexpected outbound fetch in test (net connect disabled): ${method} ${reqUrl}`);
			}
			return originalFetch(input, init);
		}

		const interceptor = interceptors[matchIndex];
		if (!interceptor.persistent) {
			interceptors.splice(matchIndex, 1);
		}

		const reply = typeof interceptor.handler === 'function'
			? await interceptor.handler({ origin: parsed.origin, path: parsed.pathname + parsed.search, method, headers: init?.headers })
			: { statusCode: interceptor.statusCode, data: interceptor.body, responseOptions: interceptor.options };

		const status = reply.statusCode ?? 200;
		const body = reply.data ?? '';
		const headers = reply.responseOptions?.headers || interceptor.options?.headers || {};
		return new Response(body, { status, headers });
	}

	const api = {
		activate() {
			interceptors.length = 0;
			if (!originalFetch) {
				originalFetch = globalThis.fetch;
				globalThis.fetch = mockedFetch;
			}
		},
		deactivate() {
			interceptors.length = 0;
			netConnectDisabled = false;
			if (originalFetch) {
				globalThis.fetch = originalFetch;
				originalFetch = null;
			}
		},
		disableNetConnect() {
			netConnectDisabled = true;
		},
		get(origin) {
			const normalizedOrigin = new URL(origin).origin;
			return {
				intercept({ path = '/', method = 'GET' } = {}) {
					return {
						reply(statusOrFn, body, options) {
							const record = {
								origin: normalizedOrigin,
								path,
								method: method ? method.toUpperCase() : null,
								handler: typeof statusOrFn === 'function' ? statusOrFn : null,
								statusCode: typeof statusOrFn === 'number' ? statusOrFn : 200,
								body,
								options,
								persistent: false
							};
							interceptors.push(record);
							return {
								persist() {
									record.persistent = true;
									return this;
								}
							};
						}
					};
				}
			};
		},
		assertNoPendingInterceptors() {
			const pending = interceptors.filter(item => !item.persistent);
			if (pending.length > 0) {
				throw new Error(`Pending fetchMock interceptors: ${pending.map(p => `${p.origin}${p.path}`).join(', ')}`);
			}
		}
	};

	return api;
}
