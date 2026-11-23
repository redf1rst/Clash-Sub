import { stringify as stringifyYaml } from 'yaml';

const HEALTH_CHECK_URL = 'https://www.gstatic.com/generate_204';
const META_YAML = 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo';
// raw.githubusercontent.com 在部分网络环境下不可达，统一走 jsdelivr CDN
const META_SRS = 'https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo';
const SUPPORTED_TARGETS = new Set(['clash', 'stash', 'shadowrocket', 'singbox', 'qx']);

// 第三方 MRS 在 MetaCubeX 里没有同名资源，用语义接近的上游集合替代；无法替代的直接丢弃。
const PROVIDER_SUBSTITUTES = {
	CNcidr: { geosite: null, geoip: 'cn' },
	'Advertising-ads': { geosite: 'category-ads-all', geoip: null },
	China: { geosite: 'cn', geoip: null },
	ChinaMedia: { geosite: 'cn', geoip: null },
	LAN: null
};

// classical 属于 Clash 的混合规则集，Stash 只保证 domain / ipcidr，必须转换或丢弃。
const SAFE_BEHAVIORS = new Set(['domain', 'ipcidr']);

// mihomo 专有字段，Stash / sing-box 均不支持，混在节点里会让客户端解析异常。
const MIHOMO_ONLY_PROXY_FIELDS = ['ports', 'mport', 'smux', 'brutal-opts', 'ech-opts', 'ip-version', 'packet-encoding', 'xudp', 'global-padding', 'packet-addr'];

// sing-box 只认这些 uTLS 指纹名；Clash 的 fingerprint 是证书 SHA256，不能当指纹用。
const UTLS_FINGERPRINTS = new Set(['chrome', 'firefox', 'edge', 'safari', '360', 'qq', 'ios', 'android', 'random', 'randomized']);

function stripMihomoOnlyFields(proxy) {
	const cleaned = { ...proxy };
	for (const field of MIHOMO_ONLY_PROXY_FIELDS) delete cleaned[field];
	// skip-cert-verify 已跳过校验时，证书指纹没有意义且可能影响客户端解析
	if (cleaned['skip-cert-verify'] === true) delete cleaned.fingerprint;
	return cleaned;
}

