// 两类集合共享规则提供者，每次返回新对象并保持原有来源及属性顺序。
export function buildRuleProviders(defaultProxy) {
	return {
		private_domain: {
			type: 'http',
			interval: 3600,
			behavior: 'domain',
			format: 'mrs',
			proxy: defaultProxy,
			url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/private.mrs',
			path: './ruleset/private_domain.mrs'
		},
		ai: {
			type: 'http',
			interval: 3600,
			behavior: 'domain',
			format: 'mrs',
			proxy: defaultProxy,
			url: 'https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/category-ai-!cn.mrs',
			path: './ruleset/ai.mrs'
		},
		youtube_domain: {
			type: 'http',
			interval: 3600,
			behavior: 'domain',
			format: 'mrs',
			proxy: defaultProxy,
			url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/youtube.mrs',
			path: './ruleset/youtube_domain.mrs'
		},
		google_domain: {
			type: 'http',
			interval: 3600,
			behavior: 'domain',
			format: 'mrs',
			proxy: defaultProxy,
			url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/google.mrs',
			path: './ruleset/google_domain.mrs'
		},
		github_domain: {
			type: 'http',
			interval: 3600,
			behavior: 'domain',
			format: 'mrs',
			proxy: defaultProxy,
			url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/github.mrs',
			path: './ruleset/github_domain.mrs'
		},
		telegram_domain: {
			type: 'http',
			interval: 3600,
			behavior: 'domain',
			format: 'mrs',
			proxy: defaultProxy,
			url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/telegram.mrs',
			path: './ruleset/telegram_domain.mrs'
		},
		netflix_domain: {
			type: 'http',
			interval: 3600,
			behavior: 'domain',
			format: 'mrs',
			proxy: defaultProxy,
			url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/netflix.mrs',
			path: './ruleset/netflix_domain.mrs'
		},
		paypal_domain: {
			type: 'http',
			interval: 3600,
			behavior: 'domain',
			format: 'mrs',
			proxy: defaultProxy,
			url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/paypal.mrs',
			path: './ruleset/paypal_domain.mrs'
		},
		onedrive_domain: {
			type: 'http',
			interval: 3600,
			behavior: 'domain',
			format: 'mrs',
			proxy: defaultProxy,
			url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/onedrive.mrs',
			path: './ruleset/onedrive_domain.mrs'
		},
		microsoft_domain: {
			type: 'http',
			interval: 3600,
			behavior: 'domain',
			format: 'mrs',
			proxy: defaultProxy,
			url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/microsoft.mrs',
			path: './ruleset/microsoft_domain.mrs'
		},
		apple_domain: {
			type: 'http',
			interval: 3600,
			behavior: 'domain',
			format: 'mrs',
			proxy: defaultProxy,
			url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/apple-cn.mrs',
			path: './ruleset/apple_domain.mrs'
		},
		speedtest_domain: {
			type: 'http',
			interval: 3600,
			behavior: 'domain',
			format: 'mrs',
			proxy: defaultProxy,
			url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/ookla-speedtest.mrs',
			path: './ruleset/speedtest_domain.mrs'
		},
		tiktok_domain: {
			type: 'http',
			interval: 3600,
			behavior: 'domain',
			format: 'mrs',
			proxy: defaultProxy,
			url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/tiktok.mrs',
			path: './ruleset/tiktok_domain.mrs'
		},
		spotify_domain: {
			type: 'http',
			interval: 3600,
			behavior: 'domain',
			format: 'mrs',
			proxy: defaultProxy,
			url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/spotify.mrs',
			path: './ruleset/spotify_domain.mrs'
		},
		gfw_domain: {
			type: 'http',
			interval: 3600,
			behavior: 'domain',
			format: 'mrs',
			proxy: defaultProxy,
			url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/gfw.mrs',
			path: './ruleset/gfw_domain.mrs'
		},
		'geolocation-!cn': {
			type: 'http',
			interval: 3600,
			behavior: 'domain',
			format: 'mrs',
			proxy: defaultProxy,
			url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/geolocation-!cn.mrs',
			path: './ruleset/geolocation-!cn.mrs'
		},
		cn_domain: {
			type: 'http',
			interval: 3600,
			behavior: 'domain',
			format: 'mrs',
			proxy: defaultProxy,
			url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/cn.mrs',
			path: './ruleset/cn_domain.mrs'
		},
		// MetaCubeX 提供的通用 IP 规则集
		cn_ip: {
			type: 'http',
			interval: 3600,
			behavior: 'ipcidr',
			format: 'mrs',
			proxy: defaultProxy,
			url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/cn.mrs',
			path: './ruleset/cn_ip.mrs'
		},
		google_ip: {
			type: 'http',
			interval: 3600,
			behavior: 'ipcidr',
			format: 'mrs',
			proxy: defaultProxy,
			url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/google.mrs',
			path: './ruleset/google_ip.mrs'
		},
		telegram_ip: {
			type: 'http',
			interval: 3600,
			behavior: 'ipcidr',
			format: 'mrs',
			proxy: defaultProxy,
			url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/telegram.mrs',
			path: './ruleset/telegram_ip.mrs'
		},
		netflix_ip: {
			type: 'http',
			interval: 3600,
			behavior: 'ipcidr',
			format: 'mrs',
			proxy: defaultProxy,
			url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/netflix.mrs',
			path: './ruleset/netflix_ip.mrs'
		},
		// blackmatrix7 提供的补充规则集
		ChinaMedia: {
			type: 'http',
			behavior: 'classical',
			interval: 3600,
			format: 'yaml',
			proxy: defaultProxy,
			url: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/ChinaMedia/ChinaMedia.yaml',
			path: './ruleset/ChinaMedia.yaml'
		},
		LAN: {
			type: 'http',
			behavior: 'classical',
			interval: 3600,
			format: 'yaml',
			proxy: defaultProxy,
			url: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Lan/Lan.yaml',
			path: './ruleset/LAN.yaml'
		},
		China: {
			type: 'http',
			behavior: 'classical',
			interval: 3600,
			format: 'yaml',
			proxy: defaultProxy,
			url: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/ChinaMax/ChinaMax_Classical.yaml',
			path: './ruleset/China.yaml'
		},
		// 其他作者提供的规则集，使用 CDN 加速并指定代理以确保下载
		Private: {
			type: 'http',
			interval: 3600,
			behavior: 'domain',
			format: 'mrs',
			proxy: defaultProxy,
			url: 'https://cdn.jsdmirror.com/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/private.mrs',
			path: './ruleset/Private.mrs'
		},
		Fakeip_Filter: {
			type: 'http',
			interval: 3600,
			behavior: 'domain',
			format: 'mrs',
			proxy: defaultProxy,
			url: 'https://cdn.jsdmirror.com/gh/DustinWin/ruleset_geodata@mihomo-ruleset/fakeip-filter.mrs',
			path: './ruleset/Fakeip_Filter.mrs'
		},
		STUN: {
			type: 'http',
			interval: 3600,
			behavior: 'domain',
			format: 'mrs',
			proxy: defaultProxy,
			url: 'https://cdn.jsdmirror.com/gh/Kwisma/rules@main/rules/mihomo/STUN/STUN_Domain.mrs',
			path: './ruleset/STUN.mrs'
		},
		CNcidr: {
			type: 'http',
			interval: 3600,
			behavior: 'ipcidr',
			format: 'mrs',
			proxy: defaultProxy,
			url: 'https://cdn.jsdmirror.com/gh/Kwisma/clash-rules@release/cncidr.mrs',
			path: './ruleset/CNcidr.mrs'
		},
		// reject_non_ip_no_drop: {
		// 	type: 'http',
		// 	behavior: 'classical',
		// 	interval: 43200,
		// 	format: 'text',
		// 	proxy: '节点选择',
		// 	url: 'https://ruleset.skk.moe/Clash/non_ip/reject-no-drop.txt',
		// 	path: './ruleset/reject_non_ip_no_drop.txt'
		// },
		// reject_non_ip_drop: {
		// 	type: 'http',
		// 	behavior: 'classical',
		// 	interval: 43200,
		// 	format: 'text',
		// 	proxy: '节点选择',
		// 	url: 'https://ruleset.skk.moe/Clash/non_ip/reject-drop.txt',
		// 	path: './ruleset/reject_non_ip_drop.txt'
		// },
		// reject_non_ip: {
		// 	type: 'http',
		// 	behavior: 'classical',
		// 	interval: 43200,
		// 	format: 'text',
		// 	proxy: '节点选择',
		// 	url: 'https://ruleset.skk.moe/Clash/non_ip/reject.txt',
		// 	path: './ruleset/reject_non_ip.txt'
		// },
		// reject_domainset: {
		// 	type: 'http',
		// 	behavior: 'domain',
		// 	interval: 43200,
		// 	format: 'text',
		// 	proxy: '节点选择',
		// 	url: 'https://ruleset.skk.moe/Clash/domainset/reject.txt',
		// 	path: './ruleset/reject_domainset.txt'
		// },
		// reject_extra_domainset: {
		// 	type: 'http',
		// 	behavior: 'domain',
		// 	interval: 43200,
		// 	format: 'text',
		// 	proxy: '节点选择',
		// 	url: 'https://ruleset.skk.moe/Clash/domainset/reject_extra.txt',
		// 	path: './ruleset/reject_domainset_extra.txt'
		// },
		// reject_ip: {
		// 	type: 'http',
		// 	behavior: 'classical',
		// 	interval: 43200,
		// 	format: 'text',
		// 	proxy: '节点选择',
		// 	url: 'https://ruleset.skk.moe/Clash/ip/reject.txt',
		// 	path: './ruleset/reject_ip.txt'
		// },
		'Advertising-ads': {
			type: 'http',
			interval: 3600,
			behavior: 'domain',
			format: 'mrs',
			proxy: defaultProxy,
			url: 'https://cdn.jsdmirror.com/gh/TG-Twilight/AWAvenue-Ads-Rule@main/Filters/AWAvenue-Ads-Rule-Clash.mrs',
			path: './ruleset/Advertising-ads.mrs'
		}
	};
}

