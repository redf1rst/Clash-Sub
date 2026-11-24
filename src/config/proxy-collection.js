import { normalizeTarget, renderClientFormat, withGroupHealthCheck } from '../client-formats.js';
import { getProxyCollections } from '../collections/proxies.js';
import { sortProxiesByRegion } from '../utils/regions.js';
import { convertToYAML } from '../utils/yaml.js';
import { buildProxyDNS } from './dns.js';
import { buildProxyGroups } from './proxy-groups.js';
import { buildRuleProviders } from './rule-providers.js';
import { buildRules } from './rules.js';

// 生成特定节点集合的配置
async function generateProxyCollectionConfig(collectionId, env, target, part, tun, profile) {
	try {
		const collections = await getProxyCollections(env);
		const collection = collections.find(c => c.id === collectionId);

		if (!collection) {
			return new Response('节点集合不存在', { status: 404 });
		}

		const proxies = collection.proxies;

		if (proxies.length === 0) {
			return new Response('节点集合为空', { status: 400 });
		}

		// 对节点进行排序 - 使用统一的排序逻辑
		sortProxiesByRegion(proxies);

		const config = {
			ipv6: true,
			dns: buildProxyDNS(),
			proxies: proxies,
			'proxy-groups': buildProxyGroups(proxies),
			'rule-providers': buildRuleProviders('节点选择'),
			rules: buildRules('节点选择')
		};

		withGroupHealthCheck(config['proxy-groups']);

		const resolvedTarget = normalizeTarget(target);
		if (resolvedTarget !== 'clash') {
			return renderClientFormat(resolvedTarget, collection.name, config, {}, { part, tun: tun === '1' || tun === 'true', profile });
		}

		const yamlContent = convertToYAML(config);

		return new Response(yamlContent, {
			headers: {
				'Content-Type': 'text/yaml; charset=utf-8',
				'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(collection.name)}`,
				'profile-update-interval': '12'
			}
		});
	} catch (error) {
		return new Response('生成配置失败', { status: 500 });
	}
}

export { generateProxyCollectionConfig };