function isObject(value) {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function compact(object) {
	const output = {};
	for (const [key, value] of Object.entries(object)) {
		if (value === undefined || value === null || value === '') continue;
		if (isObject(value) && Object.keys(value).length === 0) continue;
		if (Array.isArray(value) && value.length === 0) continue;
		output[key] = value;
	}
	return output;
}

function unique(items) {
	return [...new Set(items)];
}

// 机场常在订阅里塞入「剩余流量」「套餐到期」这类伪节点，它们不是真实代理
const JUNK_PROXY_PATTERN = /(剩余流量|套餐到期|到期时间|距离下次|流量重置|重置时间|套餐流量|官网地址|官方网址)/;

function isJunkProxy(proxy) {
	return JUNK_PROXY_PATTERN.test(String(proxy?.name ?? ''));
}

function sanitizeName(value) {
	return String(value ?? '').replace(/[\r\n\t]+/g, ' ').trim();
}

function hostOf(proxy) {
	return proxy.servername || proxy.sni || proxy['ws-opts']?.headers?.Host || proxy['ws-opts']?.headers?.host || '';
}

function providerMeta(provider) {
	if (!isObject(provider)) return null;
	const url = String(provider.url || '');
	const behavior = String(provider.behavior || 'domain');
	const mrsMatch = url.match(/meta-rules-dat[^]*?\/geo\/(geosite|geoip)\/([^/]+?)\.mrs(?:\?|$)/);
	if (mrsMatch) return { kind: mrsMatch[1], name: mrsMatch[2], behavior };
	if (provider.format === 'mrs') return null;
	return { kind: null, name: null, behavior, passthrough: SAFE_BEHAVIORS.has(behavior) };
}

/* ------------------------------- Clash 通用修补 ------------------------------ */

export function withGroupHealthCheck(groups) {
	for (const group of groups) {
		if (['url-test', 'fallback', 'load-balance'].includes(group.type) && !group.url) {
			group.url = HEALTH_CHECK_URL;
			group.interval = group.interval || 300;
		}
	}
	return groups;
}

/* ---------------------------------- Stash --------------------------------- */

// Stash 支持 include-all / filter，但不认 mihomo 的 include-all-proxies 与 MRS 格式。
function groupForStash(group) {
	const next = { ...group };
	delete next['include-all-providers'];
	if (group['include-all-proxies']) {
		delete next['include-all-proxies'];
		next['include-all'] = true;
	}
	if (['url-test', 'fallback', 'load-balance'].includes(next.type)) {
		next.url = next.url || HEALTH_CHECK_URL;
		next.interval = next.interval || 300;
	}
	return next;
}

function providerForStash(key, provider) {
	const meta = providerMeta(provider);
	if (!meta) {
		const substitute = PROVIDER_SUBSTITUTES[key];
		return substitute ? substituteForStash(key, substitute, provider) : null;
	}
	if (meta.passthrough) return provider;
	if (meta.kind) {
		return compact({
			type: provider.type || 'http',
			behavior: provider.behavior,
			format: 'yaml',
			url: `${META_YAML}/${meta.kind}/${meta.name}.yaml`,
			path: String(provider.path || `./ruleset/${key}.yaml`).replace(/\.mrs$/, '.yaml'),
			interval: provider.interval || 86400
		});
	}
	const substitute = PROVIDER_SUBSTITUTES[key];
	return substitute ? substituteForStash(key, substitute, provider) : null;
}

function substituteForStash(key, substitute, provider) {
	if (!substitute) return null;
	const kind = substitute.geosite ? 'geosite' : 'geoip';
	const name = substitute.geosite || substitute.geoip;
	return compact({
		type: 'http',
		behavior: substitute.geosite ? 'domain' : 'ipcidr',
		format: 'yaml',
		url: `${META_YAML}/${kind}/${name}.yaml`,
		path: `./ruleset/${key}.yaml`,
		interval: provider?.interval || 86400
	});
}

// Stash 的 DNS 只保留其文档明确支持的字段：nameserver-policy 的值必须是字符串。
function dnsForStash(dns) {
	if (!isObject(dns)) return undefined;
	const policy = {};
	if (isObject(dns['nameserver-policy'])) {
		for (const [domain, value] of Object.entries(dns['nameserver-policy'])) {
			const first = Array.isArray(value) ? value[0] : value;
			if (typeof first === 'string' && first && !domain.startsWith('rule-set:')) policy[domain] = first;
		}
	}
	return compact({
		'default-nameserver': dns['default-nameserver'],
		nameserver: dns.nameserver,
		'proxy-server-nameserver': dns['proxy-server-nameserver'],
		'enhanced-mode': dns['enhanced-mode'],
		'fake-ip-range': dns['fake-ip-range'],
		'fake-ip-filter': dns['fake-ip-filter'],
		ipv6: dns.ipv6,
		'nameserver-policy': Object.keys(policy).length ? policy : undefined
	});
}

export function toStashConfig(config) {
	const proxies = Array.isArray(config.proxies) ? config.proxies : [];

	const providers = {};
	for (const [key, provider] of Object.entries(config['rule-providers'] || {})) {
		const converted = providerForStash(key, provider);
		if (converted) providers[key] = converted;
	}

	const rules = (config.rules || []).filter(rule => {
		const match = String(rule).match(/^RULE-SET,([^,]+),/);
		return !match || Boolean(providers[match[1]]);
	});

	return compact({
		mode: config.mode || 'rule',
		dns: dnsForStash(config.dns),
		proxies: proxies.filter(proxy => !isJunkProxy(proxy)).map(stripMihomoOnlyFields),
		'proxy-groups': (config['proxy-groups'] || []).map(groupForStash),
		'rule-providers': Object.keys(providers).length ? providers : undefined,
		rules
	});
}

/* -------------------------------- sing-box -------------------------------- */

function singBoxTransport(proxy) {
	const network = proxy.network || (proxy['ws-opts'] ? 'ws' : '');
	if (network === 'ws') {
		const opts = proxy['ws-opts'] || {};
		return compact({
			type: 'ws',
			path: opts.path || '/',
			headers: opts.headers,
			max_early_data: opts['max-early-data'],
			early_data_header_name: opts['early-data-header-name']
		});
	}
	if (network === 'grpc') return { type: 'grpc', service_name: proxy['grpc-opts']?.['grpc-service-name'] || '' };
	if (network === 'h2') {
		const opts = proxy['h2-opts'] || {};
		return compact({ type: 'http', path: opts.path, host: opts.host });
	}
	if (network === 'http') {
		const opts = proxy['http-opts'] || {};
		return compact({ type: 'http', path: opts.path, method: opts.method, headers: opts.headers });
	}
	return undefined;
}

function singBoxTls(proxy) {
	if (!proxy.tls && !proxy['reality-opts']) return undefined;
	const tls = compact({
		enabled: true,
		server_name: hostOf(proxy) || undefined,
		insecure: proxy['skip-cert-verify'] === true ? true : undefined,
		alpn: Array.isArray(proxy.alpn) ? proxy.alpn : undefined
	});
	const uTls = String(proxy['client-fingerprint'] || '').toLowerCase();
	if (UTLS_FINGERPRINTS.has(uTls)) tls.utls = { enabled: true, fingerprint: uTls };
	if (proxy['reality-opts']?.['public-key']) {
		tls.reality = compact({
			enabled: true,
			public_key: proxy['reality-opts']['public-key'],
			short_id: proxy['reality-opts']['short-id']
		});
	}
	return tls;
}

function singBoxSSPlugin(proxy) {
	if (proxy['ws-opts'] || proxy.plugin === 'v2ray-plugin') {
		const opts = proxy['ws-opts'] || {};
		return {
			name: 'v2ray-plugin',
			opts: compact({ mode: 'websocket', host: opts.headers?.Host, path: opts.path, tls: proxy.tls === true ? 'true' : undefined })
		};
	}
	const mode = proxy['plugin-opts']?.mode || proxy.obfs;
	if (mode === 'http' || mode === 'tls') {
		return { name: 'obfs-local', opts: compact({ obfs: mode, 'obfs-host': proxy['plugin-opts']?.host || proxy['obfs-host'] }) };
	}
	return null;
}

function toSingBoxOutbound(proxy) {
	const type = String(proxy.type || '').toLowerCase();
	const base = { tag: sanitizeName(proxy.name), server: proxy.server, server_port: Number(proxy.port) };

	switch (type) {
		case 'vmess':
			return compact({ type: 'vmess', ...base, uuid: proxy.uuid, security: proxy.cipher || 'auto', alter_id: Number(proxy.alterId) || 0, tls: singBoxTls(proxy), transport: singBoxTransport(proxy) });
		case 'vless':
			return compact({ type: 'vless', ...base, uuid: proxy.uuid, flow: proxy.flow, tls: singBoxTls(proxy), transport: singBoxTransport(proxy) });
		case 'trojan':
			return compact({ type: 'trojan', ...base, password: proxy.password, tls: singBoxTls({ ...proxy, tls: true }), transport: singBoxTransport(proxy) });
		case 'ss':
		case 'shadowsocks': {
			const plugin = singBoxSSPlugin(proxy);
			return compact({ type: 'shadowsocks', ...base, method: proxy.cipher, password: proxy.password, plugin: plugin?.name, plugin_opts: plugin?.opts });
		}
		case 'ssr':
		case 'shadowsocksr':
			return compact({ type: 'shadowsocksr', ...base, method: proxy.cipher, password: proxy.password, obfs: proxy.obfs, obfs_param: proxy['obfs-param'], protocol: proxy.protocol, protocol_param: proxy['protocol-param'] });
		case 'hysteria2':
			return compact({
				type: 'hysteria2',
				...base,
				password: proxy.password || proxy.auth,
				obfs: proxy.obfs ? compact({ type: proxy.obfs, password: proxy['obfs-password'] }) : undefined,
				tls: singBoxTls({ ...proxy, tls: true })
			});
		case 'hysteria':
			return compact({ type: 'hysteria', ...base, auth_str: proxy.auth_str || proxy['auth-str'] || proxy.password, up: proxy.up, down: proxy.down, obfs: proxy.obfs, tls: singBoxTls({ ...proxy, tls: true }) });
		case 'tuic':
			return compact({
				type: 'tuic',
				...base,
				uuid: proxy.uuid,
				password: proxy.password,
				congestion_control: proxy['congestion-controller'],
				udp_relay_mode: proxy['udp-relay-mode'],
				tls: singBoxTls({ ...proxy, tls: true })
			});
		case 'socks5':
			return compact({ type: 'socks', ...base, version: '5', username: proxy.username, password: proxy.password });
		case 'http':
		case 'https':
			return compact({ type: 'http', ...base, username: proxy.username, password: proxy.password, tls: proxy.tls ? singBoxTls({ ...proxy, tls: true }) : undefined });
		case 'anytls':
			return compact({ type: 'anytls', ...base, password: proxy.password, tls: singBoxTls({ ...proxy, tls: true }) });
		case 'ssh':
			return compact({ type: 'ssh', ...base, user: proxy.username, password: proxy.password, private_key: proxy['private-key'] || proxy.privateKey });
		default:
			return null;
	}
}

function clashFilter(pattern) {
	if (typeof pattern !== 'string' || !pattern.trim()) return null;
	try {
		return new RegExp(pattern.replace(/\(\?i\)/g, '').replace(/\\\\b/g, '\\b'), 'i');
	} catch {
		return null;
	}
}

// 把 Clash 策略组成员解析成 sing-box 里存在的 tag
function resolveGroupMembers(group, proxyTags, groupTags) {
	const includeAll = group['include-all'] || group['include-all-proxies'];
	let members = [];
	if (includeAll) {
		const include = clashFilter(group.filter);
		const exclude = clashFilter(group['exclude-filter']);
		members = proxyTags.filter(name => (!include || include.test(name)) && (!exclude || !exclude.test(name)));
	}
	if (Array.isArray(group.proxies)) {
		for (const entry of group.proxies) {
			if (entry === 'DIRECT') members.push('DIRECT');
			else if (entry === 'REJECT' || entry === 'REJECT-DROP') members.push('REJECT');
			else if (proxyTags.includes(entry) || groupTags.has(entry)) members.push(entry);
		}
	}
	members = unique(members);
	if (members.length === 0) members = ['DIRECT'];
	return members;
}

function ruleForSingBox(rule, groupTags, providerTags) {
	const parts = String(rule).split(',').map(part => part.trim());
	const type = (parts[0] || '').toUpperCase();
	const policyRaw = parts.length > 2 ? parts[parts.length - (parts[parts.length - 1] === 'no-resolve' ? 2 : 1)] : '';
	const policy = policyRaw === 'DIRECT' ? 'DIRECT' : (policyRaw === 'REJECT' || policyRaw === 'REJECT-DROP') ? 'REJECT' : (groupTags.has(policyRaw) ? policyRaw : null);

	const head = type === 'RULE-SET' ? parts[1] : parts[1];
	if (type === 'MATCH') return { final: policy || parts[1] };

	if (!policy) return null;
	// sing-box 1.11 起 block 出站被废弃，拒绝流量改用规则动作
	const base = policy === 'REJECT' ? { action: 'reject' } : { outbound: policy };

	switch (type) {
		case 'DOMAIN-SUFFIX': return { domain_suffix: [head], ...base };
		case 'DOMAIN': return { domain: [head], ...base };
		case 'DOMAIN-KEYWORD': return { domain_keyword: [head], ...base };
		case 'DOMAIN-REGEX': return { domain_regex: [head], ...base };
		case 'IP-CIDR':
		case 'IP-CIDR6': return { ip_cidr: [head], ...base };
		case 'SRC-IP-CIDR': return { source_ip_cidr: [head], ...base };
		case 'DST-PORT': return { port: head.split('/').map(value => Number(value)).filter(Number.isFinite), ...base };
		case 'SRC-PORT': return { source_port: Number(head), ...base };
		case 'PROCESS-NAME': return { process_name: [head], ...base };
		case 'GEOIP': {
			const tag = `geoip-${String(head).toLowerCase()}`;
			return providerTags.has(tag) ? { rule_set: [tag], ...base } : null;
		}
		case 'GEOSITE': {
			const tag = `geosite-${String(head).toLowerCase()}`;
			return providerTags.has(tag) ? { rule_set: [tag], ...base } : null;
		}
		case 'RULE-SET': return providerTags.has(head) ? { rule_set: [head], ...base } : null;
		default: return null;
	}
}

// 只命中字面 IPv6 地址的通配规则（mihomo 侧写作 IP-CIDR6,::/0,policy,no-resolve）。
// sing-box 没有 no-resolve，这条规则必须延后到规则列表尾部，否则每个域名目标都要
// 先解析出 IP 才能判定，既慢又会把 DNS 行为改掉。
function isLiteralIpWildcardRule(rule) {
	return Array.isArray(rule?.ip_cidr) && rule.ip_cidr.length === 1 && rule.ip_cidr[0] === '::/0';
}

// 诊断档：只保留一个节点和一个策略组，不含远程规则集，用于定位启动问题
function buildSingBoxMinimal(config, options = {}) {
	const proxies = Array.isArray(config.proxies) ? config.proxies : [];
	const skipped = [];
	let outbound = null;
	for (const proxy of proxies) {
		const candidate = toSingBoxOutbound(proxy);
		if (!candidate) { skipped.push(proxy?.name ?? 'unknown'); continue; }
		if (!outbound) outbound = candidate;
	}
	if (!outbound) {
		return { config: { outbounds: [{ type: 'direct', tag: 'DIRECT' }], route: { final: 'DIRECT' } }, skipped };
	}
	return {
		config: {
			log: { level: 'debug', timestamp: true },
			...(options.tun ? {
				inbounds: [{
					type: 'tun',
					tag: 'tun-in',
					address: ['172.19.0.1/30'],
					mtu: 9000,
					auto_route: true,
					strict_route: false,
					stack: 'mixed'
				}]
			} : {}),
			outbounds: [
				{ type: 'selector', tag: '🚀 默认代理', outbounds: [outbound.tag, 'DIRECT'], default: outbound.tag },
				outbound,
				{ type: 'direct', tag: 'DIRECT' }
			],
			route: { final: '🚀 默认代理' }
		},
		skipped
	};
}

function buildSingBox(name, config, options = {}) {
	if (options.profile === 'minimal') return buildSingBoxMinimal(config, options);
	const proxies = (Array.isArray(config.proxies) ? config.proxies : []).filter(proxy => !isJunkProxy(proxy));
	const proxyOutbounds = [];
	const proxyTags = [];
	const skipped = [];

	for (const proxy of proxies) {
		const outbound = toSingBoxOutbound(proxy);
		if (!outbound || !outbound.tag || !outbound.server || !outbound.server_port) {
			skipped.push(proxy?.name ?? 'unknown');
			continue;
		}
		proxyTags.push(outbound.tag);
		proxyOutbounds.push(outbound);
	}

	const clashGroups = Array.isArray(config['proxy-groups']) ? config['proxy-groups'] : [];
	const allGroupNames = new Set(clashGroups.map(group => sanitizeName(group.name)));

	// sing-box 对空的 selector / urltest 会直接报 "missing tags"，必须保证成员非空；
	// 组之间可以互相引用，所以要反复重算成员，直到没有新组可用为止。
	const available = new Set([...proxyTags, 'DIRECT']);
	const resolved = new Map();
	const isAutoGroup = group => ['url-test', 'fallback', 'load-balance'].includes(group.type);

	// 第一轮：只有当组引用的其它组都已就绪时才构建，避免成员被过早裁掉
	let progressed = true;
	while (progressed) {
		progressed = false;
		for (const group of clashGroups) {
			const tag = sanitizeName(group.name);
			if (resolved.has(tag)) continue;
			const raw = resolveGroupMembers(group, proxyTags, allGroupNames);
			const ready = raw.filter(member => available.has(member));
			if (ready.length !== raw.length) continue;
			const members = isAutoGroup(group) ? ready.filter(member => member !== 'DIRECT') : ready;
			if (members.length === 0) continue;
			available.add(tag);
			resolved.set(tag, { group, tag, isAuto: isAutoGroup(group), members });
			progressed = true;
		}
	}

	// 第二轮兜底：引用了已被丢弃的组时，剔除失效引用后再构建
	for (const group of clashGroups) {
		const tag = sanitizeName(group.name);
		if (resolved.has(tag)) continue;
		let members = resolveGroupMembers(group, proxyTags, allGroupNames).filter(member => available.has(member));
		if (isAutoGroup(group)) members = members.filter(member => member !== 'DIRECT');
		if (members.length === 0) continue;
		available.add(tag);
		resolved.set(tag, { group, tag, isAuto: isAutoGroup(group), members });
	}

	const built = clashGroups
		.map(group => resolved.get(sanitizeName(group.name)))
		.filter(Boolean);

	const groupOutbounds = built.map(({ group, tag, isAuto, members }) => (isAuto
		? {
			type: 'urltest',
			tag,
			outbounds: members,
			url: group.url || HEALTH_CHECK_URL,
			interval: `${Math.max(60, Number(group.interval) || 300)}s`,
			tolerance: Number(group.tolerance) || 80
		}
		: { type: 'selector', tag, outbounds: members, default: members[0] }));

	const groupTags = new Set(groupOutbounds.map(outbound => outbound.tag));

	// 规则集：MetaCubeX 同名 srs，第三方规则集用替代项
	const providerTags = new Set();
	const ruleSets = [
		{ tag: 'geosite-private', type: 'remote', format: 'binary', url: `${META_SRS}/geosite/private.srs`, download_detour: 'DIRECT' },
		{ tag: 'geoip-cn', type: 'remote', format: 'binary', url: `${META_SRS}/geoip/cn.srs`, download_detour: 'DIRECT' }
	];
	providerTags.add('geosite-private');
	providerTags.add('geoip-cn');

	for (const [key, provider] of Object.entries(config['rule-providers'] || {})) {
		const meta = providerMeta(provider);
		if (meta?.kind) {
			ruleSets.push({ tag: key, type: 'remote', format: 'binary', url: `${META_SRS}/${meta.kind}/${meta.name}.srs`, download_detour: 'DIRECT' });
			providerTags.add(key);
			continue;
		}
		const substitute = PROVIDER_SUBSTITUTES[key];
		if (substitute) {
			const kind = substitute.geosite ? 'geosite' : 'geoip';
			const target = substitute.geosite || substitute.geoip;
			ruleSets.push({ tag: key, type: 'remote', format: 'binary', url: `${META_SRS}/${kind}/${target}.srs`, download_detour: 'DIRECT' });
			providerTags.add(key);
		}
	}

	const routeRules = [];
	// sing-box 的 ip_cidr 规则没有 no-resolve 语义：放在前面会让所有域名目标先做一次
	// DNS 解析才能判定，等于给每个连接加一跳。mihomo 侧靠 no-resolve 让 ::/0 只命中字面
	// IPv6 地址，这里把同一条规则挪到最后，才能得到一致的行为。
	const deferredIpRules = [];
	let finalTag = groupTags.has('节点选择') ? '节点选择' : groupTags.has('🚀 默认代理') ? '🚀 默认代理' : 'DIRECT';
	for (const rule of config.rules || []) {
		const parsed = ruleForSingBox(rule, groupTags, providerTags);
		if (!parsed) continue;
		if (parsed.final) {
			finalTag = parsed.final;
			continue;
		}
		if (isLiteralIpWildcardRule(parsed)) {
			deferredIpRules.push(parsed);
			continue;
		}
		routeRules.push(parsed);
	}
	routeRules.push(...deferredIpRules);

	const outbounds = [
		...groupOutbounds,
		...proxyOutbounds,
		{ type: 'direct', tag: 'DIRECT' }
	];

	return {
		config: {
			log: { level: 'info', timestamp: true },
			...(options.tun ? {
				inbounds: [{
					type: 'tun',
					tag: 'tun-in',
					address: ['172.19.0.1/30'],
					mtu: 9000,
					auto_route: true,
					strict_route: false,
					stack: 'mixed'
				}]
			} : {}),
			dns: {
				servers: [
					{ tag: 'dns-local', address: 'https://223.5.5.5/dns-query', detour: 'DIRECT' },
					{ tag: 'dns-remote', address: 'https://1.1.1.1/dns-query', detour: finalTag === 'DIRECT' ? 'DIRECT' : finalTag }
				],
				// 启动阶段下载规则集也要解析域名，默认走直连 DNS 才不会卡住
				final: 'dns-local',
				strategy: 'prefer_ipv4'
			},
			outbounds,
			route: {
				rule_set: ruleSets,
				rules: routeRules,
				final: finalTag,
				auto_detect_interface: true
			},
			// 规则集下载一次后写入缓存，避免每次启动重新下载
			experimental: {
				clash_api: { external_controller: '127.0.0.1:9090' },
				cache_file: { enabled: true }
			}
		},
		skipped
	};
}

export function toSingBoxConfig(name, config, options) {
	return buildSingBox(name, config, options).config;
}

export function toSingBoxConfigWithStats(name, config, options) {
	return buildSingBox(name, config, options);
}

/* ------------------------------ Quantumult X ------------------------------ */

// QX 的策略名不能含逗号，过长的 emoji 组名也容易在 UI 里截断，这里做一次稳定映射。
function qxPolicyName(value) {
	return sanitizeName(value)
		.replace(/[,\r\n]/g, '')
		.replace(/[🚀🌐♻️🇺🇲🇯🇵🇸🇬🇨🇳🇰🇷🇭🇰]/gu, '')
		.replace(/\s+/g, '')
		.trim();
}

function qxRulePolicy(policy, groupMap) {
	if (policy === 'DIRECT') return 'direct';
	if (policy === 'REJECT' || policy === 'REJECT-DROP') return 'reject';
	return groupMap.get(policy) || null;
}

function qxServer(proxy) {
	const type = String(proxy.type || '').toLowerCase();
	const host = `${proxy.server}:${proxy.port}`;
	const tag = `tag=${String(proxy.name ?? '').replace(/[,\r\n]+/g, ' ').trim()}`;
	const wsOpts = proxy['ws-opts'] || {};
	const obfs = proxy.network === 'ws' ? (proxy.tls ? 'wss' : 'ws') : undefined;
	const obfsHost = wsOpts.headers?.Host || wsOpts.headers?.host;
	if (type === 'vmess') {
		return `vmess=${host}, method=${proxy.cipher === 'auto' ? 'none' : proxy.cipher}, password=${proxy.uuid}${
			obfs ? `, obfs=${obfs}, obfs-host=${obfsHost || proxy.server}, obfs-uri=${wsOpts.path || '/'}` : ''
		}${proxy.tls ? ', tls-verify=false' : ''}, fast-open=false, udp-relay=true, ${tag}`;
	}
	if (type === 'vless') {
		if (proxy['reality-opts']) return null;
		return `vless=${host}, method=none, password=${proxy.uuid}${
			obfs ? `, obfs=${obfs}, obfs-host=${obfsHost || proxy.server}, obfs-uri=${wsOpts.path || '/'}` : ''
		}${proxy.tls ? ', tls-verify=false' : ''}, fast-open=false, udp-relay=true, ${tag}`;
	}
	if (type === 'trojan') return `trojan=${host}, password=${proxy.password}, over-tls=true, tls-host=${hostOf(proxy) || proxy.server}, tls-verify=false, udp-relay=true, ${tag}`;
	if (type === 'ss' || type === 'shadowsocks') return `shadowsocks=${host}, method=${proxy.cipher}, password=${proxy.password}, udp-relay=true, ${tag}`;
	if (type === 'ssr') return `shadowsocks=${host}, method=${proxy.cipher}, password=${proxy.password}, obfs=${proxy.obfs || 'plain'}, obfs-host=${proxy['obfs-param'] || ''}, protocol=${proxy.protocol || 'origin'}, protocol-param=${proxy['protocol-param'] || ''}, udp-relay=true, ${tag}`;
	if (type === 'http' || type === 'https') return `http=${host}, username=${proxy.username || ''}, password=${proxy.password || ''}${proxy.tls ? ', over-tls=true, tls-verify=false' : ''}, ${tag}`;
	if (type === 'socks5') return `socks5=${host}, username=${proxy.username || ''}, password=${proxy.password || ''}, ${tag}`;
	// Quantumult X 不支持 hysteria / hysteria2 / tuic
	return null;
}

function qxFilterRule(rule, groupMap) {
	const parts = String(rule).split(',').map(part => part.trim());
	const type = (parts[0] || '').toUpperCase();
	const noResolve = parts[parts.length - 1] === 'no-resolve';
	const policyRaw = parts[parts.length - (noResolve ? 2 : 1)];
	const policy = qxRulePolicy(policyRaw, groupMap);
	if (type === 'MATCH') return `final, ${policy || policyRaw}`;
	if (!policy) return null;
	const value = parts[1];
	switch (type) {
		case 'DOMAIN-SUFFIX': return `host-suffix, ${value}, ${policy}`;
		case 'DOMAIN': return `host, ${value}, ${policy}`;
		case 'DOMAIN-KEYWORD': return `host-keyword, ${value}, ${policy}`;
		case 'IP-CIDR': return `ip-cidr, ${value}, ${policy}, no-resolve`;
		case 'IP-CIDR6': return `ip6-cidr, ${value}, ${policy}, no-resolve`;
		case 'GEOIP': return `geoip, ${String(value).toLowerCase()}, ${policy}`;
		default: return null;
	}
}

export function toQuantumultXConfig(name, config, { part = 'servers' } = {}) {
	const proxies = Array.isArray(config.proxies) ? config.proxies : [];
	const skipped = [];
	const lines = [];
	for (const proxy of proxies) {
		const line = qxServer(proxy);
		if (line) lines.push(line);
		else skipped.push(proxy?.name ?? 'unknown');
	}

	const clashGroups = Array.isArray(config['proxy-groups']) ? config['proxy-groups'] : [];
	const groupMap = new Map(clashGroups.map(group => [group.name, qxPolicyName(group.name)]));

	if (part === 'servers') {
		return { text: lines.length ? `${lines.join('\n')}\n` : '', skipped, policyCount: 0, ruleCount: 0 };
	}

	const policyLines = [];
	for (const group of clashGroups) {
		const policyName = groupMap.get(group.name);
		const isAuto = ['url-test', 'fallback', 'load-balance'].includes(group.type);
		const members = (group.proxies || []).filter(item => item === 'DIRECT' || groupMap.has(item));
		const mapped = members.map(item => (item === 'DIRECT' ? 'direct' : groupMap.get(item)));
		// 未展开的组（原 include-all 类）交给 QX 的代理池自动覆盖
		policyLines.push(isAuto
			? `url-latency-benchmark=${policyName}, ${['proxy', ...mapped].join(', ')}, check-interval=600, tolerance=100`
			: `static=${policyName}, ${['proxy', ...mapped].join(', ')}`);
	}

	const filterLines = [];
	for (const rule of config.rules || []) {
		const line = qxFilterRule(rule, groupMap);
		if (line) filterLines.push(line);
	}

	const body = [
		'[general]',
		'network_check_url=http://www.gstatic.com/generate_204',
		'server_check_url=http://www.gstatic.com/generate_204',
		'',
		'[policy]',
		...policyLines,
		'',
		'[server_local]',
		...lines,
		'',
		'[filter_local]',
		...filterLines
	].join('\n');

	return { text: `${body}\n`, skipped, policyCount: policyLines.length, ruleCount: filterLines.length };
}

/* --------------------------------- 响应封装 -------------------------------- */

export function normalizeTarget(value) {
	const target = String(value || '').trim().toLowerCase();
	if (target === 'sing-box' || target === 'singbox') return 'singbox';
	if (['quantumultx', 'quantumult-x', 'qx', 'qx-filter'].includes(target)) return 'qx';
	if (SUPPORTED_TARGETS.has(target)) return target;
	return 'clash';
}

function attachment(name, extension) {
	return `attachment; filename*=UTF-8''${encodeURIComponent(`${name}${extension}`)}`;
}

// 部分客户端支持 profile-title 头作为订阅名称（base64 以兼容中文）
function profileTitleHeaders(name) {
	try {
		const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(name)));
		return { 'profile-title': `base64:${encoded}` };
	} catch {
		return {};
	}
}

