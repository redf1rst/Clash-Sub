import { parseProxyUrl } from '../parsers/proxy-url.js';
import { decodeSubscriptionContent } from '../subscription-parser.js';
import { fetchWithUserAgentRotation, readBoundedResponseText } from './fetch.js';

function generateSimpleProviderName(subName, existingNames) {
	let baseName = subName;
	if (!baseName) {
		const usedNumbers = new Set(existingNames.map(name => Number(name.match(/^订阅(\d{2})$/)?.[1])).filter(Number.isFinite));
		let counter = 1;
		while (usedNumbers.has(counter)) counter++;
		baseName = `订阅${String(counter).padStart(2, '0')}`;
	}
	let finalName = baseName;
	let counter = 2;
	while (existingNames.includes(finalName)) finalName = `${baseName}-${String(counter++).padStart(2, '0')}`;
	return finalName;
}

async function sha256Hex(value) {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function getSubscriptionProxyCacheKey(collectionId, subscriptionUrl) {
	return `subproxy:${collectionId}:${await sha256Hex(subscriptionUrl)}`;
}

const MAX_INLINE_PROXIES = 5000;

async function refreshSubscriptionProxies(collectionId, pairs, providerNames, env, enablePrefix) {
	const summary = { proxies: [], sources: 0, refreshed: 0, cacheHits: 0, failures: 0, truncated: false };
	const usedProxyNames = new Set();

	for (let offset = 0; offset < pairs.length; offset += 4) {
		const batch = pairs.slice(offset, offset + 4);
		const outcomes = await Promise.all(batch.map(async (pair, batchIndex) => {
			const index = offset + batchIndex;
			const cacheKey = await getSubscriptionProxyCacheKey(collectionId, pair.url);
			let cached = null;
			try {
				const rawCache = await env.CLASH_KV?.get(cacheKey);
				cached = rawCache ? JSON.parse(rawCache) : null;
			} catch { /* 忽略损坏缓存，继续尝试拉取最新内容 */ }
			try {
				const result = await fetchWithUserAgentRotation(pair.url, 4000, { retry: false });
				if (!result.success) throw new Error(`HTTP ${result.response?.status || 0}`);
				const content = await readBoundedResponseText(result.response);
				const decoded = decodeSubscriptionContent(content, { parseProxyUrl });
				if (!decoded.proxies.length) throw new Error(decoded.diagnostics[0] || '未识别到节点');
				const fingerprint = await sha256Hex(content);
				if (cached?.fingerprint !== fingerprint) {
					await env.CLASH_KV?.put(cacheKey, JSON.stringify({ proxies: decoded.proxies, format: decoded.format, fingerprint, savedAt: Date.now() }), { expirationTtl: 30 * 24 * 60 * 60 });
				}
				return { index, proxies: decoded.proxies, refreshed: true };
			} catch (error) {
				if (Array.isArray(cached?.proxies) && cached.proxies.length) {
					return { index, proxies: cached.proxies, cacheHit: true };
				}
				return { index, proxies: [], failed: true, error: error.message };
			}
		}));

		for (const outcome of outcomes) {
			summary.sources++;
			if (outcome.refreshed) summary.refreshed++;
			if (outcome.cacheHit) summary.cacheHits++;
			if (outcome.failed) summary.failures++;
			const prefix = enablePrefix ? `[${providerNames[outcome.index]}]` : '';
			for (const sourceProxy of outcome.proxies) {
				if (summary.proxies.length >= MAX_INLINE_PROXIES) {
					summary.truncated = true;
					break;
				}
				const proxy = { ...sourceProxy };
				const baseName = String(proxy.name || `${providerNames[outcome.index]}-${summary.proxies.length + 1}`).replace(/[\r\n\0]/g, ' ').trim();
				let name = `${prefix}${baseName}`;
				let suffix = 2;
				while (usedProxyNames.has(name)) name = `${prefix}${baseName}-${String(suffix++).padStart(2, '0')}`;
				usedProxyNames.add(name);
				proxy.name = name;
				summary.proxies.push(proxy);
			}
		}
	}
	return summary;
}

export { MAX_INLINE_PROXIES, generateSimpleProviderName, refreshSubscriptionProxies };
