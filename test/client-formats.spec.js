import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { normalizeTarget, toStashConfig, toSingBoxConfig, toQuantumultXConfig } from '../src/client-formats.js';

const sampleConfig = () => ({
	dns: {
		enable: true,
		listen: '[::]:1053',
		'respect-rules': true,
		'enhanced-mode': 'fake-ip',
		'fake-ip-range': '198.18.0.1/16',
		'default-nameserver': ['223.5.5.5'],
		nameserver: ['https://1.1.1.1/dns-query'],
		'proxy-server-nameserver': ['https://223.5.5.5/dns-query'],
		'nameserver-policy': { 'rule-set:cn_domain': ['https://223.5.5.5/dns-query'], '+.example.com': ['https://1.1.1.1/dns-query'] }
	},
	proxies: [
		{ name: 'US 洛杉矶', type: 'vmess', server: 'us.example', port: 443, uuid: 'uuid-1', cipher: 'auto', alterId: 0, tls: true, network: 'ws', 'ws-opts': { path: '/ws', headers: { Host: 'cdn.example' } } },
		{ name: 'JP 东京', type: 'vless', server: 'jp.example', port: 443, uuid: 'uuid-2', tls: true, servername: 'jp.example', 'reality-opts': { 'public-key': 'pk', 'short-id': 'ab' }, network: 'tcp' },
		{ name: 'SS 节点', type: 'ss', server: 'ss.example', port: 8388, cipher: 'chacha20-ietf-poly1305', password: 'pass' },
		{ name: 'Trojan 节点', type: 'trojan', server: 'tj.example', port: 443, password: 'tjpass', sni: 'tj.example' }
	],
	'proxy-groups': [
		{ name: '🚀 默认代理', type: 'select', proxies: ['🌐 全部节点', 'AI服务', 'DIRECT'] },
		{ name: '🌐 全部节点', type: 'select', 'include-all-proxies': true },
		{ name: 'AI服务', type: 'select', proxies: ['🚀 默认代理', 'DIRECT'] },
		{ name: '♻️ 自动选择', type: 'url-test', 'include-all-proxies': true, tolerance: 80, interval: 120 }
	],
	'rule-providers': {
		ai: { type: 'http', behavior: 'domain', format: 'mrs', url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-ai-!cn.mrs', path: './ruleset/ai.mrs' },
		China: { type: 'http', behavior: 'classical', format: 'yaml', url: 'https://example.com/China.yaml', path: './ruleset/China.yaml' },
		CNcidr: { type: 'http', behavior: 'ipcidr', format: 'mrs', url: 'https://cdn.jsdmirror.com/gh/Kwisma/clash-rules@release/cncidr.mrs', path: './ruleset/CNcidr.mrs' },
		STUN: { type: 'http', behavior: 'domain', format: 'mrs', url: 'https://example.com/STUN.mrs', path: './ruleset/STUN.mrs' }
	},
	rules: [
		'RULE-SET,ai,AI服务',
		'RULE-SET,China,DIRECT',
		'RULE-SET,CNcidr,DIRECT',
		'RULE-SET,STUN,DIRECT',
		'DOMAIN-SUFFIX,cn,DIRECT',
		'MATCH,🚀 默认代理'
	]
});

describe('normalizeTarget', () => {
	it('maps aliases and falls back to clash', () => {
		expect(normalizeTarget('sing-box')).toBe('singbox');
		expect(normalizeTarget('quantumult-x')).toBe('qx');
		expect(normalizeTarget('shadowrocket')).toBe('shadowrocket');
		expect(normalizeTarget('unknown')).toBe('clash');
		expect(normalizeTarget(undefined)).toBe('clash');
	});
});

describe('toStashConfig', () => {
	it('keeps native include-all instead of expanding groups', () => {
		const stash = toStashConfig(sampleConfig());
		const all = stash['proxy-groups'].find(group => group.name === '🌐 全部节点');
		// Stash 原生支持 include-all，无需展开成显式列表
		expect(all['include-all']).toBe(true);
		expect(all['include-all-proxies']).toBeUndefined();

		const auto = stash['proxy-groups'].find(group => group.name === '♻️ 自动选择');
		expect(auto.type).toBe('url-test');
		expect(auto.url).toBe('https://www.gstatic.com/generate_204');
	});

	it('rewrites MRS rule providers to YAML and drops unroutable ones', () => {
		const stash = toStashConfig(sampleConfig());
		expect(stash['rule-providers'].ai.format).toBe('yaml');
		expect(stash['rule-providers'].ai.url).toMatch(/category-ai-!cn\.yaml$/);
		// classical 混合规则集改写为等价 geosite 域名集
		expect(stash['rule-providers'].China.behavior).toBe('domain');
		expect(stash['rule-providers'].China.url).toMatch(/geosite\/cn\.yaml$/);
		expect(stash['rule-providers'].CNcidr.url).toMatch(/geoip\/cn\.yaml$/);
		expect(stash['rule-providers'].STUN).toBeUndefined();

		// Stash 只保证 domain / ipcidr，绝不能出现 classical
		const behaviors = Object.values(stash['rule-providers']).map(provider => provider.behavior);
		expect(behaviors).not.toContain('classical');
		expect(behaviors.every(behavior => ['domain', 'ipcidr'].includes(behavior))).toBe(true);

		const ruleSetNames = stash.rules.filter(rule => rule.startsWith('RULE-SET,')).map(rule => rule.split(',')[1]);
		expect(ruleSetNames).toEqual(['ai', 'China', 'CNcidr']);
		expect(stash.rules).toContain('MATCH,🚀 默认代理');
	});

	it('keeps Stash-supported DNS fields and string-only nameserver-policy values', () => {
		const stash = toStashConfig(sampleConfig());
		expect(stash.dns['proxy-server-nameserver']).toEqual(['https://223.5.5.5/dns-query']);
		expect(stash.dns['respect-rules']).toBeUndefined();
		expect(stash.dns.listen).toBeUndefined();
		expect(stash.dns['nameserver-policy']['rule-set:cn_domain']).toBeUndefined();
		// Stash 要求 policy 值是字符串，不能是列表
		expect(stash.dns['nameserver-policy']['+.example.com']).toBe('https://1.1.1.1/dns-query');
	});
});

describe('toSingBoxConfig', () => {
	it('keeps every clash proxy group as a sing-box outbound', () => {
		const config = toSingBoxConfig('测试集合', sampleConfig());
		const tags = config.outbounds.map(outbound => outbound.tag);
		expect(tags).toContain('🚀 默认代理');
		expect(tags).toContain('🌐 全部节点');
		expect(tags).toContain('♻️ 自动选择');

		const all = config.outbounds.find(outbound => outbound.tag === '🌐 全部节点');
		expect(all.type).toBe('selector');
		expect(all.outbounds).toEqual(['US 洛杉矶', 'JP 东京', 'SS 节点', 'Trojan 节点']);

		const auto = config.outbounds.find(outbound => outbound.tag === '♻️ 自动选择');
		expect(auto.type).toBe('urltest');
		expect(auto.interval).toBe('120s');
	});

	it('converts protocols including reality and transport options', () => {
		const config = toSingBoxConfig('测试集合', sampleConfig());
		const vmess = config.outbounds.find(outbound => outbound.tag === 'US 洛杉矶');
		expect(vmess.type).toBe('vmess');
		expect(vmess.transport).toEqual({ type: 'ws', path: '/ws', headers: { Host: 'cdn.example' } });

		const vless = config.outbounds.find(outbound => outbound.tag === 'JP 东京');
		expect(vless.tls.reality.public_key).toBe('pk');

		const ss = config.outbounds.find(outbound => outbound.tag === 'SS 节点');
		expect(ss.type).toBe('shadowsocks');

		expect(config.outbounds.find(outbound => outbound.tag === 'Trojan 节点').tls.enabled).toBe(true);
	});

	it('maps RULE-SET rules to binary rule sets and preserves rule order', () => {
		const config = toSingBoxConfig('测试集合', sampleConfig());
		const ruleSetTags = config.route.rule_set.map(set => set.tag);
		expect(ruleSetTags).toContain('ai');
		expect(ruleSetTags).toContain('CNcidr');
		expect(ruleSetTags).not.toContain('STUN');
		expect(config.route.rule_set.find(set => set.tag === 'ai').url).toMatch(/meta-rules-dat@sing\/geo\/geosite\/category-ai-!cn\.srs$/);
		// 走 CDN 而非 raw.githubusercontent.com，避免国内网络下载失败
		expect(config.route.rule_set.every(set => set.url.includes('cdn.jsdelivr.net'))).toBe(true);

		const ruleSetRules = config.route.rules.filter(rule => rule.rule_set);
		expect(ruleSetRules[0]).toEqual({ rule_set: ['ai'], outbound: 'AI服务' });
		expect(ruleSetRules.some(rule => rule.outbound === 'REJECT')).toBe(false);

		// 内联域名规则保持顺序，MATCH 变成 route.final
		expect(config.route.rules.at(-1)).toEqual({ domain_suffix: ['cn'], outbound: 'DIRECT' });
		expect(config.route.final).toBe('🚀 默认代理');
	});

	it('keeps the config JSON serializable', () => {
		expect(() => JSON.stringify(toSingBoxConfig('x', sampleConfig()))).not.toThrow();
	});

	it('never turns a certificate fingerprint into a uTLS fingerprint', () => {
		const config = sampleConfig();
		config.proxies = [{
			name: 'HY2',
			type: 'hysteria2',
			server: '1.2.3.4',
			port: 61000,
			password: 'p',
			sni: 'www.bing.com',
			tls: true,
			fingerprint: '1d7995901a93bada6d17f10289441793e8ec54ee314d9f04f3a9d05daa622331'
		}, {
			name: 'REALITY',
			type: 'vless',
			server: 'r.example',
			port: 443,
			uuid: 'u',
			tls: true,
			'client-fingerprint': 'chrome',
			'reality-opts': { 'public-key': 'pk' }
		}];
		const out = toSingBoxConfig('t', config);
		const hy2 = out.outbounds.find(item => item.tag === 'HY2');
		expect(hy2.tls.utls).toBeUndefined();
		const reality = out.outbounds.find(item => item.tag === 'REALITY');
		expect(reality.tls.utls).toEqual({ enabled: true, fingerprint: 'chrome' });
	});

	it('treats exclude-filter as a real exclusion and drops junk pseudo nodes', () => {
		const config = sampleConfig();
		config.proxies = [
			{ name: '剩余流量：99 GB', type: 'ss', server: 'junk.example', port: 1, cipher: 'aes-128-gcm', password: 'p' },
			{ name: 'JP 东京', type: 'ss', server: 'jp.example', port: 8388, cipher: 'aes-128-gcm', password: 'p' },
			{ name: 'US 洛杉矶', type: 'ss', server: 'us.example', port: 8388, cipher: 'aes-128-gcm', password: 'p' }
		];
		config['proxy-groups'] = [
			{ name: '🌐 全部节点', type: 'select', 'include-all-proxies': true, 'exclude-filter': '^(?=.*(剩余流量|套餐到期)).*$' }
		];
		const out = toSingBoxConfig('t', config);
		const all = out.outbounds.find(item => item.tag === '🌐 全部节点');
		// 伪节点被剔除，真实节点必须保留
		expect(all.outbounds).toEqual(['JP 东京', 'US 洛杉矶']);
	});

	it('resolves group references only after their targets exist', () => {
		const config = sampleConfig();
		config.proxies = [
			{ name: 'JP 东京', type: 'ss', server: 'jp.example', port: 8388, cipher: 'aes-128-gcm', password: 'p' }
		];
		config['proxy-groups'] = [
			// 先声明引用者的顺序：成员是组名
			{ name: '🚀 默认代理', type: 'select', proxies: ['🌐 全部节点', 'DIRECT'] },
			{ name: '🌐 全部节点', type: 'select', 'include-all-proxies': true }
		];
		const out = toSingBoxConfig('t', config);
		const main = out.outbounds.find(item => item.tag === '🚀 默认代理');
		expect(main.outbounds).toEqual(['🌐 全部节点', 'DIRECT']);
	});

	it('drops groups that would end up empty instead of emitting missing tags', () => {
		const config = sampleConfig();
		config['proxy-groups'] = [
			{ name: '🚀 默认代理', type: 'select', proxies: ['韩国自动', 'DIRECT'] },
			// 过滤不到任何节点，且是 url-test：若照搬会触发 sing-box "missing tags"
			{ name: '韩国自动', type: 'url-test', 'include-all-proxies': true, filter: 'KoreaOnlyNoMatch', interval: 120 }
		];
		const out = toSingBoxConfig('t', config);
		for (const item of out.outbounds) {
			if (item.type !== 'selector' && item.type !== 'urltest') continue;
			expect(item.outbounds.length).toBeGreaterThan(0);
		}
	});
});

describe('toQuantumultXConfig', () => {
	it('renders supported protocols as server lines and skips the rest', () => {
		const { text, skipped } = toQuantumultXConfig('测试', sampleConfig());
		expect(text).toContain('vmess=us.example:443');
		expect(text).toContain('shadowsocks=ss.example:8388');
		expect(text).toContain('trojan=tj.example:443');
		expect(skipped).toEqual(['JP 东京']);
	});

	it('builds a full config with policies and filter rules when asked', () => {
		const { text, policyCount, ruleCount } = toQuantumultXConfig('测试', sampleConfig(), { part: 'rules' });
		expect(text).toContain('[policy]');
		expect(text).toContain('[server_local]');
		expect(text).toContain('[filter_local]');
		expect(policyCount).toBeGreaterThan(0);
		expect(ruleCount).toBeGreaterThan(0);
		// MATCH 必须落到 final
		expect(text).toMatch(/final, .+/);
		// 内联规则被翻译成 QX 语法
		expect(text).toContain('host-suffix, cn, direct');
	});
});

describe('IPv6 wildcard direct rule', () => {
	// 需求：开代理时不影响任何 IPv6 地址的 SSH。订阅在规则首行下发
	// IP-CIDR6,::/0,DIRECT,no-resolve，所有 IPv6 目标一律直连。
	const withV6Rule = () => {
		const config = sampleConfig();
		config.rules = ['IP-CIDR6,::/0,DIRECT,no-resolve', ...config.rules];
		return config;
	};

	it('keeps the IPv6 wildcard at the head for clash clients', () => {
		expect(withV6Rule().rules[0]).toBe('IP-CIDR6,::/0,DIRECT,no-resolve');
	});

	it('keeps the rule intact for Stash', () => {
		const stash = toStashConfig(withV6Rule());
		expect(stash.rules[0]).toBe('IP-CIDR6,::/0,DIRECT,no-resolve');
	});

	it('defers the rule to the end for sing-box so domain targets never trigger resolution', () => {
		const config = toSingBoxConfig('测试集合', withV6Rule());
		const rules = config.route.rules;
		expect(rules.at(-1)).toEqual({ ip_cidr: ['::/0'], outbound: 'DIRECT' });
		// 首条规则不能被 ::/0 占据，否则每个域名目标都要先解析成 IP 才能判定
		expect(rules[0]).not.toEqual({ ip_cidr: ['::/0'], outbound: 'DIRECT' });
	});

	it('translates the rule to ip6-cidr for Quantumult X', () => {
		const { text } = toQuantumultXConfig('测试', withV6Rule(), { part: 'rules' });
		expect(text).toContain('ip6-cidr, ::/0, direct, no-resolve');
	});
});
