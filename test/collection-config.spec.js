import { describe, expect, it, beforeEach } from 'vitest';
import { env, fetchMock } from 'cloudflare:test';
import { parse as parseYaml } from 'yaml';
import worker from '../src/index.js';

let collectionId = 'sub_fixture_0';
let feedUrl = 'https://feed-0.example/subscription';
let fixtureNumber = 0;
const makeCollection = (subscriptions = [feedUrl], subscriptionNames = ['Japan [1GiB/10GiB]'], enablePrefix = true) => ({
	id: collectionId,
	name: 'Demo',
	subscriptions,
	subscriptionNames,
	enablePrefix
});
const feeds = [
	`proxies:\n  - name: JP-01\n    type: vless\n    server: jp.example\n    port: 443\n    uuid: first-id\n    tls: true\n`,
	`proxies:\n  - name: JP-02\n    type: vmess\n    server: jp2.example\n    port: 8443\n    uuid: second-id\n    tls: true\n`
];

async function getConfig() {
	return worker.fetch(new Request(`https://clashsub.example/clash/submerge/${collectionId}`), env, {});
}

describe('flattened subscription collection config', () => {
	beforeEach(async () => {
		fixtureNumber++;
		collectionId = `sub_fixture_${fixtureNumber}`;
		feedUrl = `https://feed-${fixtureNumber}.example/subscription`;
		fetchMock.activate();
		fetchMock.disableNetConnect();
		await env.CLASH_KV.put('sub_collections', JSON.stringify([makeCollection()]));
	});

	it('inlines parsed proxies while preserving profile rules, DNS and compatible headers', async () => {
		fetchMock.get(new URL(feedUrl).origin).intercept({ path: '/subscription' }).reply(200, feeds[0]);
		const response = await getConfig();
		const config = parseYaml(await response.text());

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toContain('text/yaml');
		expect(response.headers.get('content-disposition')).toContain('filename*=UTF-8\'\'Demo');
		expect(response.headers.get('profile-update-interval')).toBe('12');
		expect(config.proxies).toHaveLength(1);
		expect(config.proxies[0].name).toBe('[Japan]JP-01');
		expect(config['proxy-providers']).toBeUndefined();
		expect(config.dns['default-nameserver']).toEqual(['223.5.5.5', '1.12.12.12']);
		expect(config.rules.at(-1)).toBe('MATCH,🚀 默认代理');
		expect(config['proxy-groups'].find(group => group.name === '🌐 全部节点')['include-all-proxies']).toBe(true);
	});

	it('fetches source content again on the next profile update', async () => {
		let calls = 0;
		fetchMock.get(new URL(feedUrl).origin).intercept({ path: '/subscription' }).reply(() => ({ statusCode: 200, data: feeds[Math.min(calls++, 1)] })).persist();
		const first = parseYaml(await (await getConfig()).text());
		const second = parseYaml(await (await getConfig()).text());
		expect(first.proxies[0].name).toBe('[Japan]JP-01');
		expect(second.proxies[0].name).toBe('[Japan]JP-02');
		expect(calls).toBe(2);
	});

	it('uses the last successful per-source snapshot when refresh fails', async () => {
		fetchMock.get(new URL(feedUrl).origin).intercept({ path: '/subscription' }).reply(200, feeds[0]);
		const firstResponse = await getConfig();
		await firstResponse.text();
		fetchMock.get(new URL(feedUrl).origin).intercept({ path: '/subscription' }).reply(503, 'unavailable');
		const secondResponse = await getConfig();
		const config = parseYaml(await secondResponse.text());
		expect(secondResponse.status).toBe(200);
		expect(config.proxies[0].name).toBe('[Japan]JP-01');
		expect(secondResponse.headers.get('X-ClashSub-Source-Cache-Hit')).toBe('1');
	});

	it('accepts a raw URI subscription at the existing collection API', async () => {
		await env.CLASH_KV.put('sub_collections', JSON.stringify([makeCollection([], [])]));
		fetchMock.get(new URL(feedUrl).origin).intercept({ path: '/subscription' }).reply(200, 'vless://x@node.example:443?encryption=none#Direct-01');
		const response = await worker.fetch(new Request('https://clashsub.example/api/sub-collections', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'addSubscription', data: { collectionId, subscriptionUrls: feedUrl } })
		}), env, {});
		const result = await response.json();
		expect(response.status).toBe(200);
		expect(result.successCount).toBe(1);
		expect(result.failedCount).toBe(0);
	});

	it('rejects private network subscription targets before outbound fetch', async () => {
		await env.CLASH_KV.put('sub_collections', JSON.stringify([makeCollection([], [])]));
		const response = await worker.fetch(new Request('https://clashsub.example/api/sub-collections', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'addSubscription', data: { collectionId, subscriptionUrls: 'http://127.0.0.1:8787/sub' } })
		}), env, {});
		const result = await response.json();
		expect(response.status).toBe(200);
		expect(result.successCount).toBe(0);
		expect(result.failedCount).toBe(1);
	});

	it('supports subscription URI lists and keeps globally unique node names', async () => {
		await env.CLASH_KV.put('sub_collections', JSON.stringify([{
			id: collectionId,
			name: 'Demo',
			subscriptions: [feedUrl, `${new URL(feedUrl).origin}/second`],
			subscriptionNames: ['Source A', 'Source B'],
			enablePrefix: false
		}]));
		fetchMock.get(new URL(feedUrl).origin).intercept({ path: '/subscription' }).reply(200, `vless://x@node.example:443?encryption=none#Same`);
		fetchMock.get(new URL(feedUrl).origin).intercept({ path: '/second' }).reply(200, `vless://y@node2.example:443?encryption=none#Same`);
		const response = await getConfig();
		const config = parseYaml(await response.text());
		expect(config.proxies.map(proxy => proxy.name)).toEqual(['Same', 'Same-02']);
	});
});
