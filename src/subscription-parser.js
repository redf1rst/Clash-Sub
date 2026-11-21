import { parse as parseYaml } from 'yaml';

const DEFAULT_MAX_BYTES = 3 * 1024 * 1024;
const DEFAULT_MAX_PROXIES = 2000;
const PROXY_URI_SCHEMES = new Set([
	'vmess', 'vless', 'ss', 'ssr', 'hysteria', 'hysteria2', 'hy2', 'trojan', 'tuic',
	'socks5', 'http', 'https', 'snell', 'wg', 'wireguard', 'mieru', 'anytls', 'ssh'
]);

function utf8Bytes(value) {
	return new TextEncoder().encode(value).byteLength;
}

function decodeBase64(value) {
	const compact = value.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
	if (!compact || !/^[A-Za-z0-9+/]*={0,2}$/.test(compact)) return null;
	const padded = compact + '='.repeat((4 - compact.length % 4) % 4);
	try {
		const binary = atob(padded);
		const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
		return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '').trim();
	} catch {
		return null;
	}
}

function isProxyUri(value) {
	const scheme = value.match(/^([a-z][a-z0-9+.-]*):\/\//i)?.[1]?.toLowerCase();
	return scheme && PROXY_URI_SCHEMES.has(scheme);
}

function normalizeProxyObject(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	const name = typeof value.name === 'string' ? value.name.trim() : String(value.name ?? '').trim();
	const type = typeof value.type === 'string' ? value.type.trim().toLowerCase() : '';
	const server = typeof value.server === 'string' ? value.server.trim() : String(value.server ?? '').trim();
	const port = Number(value.port);
	if (!name || !type || !server || !Number.isInteger(port) || port < 1 || port > 65535) return null;
	return { ...value, name, type, server, port };
}

function parseProxyUri(value, parseProxyUrl) {
	const normalized = value.replace(/^([a-z][a-z0-9+.-]*):\/\//i, (_, scheme) => `${scheme.toLowerCase()}://`);
	return parseProxyUrl?.(normalized);
}

function collectCandidates(value, parseProxyUrl) {
	const diagnostics = [];
	let parsed;
	let format;
	try {
		parsed = JSON.parse(value);
		format = 'json';
	} catch {
		try {
			parsed = parseYaml(value, { maxAliasCount: 50, uniqueKeys: true });
			format = 'clash-yaml';
		} catch (error) {
			diagnostics.push(`YAML 解析失败: ${error.message}`);
		}
	}

	let items = null;
	if (Array.isArray(parsed)) {
		items = parsed;
	} else if (parsed && typeof parsed === 'object') {
		if (Array.isArray(parsed.proxies)) items = parsed.proxies;
		else if (Array.isArray(parsed.outbounds)) items = parsed.outbounds;
	}

	if (items) {
		const proxies = [];
		for (const item of items) {
			const proxy = typeof item === 'string'
				? (isProxyUri(item.trim()) ? parseProxyUri(item.trim(), parseProxyUrl) : null)
				: normalizeProxyObject(item);
			if (proxy) proxies.push(proxy);
			else diagnostics.push('忽略了格式无效或当前不支持的代理条目');
		}
		return { format: format || 'structured', proxies, diagnostics };
	}

	const proxies = [];
	for (const line of value.split(/\r?\n/)) {
		const candidate = line.trim().replace(/^\uFEFF/, '');
		if (!candidate || candidate.startsWith('#') || candidate.startsWith('//')) continue;
		if (!isProxyUri(candidate)) continue;
		const proxy = parseProxyUri(candidate, parseProxyUrl);
		if (proxy) proxies.push(proxy);
		else diagnostics.push(`代理链接解析失败: ${candidate.slice(0, 48)}`);
	}
	return { format: proxies.length ? 'uri-list' : format || 'unknown', proxies, diagnostics };
}

/**
 * Decode a Clash subscription payload from YAML/JSON, a URI list, or Base64-wrapped text.
 * URI links are converted with the caller's existing protocol parser; structured proxy
 * objects are retained verbatim apart from normalized name/type/server/port fields.
 */
export function decodeSubscriptionContent(input, options = {}) {
	const {
		parseProxyUrl,
		maxBytes = DEFAULT_MAX_BYTES,
		maxProxies = DEFAULT_MAX_PROXIES
	} = options;
	if (typeof input !== 'string' || !input.trim()) {
		return { format: 'empty', proxies: [], diagnostics: ['订阅内容为空'] };
	}
	if (utf8Bytes(input) > maxBytes) throw new Error(`订阅内容超过 ${maxBytes} 字节限制`);

	const raw = input.replace(/^\uFEFF/, '').trim();
	const candidates = [{ content: raw, base64: false }];
	let last = raw;
	for (let depth = 0; depth < 2; depth++) {
		const decoded = decodeBase64(last);
		if (!decoded || decoded === last || utf8Bytes(decoded) > maxBytes) break;
		candidates.push({ content: decoded, base64: true });
		last = decoded;
	}

	let best = { format: 'unknown', proxies: [], diagnostics: [] };
	for (const candidate of candidates) {
		const result = collectCandidates(candidate.content, parseProxyUrl);
		if (candidate.base64 && result.proxies.length) result.format = `base64-${result.format}`;
		if (result.proxies.length > maxProxies) throw new Error(`单个订阅超过 ${maxProxies} 个代理限制`);
		if (result.proxies.length > best.proxies.length) best = result;
	}
	if (best.proxies.length === 0 && !best.diagnostics.length) {
		best.diagnostics.push('未识别到有效代理：支持 Clash YAML/JSON、Base64 与代理链接列表');
	}
	return best;
}
