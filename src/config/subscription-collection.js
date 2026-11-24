import { normalizeTarget, renderClientFormat, withGroupHealthCheck } from '../client-formats.js';
import { getSubCollections } from '../collections/subscriptions.js';
import { generateSimpleProviderName, MAX_INLINE_PROXIES, refreshSubscriptionProxies } from '../subscriptions/cache.js';
import { convertToYAML } from '../utils/yaml.js';
import { buildSubscriptionDNS } from './dns.js';
import { buildRuleProviders } from './rule-providers.js';
import { buildRules } from './rules.js';
import { buildSubscriptionGroups } from './subscription-groups.js';

// 生成特定订阅集合的配置
async function generateSubCollectionConfig(collectionId, env, target, part, tun, profile) {
	try {
		const collections = await getSubCollections(env);
		const collection = collections.find(c => c.id === collectionId);

		if (!collection) {
			return new Response('订阅集合不存在', { status: 404 });
		}

		const subscriptions = collection.subscriptions;
		const subscriptionNames = collection.subscriptionNames;

		if (subscriptions.length === 0) {
			return new Response('订阅集合为空', { status: 400 });
		}

		// 对订阅进行排序
		const subscriptionPairs = subscriptions.map((url, index) => ({
			url: url,
			name: subscriptionNames[index] || `provider${index + 1}`,
			index: index
		}));

		subscriptionPairs.sort((a, b) => {
			const extractBaseName = (fullName) => {
				const baseNameMatch = fullName.match(/^([^[\(]+?)(?:\s*\[.*?\])?(?:\s*\(.*?\))?$/);
				return baseNameMatch ? baseNameMatch[1].trim() : fullName;
			};

			const baseNameA = extractBaseName(a.name);
			const baseNameB = extractBaseName(b.name);

			const matchA = baseNameA.match(/^订阅(\d{2})$/);
			const matchB = baseNameB.match(/^订阅(\d{2})$/);

			if (matchA && matchB) {
				const numberA = parseInt(matchA[1]);
				const numberB = parseInt(matchB[1]);
				return numberA - numberB;
			}

			return baseNameA.localeCompare(baseNameB);
		});

		const sortedSubscriptions = subscriptionPairs.map(pair => pair.url);

		// 根据 submerge-config.yaml 格式构建配置
		// 顶层 ipv6 开关。缺省为关时 mihomo 会直接判定「不支持 IPv6」并拒绝
		// 建立 IPv6 出站连接，此时哪怕规则判了 DIRECT 也连不出去。
		const config = {
			ipv6: true
		};

		// 全局规则
		// config.port = 7890;
		// config['socks-port'] = 7891;
		// config['redir-port'] = 7892;
		// config['mixed-port'] = 7897;
		// config['tproxy-port'] = 7894;
		// config['allow-lan'] = true;
		// config['bind-address'] = '*';
		// config['unified-delay'] = true;
		// config['tcp-concurrent'] = true;
		// config['log-level'] = 'info';
		// config['find-process-mode'] = 'off';
		// config['global-client-fingerprint'] = 'chrome';
		// config['keep-alive-idle'] = 600;
		// config['keep-alive-interval'] = 15;
		// config['disable-keep-alive'] = false;
		// config.profile = {
		// 	'store-selected': true,
		// 	'store-fake-ip': true
		// };
		// config.mode = 'rule';
		// config['geodata-mode'] = false;
		// config['geodata-loader'] = 'standard';
		// config['geo-auto-update'] = true;
		// config['geo-update-interval'] = 24;

		// 嗅探配置
		// config.sniffer = {
		// 	enable: true,
		// 	'force-dns-mapping': true,
		// 	'parse-pure-ip': true,
		// 	'override-destination': true,
		// 	sniff: {
		// 		HTTP: {
		// 			ports: [80, '8080-8880'],
		// 			'override-destination': true
		// 		},
		// 		TLS: {
		// 			ports: [443, 8443]
		// 		},
		// 		QUIC: {
		// 			ports: [443, 8443]
		// 		}
		// 	},
		// 	'force-domain': ['+.v2ex.com'],
		// 	'skip-domain': ['+.baidu.com', 'Mijia.Cloud.com'],
		// 	'skip-src-address': ['192.168.0.3/32'],
		// 	'skip-dst-address': ['192.168.0.3/32']
		// };

		// 入站配置
		// config.tun = {
		// 	enable: true,
		// 	stack: 'mixed',
		// 	'dns-hijack': ['any:53', 'tcp://any:53'],
		// 	'auto-route': true,
		// 	'auto-redirect': true,
		// 	'auto-detect-interface': true,
		// 	device: 'utun0',
		// 	mtu: 1500,
		// 	'strict-route': true,
		// 	gso: true,
		// 	'gso-max-size': 65536,
		// 	'udp-timeout': 300,
		// 	'endpoint-independent-nat': false
		// };

		// DNS模块
		config.dns = buildSubscriptionDNS();

		// 每次客户端更新配置时刷新来源订阅，并将节点内联到顶层 proxies。
		const providerNames = [];
		const usedProviderNames = [];
		for (const pair of subscriptionPairs) {
			const baseName = (pair.name || '')
				.replace(/\s*\[.*?\]/g, '')
				.replace(/\s*\(.*?到期\)/g, '')
				.trim();
			const providerName = generateSimpleProviderName(baseName, usedProviderNames);
			providerNames.push(providerName);
			usedProviderNames.push(providerName);
		}

		const refreshSummary = await refreshSubscriptionProxies(
			collectionId,
			subscriptionPairs,
			providerNames,
			env,
			collection.enablePrefix !== false
		);
		config.proxies = refreshSummary.proxies;
		if (refreshSummary.truncated) {
			return new Response(`代理总数超过 ${MAX_INLINE_PROXIES} 个配置上限。`, { status: 413 });
		}
		if (config.proxies.length === 0) {
			return new Response('暂未能从这些订阅中解析到可用节点，请稍后重试。', { status: 502 });
		}
		// 出站策略
		config['proxy-groups'] = buildSubscriptionGroups();

		for (const group of config['proxy-groups']) {
			if (group['include-all']) {
				delete group['include-all'];
				group['include-all-proxies'] = true;
			}
		}

		// 规则集
		config['rule-providers'] = buildRuleProviders('🚀 默认代理');

		// submerge规则匹配
		config.rules = buildRules('🚀 默认代理');

		withGroupHealthCheck(config['proxy-groups']);

		const resolvedTarget = normalizeTarget(target);
		if (resolvedTarget !== 'clash') {
			return renderClientFormat(resolvedTarget, collection.name, config, {
				'X-ClashSub-Proxy-Count': String(refreshSummary.proxies.length),
				'X-ClashSub-Source-Refreshed': String(refreshSummary.refreshed),
				'X-ClashSub-Source-Cache-Hit': String(refreshSummary.cacheHits),
				'X-ClashSub-Source-Failed': String(refreshSummary.failures),
				'X-ClashSub-Proxies-Truncated': String(refreshSummary.truncated)
			}, { part, tun: tun === '1' || tun === 'true', profile });
		}

		const yamlContent = convertToYAML(config);

		return new Response(yamlContent, {
			headers: {
				'Content-Type': 'text/yaml; charset=utf-8',
				'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(collection.name)}`,
				'profile-update-interval': '12',
				'X-ClashSub-Proxy-Count': String(refreshSummary.proxies.length),
				'X-ClashSub-Source-Refreshed': String(refreshSummary.refreshed),
				'X-ClashSub-Source-Cache-Hit': String(refreshSummary.cacheHits),
				'X-ClashSub-Source-Failed': String(refreshSummary.failures),
				'X-ClashSub-Proxies-Truncated': String(refreshSummary.truncated)
			}
		});
	} catch (error) {
		return new Response('生成配置失败', { status: 500 });
	}
}

export { generateSubCollectionConfig };
