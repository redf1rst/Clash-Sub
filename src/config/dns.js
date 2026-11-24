// 每次构建独立配置，保留属性顺序，避免请求间共享可变对象。
export function buildProxyDNS() {
	return {
		enable: true,
		listen: '[::]:1053',
		ipv6: true,
		'respect-rules': true,
		'enhanced-mode': 'fake-ip',
		'fake-ip-range': '198.18.0.1/16',
		'fake-ip-filter': [
			'*.lan',
			'*.local',
		],
		'default-nameserver': [
			'223.5.5.5',
			'1.12.12.12',
		],
		nameserver: [
			'https://8.8.8.8/dns-query',
			'https://1.1.1.1/dns-query',
		],
		'proxy-server-nameserver': [
			'https://223.5.5.5/dns-query',
			'https://1.12.12.12/dns-query',
		],
		'nameserver-policy': {
			// '+.ddnsdomain.xyz': '114.114.114.114',
			'rule-set:cn_domain': [
				'https://223.5.5.5/dns-query',
				'https://1.12.12.12/dns-query',
			]
		}
	};
}
// Fresh configuration data on every call; preserve property and rule order.
export function buildSubscriptionDNS() {
	return {
		enable: true,
		listen: '[::]:1053',
		ipv6: true,
		'respect-rules': true,
		'enhanced-mode': 'fake-ip',
		'fake-ip-range': '198.18.0.1/16',
		'fake-ip-filter': [
			'*.lan',
			'*.local',
		],
		'default-nameserver': [
			'223.5.5.5',
			'1.12.12.12',
		],
		nameserver: [
			'https://8.8.8.8/dns-query',
			'https://1.1.1.1/dns-query',
		],
		'proxy-server-nameserver': [
			'https://223.5.5.5/dns-query',
			'https://1.12.12.12/dns-query',
		],
		'nameserver-policy': {
			// '+.ddnsdomain.xyz': '114.114.114.114',
			'rule-set:cn_domain': [
				'https://223.5.5.5/dns-query',
				'https://1.12.12.12/dns-query',
			],
			'+.yfjc.xyz': [
				'https://223.5.5.5/dns-query',
				'https://1.12.12.12/dns-query',
			]
		}
	};
}

