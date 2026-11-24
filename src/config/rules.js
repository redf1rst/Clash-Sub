// 两类集合共享分流规则；每次返回新数组，顺序与授权后的配置基线一致。
export function buildRules(defaultProxy) {
	return [
		// 自定义优先规则
		'DOMAIN-SUFFIX,yfjc.xyz,DIRECT',
		'DOMAIN-SUFFIX,linux.do,Linux DO',
		'DOMAIN-SUFFIX,idcflare.com,Linux DO',
		'DOMAIN-SUFFIX,anyrouter.top,DIRECT',
		`DOMAIN-SUFFIX,leaflow.net,${defaultProxy}`,
		`DOMAIN-SUFFIX,cloudflare.com,${defaultProxy}`,
		`DOMAIN-SUFFIX,github.com,${defaultProxy}`,
		`DOMAIN-SUFFIX,githubusercontent.com,${defaultProxy}`,
		`RULE-SET,github_domain,${defaultProxy}`,
		'DOMAIN-SUFFIX,adobe.io,REJECT',
		'DOMAIN-SUFFIX,adobestats.io,REJECT',
		'DOMAIN-SUFFIX,bilibili.com,DIRECT',
		'DOMAIN-SUFFIX,cdn.bcebos.com,DIRECT',
		'RULE-SET,Advertising-ads,REJECT',
		// 内网
		'IP-CIDR,224.0.0.0/24,DIRECT,no-resolve',
		'RULE-SET,Private,DIRECT',
		'RULE-SET,Fakeip_Filter,DIRECT',

		// 特定服务规则
		'RULE-SET,ai,AI服务',
		'DOMAIN-SUFFIX,codebuddy.ai,AI服务',
		`RULE-SET,youtube_domain,${defaultProxy}`,
		'RULE-SET,google_domain,AI服务',
		'RULE-SET,onedrive_domain,微软服务',
		'RULE-SET,microsoft_domain,微软服务',
		`RULE-SET,tiktok_domain,${defaultProxy}`,
		`RULE-SET,telegram_domain,${defaultProxy}`,
		`RULE-SET,spotify_domain,${defaultProxy}`,
		`RULE-SET,netflix_domain,${defaultProxy}`,
		`RULE-SET,paypal_domain,${defaultProxy}`,
		'RULE-SET,apple_domain,苹果服务',
		`RULE-SET,speedtest_domain,${defaultProxy}`,
		// 通用国内/国外流量
		`RULE-SET,gfw_domain,${defaultProxy}`,
		`RULE-SET,geolocation-!cn,${defaultProxy}`,
		// 明确域名优先，避免在国内/常用 CDN 域名前触发 IP 兜底解析。
		'RULE-SET,cn_domain,DIRECT',
		'DOMAIN-SUFFIX,cn,DIRECT',
		'DOMAIN-KEYWORD,-cn,DIRECT',
		`DOMAIN-SUFFIX,cdn.jsdmirror.com,${defaultProxy}`,
		`DOMAIN-SUFFIX,raw.githubusercontent.com,${defaultProxy}`,
		`DOMAIN-SUFFIX,cdn.jsdelivr.net,${defaultProxy}`,
		`DOMAIN-SUFFIX,cdnjs.cloudflare.com,${defaultProxy}`,
		`DOMAIN-SUFFIX,gstatic.com,${defaultProxy}`,

		// IP 规则
		'RULE-SET,CNcidr,DIRECT',
		'RULE-SET,cn_ip,DIRECT',
		`RULE-SET,google_ip,${defaultProxy},no-resolve`,
		`RULE-SET,netflix_ip,${defaultProxy},no-resolve`,
		`RULE-SET,telegram_ip,${defaultProxy},no-resolve`,
		// 国内补充混合规则集
		'RULE-SET,ChinaMedia,DIRECT',
		'RULE-SET,China,DIRECT',

		// 特殊协议和端口拦截
		// 'DST-PORT,3478,REJECT', // STUN 端口
		// 'DST-PORT,53,REJECT', // DNS 端口，防止DNS泄漏
		// 'DST-PORT,6881-6889,REJECT', // BitTorrent 端口
		// 拦截
		// 'RULE-SET,reject_ip,REJECT',
		// 'RULE-SET,reject_non_ip,REJECT',
		// 'RULE-SET,reject_domainset,REJECT',
		// 'RULE-SET,reject_extra_domainset,REJECT',
		// 'RULE-SET,reject_non_ip_drop,REJECT-DROP',
		// 'RULE-SET,reject_non_ip_no_drop,REJECT',

		// Local
		'IP-CIDR,127.0.0.0/8,DIRECT,no-resolve',
		'IP-CIDR,172.16.0.0/12,DIRECT,no-resolve',
		'IP-CIDR,192.168.0.0/16,DIRECT,no-resolve',
		'IP-CIDR,10.0.0.0/8,DIRECT,no-resolve',
		'IP-CIDR,17.0.0.0/8,DIRECT',
		'IP-CIDR,100.64.0.0/10,DIRECT,no-resolve',
		//'RULE-SET,LAN,DIRECT',

		// 保留国内 IP 兜底的解析行为
		'GEOIP,CN,DIRECT',

		// 兜底规则
		`MATCH,${defaultProxy}`
	];
}

