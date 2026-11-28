import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { parse as parseYaml } from 'yaml';
import appRouter from '../src/index.js';
import { createFetchMock, createTestEnv } from './helpers/node-test-env.js';

const fetchMock = createFetchMock();
let env;

const collectionId = 'sub_inspect';
const feedUrl = 'https://feed-inspect.example/sub';
const feed = `proxies:
  - name: HK-01
    type: vless
    server: hk.example
    port: 443
    uuid: uuid-hk
    tls: true
    servername: hk.example
    network: ws
    ws-opts:
      path: /ws
      headers:
        Host: cdn.example
`;

async function getConfig(query) {
	const response = await appRouter.fetch(new Request(`https://clashsub.example/clash/submerge/${collectionId}?${query}`), env, {});
	return { response, body: await response.text() };
}

describe('client format shape', () => {
	beforeEach(async () => {
		env = createTestEnv();
		fetchMock.activate();
		fetchMock.disableNetConnect();
		await env.CLASH_KV.put('sub_collections', JSON.stringify([{
			id: collectionId,
			name: 'Inspect',
			subscriptions: [feedUrl],
			subscriptionNames: ['HK [1GiB/10GiB]'],
			enablePrefix: true
		}]));
		fetchMock.get('https://feed-inspect.example').intercept({ path: '/sub' }).reply(200, feed).persist();
	});

	afterEach(() => {
		fetchMock.deactivate();
	});

	it('produces a Stash config whose dns values match Stash types', async () => {
		const { response, body } = await getConfig('target=stash');
		expect(response.status).toBe(200);
		const config = parseYaml(body);

		// DNS：nameserver-policy 必须是字符串值
		if (config.dns?.['nameserver-policy']) {
			for (const value of Object.values(config.dns['nameserver-policy'])) {
				expect(typeof value).toBe('string');
			}
		}
		expect(config.dns?.listen).toBeUndefined();
		expect(config.dns?.['respect-rules']).toBeUndefined();

		// 规则集：不能出现 classical，且必须带 format
		for (const provider of Object.values(config['rule-providers'] || {})) {
			expect(['domain', 'ipcidr']).toContain(provider.behavior);
			expect(['yaml', 'text']).toContain(provider.format);
			expect(typeof provider.url).toBe('string');
		}

		// 策略组：include-all-proxies 必须已被翻译
		for (const group of config['proxy-groups']) {
			expect(group['include-all-proxies']).toBeUndefined();
			expect(group['include-all-providers']).toBeUndefined();
			if (['url-test', 'fallback', 'load-balance'].includes(group.type)) {
				expect(typeof group.url).toBe('string');
			}
		}

		expect(config.rules.at(-1)).toContain('MATCH');
	});

	it('produces a sing-box config where every rule target exists as an outbound', async () => {
		const { response, body } = await getConfig('target=singbox');
		expect(response.status).toBe(200);
		const config = JSON.parse(body);
		const tags = new Set(config.outbounds.map(outbound => outbound.tag));

		for (const rule of config.route.rules) {
			if (rule.outbound) expect(tags.has(rule.outbound)).toBe(true);
		}
		expect(tags.has(config.route.final)).toBe(true);

		const ruleSetTags = new Set(config.route.rule_set.map(set => set.tag));
		for (const rule of config.route.rules) {
			for (const name of rule.rule_set || []) expect(ruleSetTags.has(name)).toBe(true);
		}
		for (const outbound of config.outbounds) {
			if (outbound.type !== 'selector' && outbound.type !== 'urltest') continue;
			for (const child of outbound.outbounds) expect(tags.has(child)).toBe(true);
		}
	});

	it('produces a Quantumult X rule resource', async () => {
		const { response, body } = await getConfig('target=qx&part=rules');
		expect(response.status).toBe(200);
		expect(body).toContain('[policy]');
		expect(body).toContain('[filter_local]');
		expect(body).toMatch(/final, /);
	});
});
