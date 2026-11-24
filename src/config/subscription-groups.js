

// Fresh configuration data on every call; preserve property and rule order.
export function buildSubscriptionGroups() {
	return [
		{
			name: '🚀 默认代理',
			type: 'select',
			proxies: [
				'🌐 全部节点',
				'♻️ 自动选择',
				'♻️ 美国自动',
				'♻️ 日本自动',
				'♻️ 新加坡自动',
				'♻️ 台湾自动',
				'♻️ 韩国自动',
				'♻️ 香港自动',
				// '♻️ 法国自动 🇫🇷',
				// '♻️ 英国自动 🇬🇧',
				// '♻️ 澳洲自动 🇦🇺',
				// '♻️ 德国自动 🇩🇪',
				'🇺🇲 美国节点',
				'🇯🇵 日本节点',
				'🇸🇬 新加坡节点',
				'🇨🇳 台湾节点',
				'🇰🇷 韩国节点',
				'🇭🇰 香港节点',
				// '🇬🇧 英国节点',
				// '🇫🇷 法国节点',
				// '🇮🇳 印度节点',
				// '🇦🇺 澳洲节点',
				// '🇩🇪 德国节点',
				'DIRECT'
			],
			icon: 'https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Proxy.png'
		},
		{
			name: '🌐 全部节点',
			type: 'select',
			'include-all': true,
			'exclude-filter': '^(?=.*((?i)10x|6x|过滤|客户端|不要|付款|如果|群|邀请|返利|循环|官网|客服|网站|网址|获取|流量|到期|下次|版本|官址|备用|过期|已用|联系|邮箱|工单|贩卖|通知|倒卖|防止|国内|地址|频道|无法|说明|使用|提示|特别|访问|支持|教程|关注|更新|建议|备用|作者|加入|\\\\b(USE|USED|TOTAL|EXPIRE|EMAIL|Panel|Channel|Author)\\\\b)).*$'
		},
		{
			name: 'AI服务',
			type: 'select',
			proxies: [
				'🚀 默认代理',
				'🌐 全部节点',
				'♻️ 自动选择',
				'♻️ 美国自动',
				'♻️ 日本自动',
				'♻️ 新加坡自动',
				'♻️ 台湾自动',
				'♻️ 韩国自动',
				// '♻️ 英国自动 🇬🇧',
				// '♻️ 法国自动 🇫🇷',
				// '♻️ 澳洲自动 🇦🇺',
				// '♻️ 德国自动 🇩🇪',
				'🇺🇲 美国节点',
				'🇯🇵 日本节点',
				'🇸🇬 新加坡节点',
				'🇨🇳 台湾节点',
				'🇰🇷 韩国节点',
				// '🇬🇧 英国节点',
				// '🇫🇷 法国节点',
				// '🇮🇳 印度节点',
				// '🇦🇺 澳洲节点',
				// '🇩🇪 德国节点',

				'DIRECT'
			],
			icon: 'https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/ChatGPT.png'
		},
		{
			name: 'Linux DO',
			icon: 'https://github.com/redf1rst/clash-sub/blob/main/img/linux-do.png?raw=true',
			type: 'select',
			proxies: [
				'🚀 默认代理',
				'DIRECT'
			]
		},
		{
			name: '微软服务',
			icon: 'https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Microsoft.png',
			type: 'select',
			proxies: ['AI服务', 'DIRECT']
		},
		{
			name: '苹果服务',
			icon: 'https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Apple.png',
			type: 'select',
			proxies: ['DIRECT', '🚀 默认代理']
		},
		// {
		// 	name: 'Local',
		// 	type: 'select',
		// 	proxies: ['DIRECT', '🚀 默认代理'],
		// },
		{
			name: '♻️ 美国自动',
			icon: 'https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/flags/us.svg',
			type: 'url-test',
			'include-all': true,
			tolerance: 80,
			interval: 120,
			filter: '^(?!.*(10x|6x))(?=.*((?i)🇺🇸|美国|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|\\\\b(US|United States|America)\\\\b)).*$'
		},
		{
			name: '♻️ 日本自动',
			icon: 'https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/flags/jp.svg',
			type: 'url-test',
			'include-all': true,
			tolerance: 80,
			interval: 120,
			filter: '^(?!.*(10x|6x))(?=.*((?i)🇯🇵|日本|东京|大阪|京都|名古屋|埼玉|\\\\b(JP|Japan)\\\\b)).*$'
		},
		{
			name: '♻️ 新加坡自动',
			icon: 'https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/flags/sg.svg',
			type: 'url-test',
			'include-all': true,
			tolerance: 80,
			interval: 120,
			filter: '^(?!.*(10x|6x))(?=.*((?i)🇸🇬|新加坡|新加坡|\\\\b(SG|Singapore)\\\\b)).*$'
		},
		{
			name: '♻️ 台湾自动',
			icon: 'https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/flags/cn.svg',
			type: 'url-test',
			'include-all': true,
			tolerance: 80,
			interval: 150,
			filter: '^(?!.*(10x|6x))(?=.*((?i)🇹🇼|台湾|台北|新北|高雄|\\\\b(TW|Taiwan|Tai wan)\\\\b)).*$'
		},
		{
			name: '♻️ 韩国自动',
			icon: 'https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/flags/kr.svg',
			type: 'url-test',
			'include-all': true,
			tolerance: 80,
			interval: 120,
			filter: '^(?!.*(10x|6x))(?=.*((?i)🇰🇷|韩国|韓國|首尔|釜山|\\\\b(KR|Korea)\\\\b)).*$'
		},
		{
			name: '♻️ 香港自动',
			icon: 'https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/flags/hk.svg',
			type: 'url-test',
			'include-all': true,
			tolerance: 80,
			interval: 120,
			filter: '^(?!.*(10x|6x))(?=.*((?i)🇭🇰|香港|九龙|新界|\\\\b(HK|HongKong|Hong Kong)\\\\b)).*$'
		},
		{
			name: '♻️ 自动选择',
			icon: 'https://fastly.jsdelivr.net/gh/Orz-3/mini@master/Color/Auto.png',
			type: 'url-test',
			'include-all': true,
			tolerance: 80,
			interval: 120,
			'exclude-filter': '^(?=.*((?i)10x|6x|过滤|客户端|不要|付款|如果|群|邀请|返利|循环|官网|客服|网站|网址|获取|订阅|流量|到期|下次|版本|官址|备用|过期|已用|联系|邮箱|工单|贩卖|通知|倒卖|防止|国内|地址|频道|无法|说明|使用|提示|特别|访问|支持|教程|关注|更新|建议|备用|作者|加入|\\\\b(USE|USED|TOTAL|EXPIRE|EMAIL|Panel|Channel|Author)\\\\b|(\\\\d{4}-\\\\d{2}-\\\\d{2}|\\\\d+G))).*$'
		},
		// {
		// 	name: '♻️ 英国自动 🇬🇧',
		// 	type: 'url-test',
		// 	'include-all': true,
		// 	tolerance: 80,
		// 	interval: 120,
		// 	filter: '^(?!.*(10x|6x))(?=.*((?i)🇬🇧|英国|伦敦|曼彻斯特|\\\\b(UK|United Kingdom|Britain)\\\\b)).*$'
		// },
		// {
		// 	name: '♻️ 法国自动 🇫🇷',
		// 	type: 'url-test',
		// 	'include-all': true,
		// 	tolerance: 80,
		// 	interval: 120,
		// 	filter: '^(?!.*(10x|6x))(?=.*((?i)🇫🇷|法国|巴黎|马赛|\\\\b(FR|France)\\\\b)).*$'
		// },
		// {
		// 	name: '♻️ 德国自动 🇩🇪',
		// 	type: 'url-test',
		// 	'include-all': true,
		// 	tolerance: 80,
		// 	interval: 120,
		// 	filter: '^(?!.*(10x|6x))(?=.*((?i)🇩🇪|德国|柏林|法兰克福|慕尼黑|\\\\b(DE|Germany)\\\\b)).*$'
		// },
		// {
		// 	name: '♻️ 澳洲自动 🇦🇺',
		// 	type: 'url-test',
		// 	'include-all': true,
		// 	tolerance: 80,
		// 	interval: 120,
		// 	filter: '^(?!.*(10x|6x))(?=.*((?i)🇦🇺|澳大利亚|澳洲|悉尼|墨尔本|\\\\b(AU|AUS|Australia)\\\\b)).*$'
		// },
		{
			name: '🇺🇲 美国节点',
			type: 'select',
			'include-all': true,
			filter: '^(?!.*(10x|6x))(?=.*((?i)🇺🇸|美国|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|\\\\b(US|United States|America)\\\\b)).*$'
		},
		{
			name: '🇯🇵 日本节点',
			type: 'select',
			'include-all': true,
			filter: '^(?!.*(10x|6x))(?=.*((?i)🇯🇵|日本|东京|大阪|京都|名古屋|埼玉|\\\\b(JP|Japan)\\\\b)).*$'
		},
		{
			name: '🇸🇬 新加坡节点',
			type: 'select',
			'include-all': true,
			filter: '^(?!.*(10x|6x))(?=.*((?i)🇸🇬|新加坡|新加坡|\\\\b(SG|Singapore)\\\\b)).*$'
		},
		{
			name: '🇨🇳 台湾节点',
			type: 'select',
			'include-all': true,
			filter: '^(?!.*(10x|6x))(?=.*((?i)🇹🇼|台湾|台北|新北|高雄|\\\\b(TW|Taiwan|Tai wan)\\\\b)).*$'
		},
		{
			name: '🇰🇷 韩国节点',
			type: 'select',
			'include-all': true,
			filter: '^(?!.*(10x|6x))(?=.*((?i)🇰🇷|韩国|韓國|首尔|釜山|\\\\b(KR|Korea)\\\\b)).*$'
		},
		{
			name: '🇭🇰 香港节点',
			type: 'select',
			'include-all': true,
			filter: '^(?!.*(10x|6x))(?=.*((?i)🇭🇰|香港|九龙|新界|\\\\b(HK|HongKong|Hong Kong)\\\\b)).*$'
		}
		// {
		// 	name: '🇬🇧 英国节点',
		// 	type: 'select',
		// 	'include-all': true,
		// 	filter: '^(?!.*(10x|6x))(?=.*((?i)🇬🇧|英国|伦敦|曼彻斯特|\\\\b(UK|United Kingdom|Britain)\\\\b)).*$'
		// },
		// {
		// 	name: '🇫🇷 法国节点',
		// 	type: 'select',
		// 	'include-all': true,
		// 	filter: '^(?!.*(10x|6x))(?=.*((?i)🇫🇷|法国|巴黎|马赛|\\\\b(FR|France)\\\\b)).*$'
		// },
		// {
		// 	name: '🇩🇪 德国节点',
		// 	type: 'select',
		// 	'include-all': true,
		// 	filter: '^(?!.*(10x|6x))(?=.*((?i)🇩🇪|德国|柏林|法兰克福|慕尼黑|\\\\b(DE|Germany)\\\\b)).*$'
		// },
		// {
		// 	name: '🇦🇺 澳洲节点',
		// 	type: 'select',
		// 	'include-all': true,
		// 	filter: '^(?!.*(10x|6x))(?=.*((?i)🇦🇺|澳大利亚|澳洲|悉尼|墨尔本|\\\\b(AU|AUS|Australia)\\\\b)).*$'
		// },
		// {
		// 	name: '🇮🇳 印度节点',
		// 	type: 'select',
		// 	'include-all': true,
		// 	filter: '^(?!.*(10x|6x))(?=.*((?i)🇮🇳|印度|\\\\b(India|IN)\\\\b)).*$'
		// }
	];
}

