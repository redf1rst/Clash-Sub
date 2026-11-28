// Return fresh providers while preserving source order and daily refreshes.
export function buildRuleProviders() {
	return {
		"private_domain": {
			"type": "http",
			"interval": 86400,
			"behavior": "domain",
			"format": "mrs",
			"proxy": "♻️ 自动选择",
			"url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/private.mrs",
			"path": "./ruleset/private_domain.mrs"
		},
		"private_ip": {
			"type": "http",
			"interval": 86400,
			"behavior": "ipcidr",
			"format": "mrs",
			"proxy": "♻️ 自动选择",
			"url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/private.mrs",
			"path": "./ruleset/private_ip.mrs"
		},
		"fakeip_filter": {
			"type": "http",
			"interval": 86400,
			"behavior": "domain",
			"format": "mrs",
			"proxy": "♻️ 自动选择",
			"url": "https://raw.githubusercontent.com/DustinWin/ruleset_geodata/mihomo-ruleset/fakeip-filter.mrs",
			"path": "./ruleset/fakeip_filter.mrs"
		},
		"stun_domain": {
			"type": "http",
			"interval": 86400,
			"behavior": "domain",
			"format": "mrs",
			"proxy": "♻️ 自动选择",
			"url": "https://raw.githubusercontent.com/Kwisma/rules/main/rules/mihomo/STUN/STUN_Domain.mrs",
			"path": "./ruleset/stun_domain.mrs"
		},
		"advertising_ads": {
			"type": "http",
			"interval": 86400,
			"behavior": "domain",
			"format": "mrs",
			"proxy": "♻️ 自动选择",
			"url": "https://raw.githubusercontent.com/TG-Twilight/AWAvenue-Ads-Rule/main/Filters/AWAvenue-Ads-Rule-Clash.mrs",
			"path": "./ruleset/advertising_ads.mrs"
		},
		"ai": {
			"type": "http",
			"interval": 86400,
			"behavior": "domain",
			"format": "mrs",
			"proxy": "♻️ 自动选择",
			"url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-ai-!cn.mrs",
			"path": "./ruleset/ai.mrs"
		},
		"netflix_domain": {
			"type": "http",
			"interval": 86400,
			"behavior": "domain",
			"format": "mrs",
			"proxy": "♻️ 自动选择",
			"url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/netflix.mrs",
			"path": "./ruleset/netflix_domain.mrs"
		},
		"netflix_ip": {
			"type": "http",
			"interval": 86400,
			"behavior": "ipcidr",
			"format": "mrs",
			"proxy": "♻️ 自动选择",
			"url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/netflix.mrs",
			"path": "./ruleset/netflix_ip.mrs"
		},
		"tiktok_domain": {
			"type": "http",
			"interval": 86400,
			"behavior": "domain",
			"format": "mrs",
			"proxy": "♻️ 自动选择",
			"url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/tiktok.mrs",
			"path": "./ruleset/tiktok_domain.mrs"
		},
		"spotify_domain": {
			"type": "http",
			"interval": 86400,
			"behavior": "domain",
			"format": "mrs",
			"proxy": "♻️ 自动选择",
			"url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/spotify.mrs",
			"path": "./ruleset/spotify_domain.mrs"
		},
		"paypal_domain": {
			"type": "http",
			"interval": 86400,
			"behavior": "domain",
			"format": "mrs",
			"proxy": "♻️ 自动选择",
			"url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/paypal.mrs",
			"path": "./ruleset/paypal_domain.mrs"
		},
		"microsoft_domain": {
			"type": "http",
			"interval": 86400,
			"behavior": "domain",
			"format": "mrs",
			"proxy": "♻️ 自动选择",
			"url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/microsoft.mrs",
			"path": "./ruleset/microsoft_domain.mrs"
		},
		"apple_cn_domain": {
			"type": "http",
			"interval": 86400,
			"behavior": "domain",
			"format": "mrs",
			"proxy": "♻️ 自动选择",
			"url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/apple-cn.mrs",
			"path": "./ruleset/apple_cn_domain.mrs"
		},
		"gfw_domain": {
			"type": "http",
			"interval": 86400,
			"behavior": "domain",
			"format": "mrs",
			"proxy": "♻️ 自动选择",
			"url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/gfw.mrs",
			"path": "./ruleset/gfw_domain.mrs"
		},
		"geolocation-!cn": {
			"type": "http",
			"interval": 86400,
			"behavior": "domain",
			"format": "mrs",
			"proxy": "♻️ 自动选择",
			"url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/geolocation-!cn.mrs",
			"path": "./ruleset/geolocation-!cn.mrs"
		},
		"cn_domain": {
			"type": "http",
			"interval": 86400,
			"behavior": "domain",
			"format": "mrs",
			"proxy": "♻️ 自动选择",
			"url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/cn.mrs",
			"path": "./ruleset/cn_domain.mrs"
		},
		"cn_ip": {
			"type": "http",
			"interval": 86400,
			"behavior": "ipcidr",
			"format": "mrs",
			"proxy": "♻️ 自动选择",
			"url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/cn.mrs",
			"path": "./ruleset/cn_ip.mrs"
		},
		"google_ip": {
			"type": "http",
			"interval": 86400,
			"behavior": "ipcidr",
			"format": "mrs",
			"proxy": "♻️ 自动选择",
			"url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/google.mrs",
			"path": "./ruleset/google_ip.mrs"
		},
		"telegram_ip": {
			"type": "http",
			"interval": 86400,
			"behavior": "ipcidr",
			"format": "mrs",
			"proxy": "♻️ 自动选择",
			"url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/telegram.mrs",
			"path": "./ruleset/telegram_ip.mrs"
		}
	};
}