export function renderClientFormat(target, name, config, extraHeaders = {}, options = {}) {
	const normalized = normalizeTarget(target);
	const safeName = sanitizeName(name) || 'clashsub';
	const baseHeaders = { 'profile-update-interval': '12', 'X-ClashSub-Target': normalized, ...profileTitleHeaders(safeName), ...extraHeaders };

	if (normalized === 'singbox') {
		const { config: singboxConfig, skipped } = toSingBoxConfigWithStats(safeName, config, { tun: options.tun === true, profile: options.profile });
		return new Response(JSON.stringify(singboxConfig, null, 2), {
			headers: {
				...baseHeaders,
				'Content-Type': 'application/json; charset=utf-8',
				'Content-Disposition': attachment(safeName, '.json'),
				'X-ClashSub-Skipped': String(skipped.length)
			}
		});
	}

	if (normalized === 'qx') {
		const part = options.part === 'rules' ? 'rules' : 'servers';
		const result = toQuantumultXConfig(safeName, config, { part });
		if (!result.text) {
			return new Response(
				'该订阅中没有 Quantumult X 支持的节点。Quantumult X 仅支持 shadowsocks / vmess / trojan / http / socks5（VLESS 仅有限支持且不支持 Reality，不支持 Hysteria/Hysteria2/TUIC）。请改用 Clash、Stash 或 sing-box。',
				{
					status: 400,
					headers: { ...baseHeaders, 'Content-Type': 'text/plain; charset=utf-8', 'X-ClashSub-Skipped': String(result.skipped.length) }
				}
			);
		}
		return new Response(result.text, {
			headers: {
				...baseHeaders,
				'Content-Type': 'text/plain; charset=utf-8',
				'Content-Disposition': attachment(safeName, part === 'rules' ? '.conf' : '.list'),
				'X-ClashSub-Skipped': String(result.skipped.length)
			}
		});
	}

	const output = normalized === 'clash' ? config : toStashConfig(config);
	const yaml = stringifyYaml(output, { lineWidth: 0, defaultKeyType: 'PLAIN' }).replace(/\n$/, '');
	return new Response(yaml, {
		headers: {
			...baseHeaders,
			'Content-Type': 'text/yaml; charset=utf-8',
			'Content-Disposition': attachment(safeName, '.yaml')
		}
	});
}
