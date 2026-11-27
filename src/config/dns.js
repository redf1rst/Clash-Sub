// Return fresh nested data for every generated configuration.
export function buildProxyDNS() {
	return {
		"enable": true,
		"listen": "[::]:1053",
		"ipv6": true,
		"respect-rules": true,
		"enhanced-mode": "fake-ip",
		"fake-ip-range": "198.18.0.1/16",
		"fake-ip-filter": [
			"*.lan",
			"*.local",
			"rule-set:private_domain",
			"rule-set:fakeip_filter",
			"rule-set:stun_domain"
		],
		"default-nameserver": [
			"223.5.5.5",
			"1.12.12.12"
		],
		"nameserver": [
			"https://8.8.8.8/dns-query",
			"https://1.1.1.1/dns-query"
		],
		"direct-nameserver": [
			"https://223.5.5.5/dns-query",
			"https://1.12.12.12/dns-query"
		],
		"proxy-server-nameserver": [
			"https://223.5.5.5/dns-query",
			"https://1.12.12.12/dns-query"
		],
		"nameserver-policy": {
			"rule-set:private_domain": [
				"system"
			],
			"rule-set:cn_domain": [
				"https://223.5.5.5/dns-query",
				"https://1.12.12.12/dns-query"
			],
			"+.yfjc.xyz": [
				"https://223.5.5.5/dns-query",
				"https://1.12.12.12/dns-query"
			]
		}
	};
}

export function buildSubscriptionDNS() {
	return buildProxyDNS();
}
