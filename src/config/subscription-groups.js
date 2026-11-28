// Return fresh nested data for every generated configuration.
export function buildSubscriptionGroups() {
	return [
		{
			"name": "🚀 默认代理",
			"type": "select",
			"proxies": [
				"♻️ 自动选择",
				"🌐 全部节点",
				"♻️ 美国自动",
				"♻️ 日本自动",
				"♻️ 新加坡自动",
				"♻️ 台湾自动",
				"♻️ 香港自动",
				"♻️ 韩国自动",
				"🇺🇲 美国节点",
				"🇯🇵 日本节点",
				"🇸🇬 新加坡节点",
				"🇨🇳 台湾节点",
				"🇭🇰 香港节点",
				"🇰🇷 韩国节点",
				"DIRECT"
			],
			"icon": "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Proxy.png"
		},
		{
			"name": "🌐 全部节点",
			"type": "select",
			"exclude-filter": "(?i)(10x|6x|过滤|客户端|不要|付款|如果|群|邀请|返利|循环|官网|客服|网站|网址|获取|订阅|流量|到期|下次|版本|官址|备用|过期|已用|联系|邮箱|工单|贩卖|通知|倒卖|防止|地址|频道|无法|说明|提示|特别|访问|教程|关注|更新|建议|作者|加入|\\b(USE|USED|TOTAL|EXPIRE|EMAIL|Panel|Channel|Author)\\b|\\d{4}-\\d{2}-\\d{2}|\\d+G)",
			"include-all-proxies": true
		},
		{
			"name": "AI服务",
			"type": "select",
			"proxies": [
				"♻️ 美国自动",
				"♻️ 日本自动",
				"♻️ 新加坡自动",
				"♻️ 台湾自动",
				"♻️ 韩国自动",
				"🇺🇲 美国节点",
				"🇯🇵 日本节点",
				"🇸🇬 新加坡节点",
				"🇨🇳 台湾节点",
				"🇰🇷 韩国节点",
				"🌐 全部节点",
				"🚀 默认代理",
				"DIRECT"
			],
			"icon": "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/ChatGPT.png"
		},
		{
			"name": "Linux DO",
			"icon": "https://github.com/redf1rst/clash-sub/blob/main/img/linux-do.png?raw=true",
			"type": "select",
			"proxies": [
				"🚀 默认代理",
				"🇺🇲 美国节点",
				"🇯🇵 日本节点",
				"🇸🇬 新加坡节点",
				"🇨🇳 台湾节点",
				"🇭🇰 香港节点",
				"🇰🇷 韩国节点",
				"🌐 全部节点",
				"DIRECT"
			]
		},
		{
			"name": "Netflix",
			"type": "select",
			"proxies": [
				"♻️ 新加坡自动",
				"♻️ 台湾自动",
				"♻️ 日本自动",
				"♻️ 美国自动",
				"♻️ 香港自动",
				"♻️ 韩国自动",
				"🇸🇬 新加坡节点",
				"🇨🇳 台湾节点",
				"🇯🇵 日本节点",
				"🇺🇲 美国节点",
				"🇭🇰 香港节点",
				"🇰🇷 韩国节点",
				"🚀 默认代理",
				"🌐 全部节点"
			],
			"icon": "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Netflix.png"
		},
		{
			"name": "TikTok",
			"type": "select",
			"proxies": [
				"♻️ 日本自动",
				"♻️ 新加坡自动",
				"♻️ 台湾自动",
				"♻️ 美国自动",
				"♻️ 韩国自动",
				"🇯🇵 日本节点",
				"🇸🇬 新加坡节点",
				"🇨🇳 台湾节点",
				"🇺🇲 美国节点",
				"🇰🇷 韩国节点",
				"🚀 默认代理",
				"🌐 全部节点"
			],
			"icon": "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/TikTok.png"
		},
		{
			"name": "Spotify",
			"type": "select",
			"proxies": [
				"🚀 默认代理",
				"♻️ 新加坡自动",
				"♻️ 日本自动",
				"♻️ 美国自动",
				"♻️ 香港自动",
				"♻️ 台湾自动",
				"🇸🇬 新加坡节点",
				"🇯🇵 日本节点",
				"🇺🇲 美国节点",
				"🇭🇰 香港节点",
				"🇨🇳 台湾节点",
				"🌐 全部节点",
				"DIRECT"
			],
			"icon": "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Spotify.png"
		},
		{
			"name": "PayPal",
			"type": "select",
			"proxies": [
				"🇺🇲 美国节点",
				"🇭🇰 香港节点",
				"🇯🇵 日本节点",
				"🇸🇬 新加坡节点",
				"🇨🇳 台湾节点",
				"🇰🇷 韩国节点",
				"🚀 默认代理",
				"🌐 全部节点",
				"DIRECT"
			],
			"icon": "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/PayPal.png"
		},
		{
			"name": "微软服务",
			"icon": "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Microsoft.png",
			"type": "select",
			"proxies": [
				"DIRECT",
				"🚀 默认代理",
				"AI服务",
				"🇺🇲 美国节点",
				"🇯🇵 日本节点",
				"🇸🇬 新加坡节点",
				"🇨🇳 台湾节点",
				"🇭🇰 香港节点",
				"🇰🇷 韩国节点",
				"🌐 全部节点"
			]
		},
		{
			"name": "苹果服务",
			"icon": "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Apple.png",
			"type": "select",
			"proxies": [
				"DIRECT",
				"🚀 默认代理",
				"🇺🇲 美国节点",
				"🇯🇵 日本节点",
				"🇸🇬 新加坡节点",
				"🇨🇳 台湾节点",
				"🇭🇰 香港节点",
				"🇰🇷 韩国节点",
				"🌐 全部节点"
			]
		},
		{
			"name": "🇺🇲 美国节点",
			"type": "select",
			"include-all-proxies": true,
			"filter": "(?i)^(?!.*(10x|6x)).*(🇺🇸|🇺🇲|美国|美國|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|(?<![a-z])(US|United States|America)(?![a-z]))"
		},
		{
			"name": "🇯🇵 日本节点",
			"type": "select",
			"include-all-proxies": true,
			"filter": "(?i)^(?!.*(10x|6x)).*(🇯🇵|日本|东京|東京|大阪|京都|名古屋|埼玉|(?<![a-z])(JP|Japan)(?![a-z]))"
		},
		{
			"name": "🇸🇬 新加坡节点",
			"type": "select",
			"include-all-proxies": true,
			"filter": "(?i)^(?!.*(10x|6x)).*(🇸🇬|新加坡|狮城|(?<![a-z])(SG|Singapore)(?![a-z]))"
		},
		{
			"name": "🇨🇳 台湾节点",
			"type": "select",
			"include-all-proxies": true,
			"filter": "(?i)^(?!.*(10x|6x)).*(🇹🇼|台湾|台灣|台北|新北|高雄|(?<![a-z])(TW|Tai ?wan)(?![a-z]))"
		},
		{
			"name": "🇭🇰 香港节点",
			"type": "select",
			"include-all-proxies": true,
			"filter": "(?i)^(?!.*(10x|6x)).*(🇭🇰|香港|九龙|新界|(?<![a-z])(HK|Hong ?Kong)(?![a-z]))"
		},
		{
			"name": "🇰🇷 韩国节点",
			"type": "select",
			"include-all-proxies": true,
			"filter": "(?i)^(?!.*(10x|6x)).*(🇰🇷|韩国|韓國|首尔|首爾|釜山|(?<![a-z])(KR|Korea)(?![a-z]))"
		},
		{
			"name": "♻️ 自动选择",
			"type": "url-test",
			"url": "https://www.gstatic.com/generate_204",
			"interval": 300,
			"tolerance": 80,
			"lazy": true,
			"include-all-proxies": true,
			"icon": "https://fastly.jsdelivr.net/gh/Orz-3/mini@master/Color/Auto.png",
			"exclude-filter": "(?i)(10x|6x|过滤|客户端|不要|付款|如果|群|邀请|返利|循环|官网|客服|网站|网址|获取|订阅|流量|到期|下次|版本|官址|备用|过期|已用|联系|邮箱|工单|贩卖|通知|倒卖|防止|地址|频道|无法|说明|提示|特别|访问|教程|关注|更新|建议|作者|加入|\\b(USE|USED|TOTAL|EXPIRE|EMAIL|Panel|Channel|Author)\\b|\\d{4}-\\d{2}-\\d{2}|\\d+G)"
		},
		{
			"name": "♻️ 香港自动",
			"type": "url-test",
			"url": "https://www.gstatic.com/generate_204",
			"interval": 300,
			"tolerance": 80,
			"lazy": true,
			"include-all-proxies": true,
			"icon": "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/flags/hk.svg",
			"filter": "(?i)^(?!.*(10x|6x)).*(🇭🇰|香港|九龙|新界|(?<![a-z])(HK|Hong ?Kong)(?![a-z]))"
		},
		{
			"name": "♻️ 台湾自动",
			"type": "url-test",
			"url": "https://www.gstatic.com/generate_204",
			"interval": 300,
			"tolerance": 80,
			"lazy": true,
			"include-all-proxies": true,
			"icon": "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/flags/cn.svg",
			"filter": "(?i)^(?!.*(10x|6x)).*(🇹🇼|台湾|台灣|台北|新北|高雄|(?<![a-z])(TW|Tai ?wan)(?![a-z]))"
		},
		{
			"name": "♻️ 日本自动",
			"type": "url-test",
			"url": "https://www.gstatic.com/generate_204",
			"interval": 300,
			"tolerance": 80,
			"lazy": true,
			"include-all-proxies": true,
			"icon": "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/flags/jp.svg",
			"filter": "(?i)^(?!.*(10x|6x)).*(🇯🇵|日本|东京|東京|大阪|京都|名古屋|埼玉|(?<![a-z])(JP|Japan)(?![a-z]))"
		},
		{
			"name": "♻️ 新加坡自动",
			"type": "url-test",
			"url": "https://www.gstatic.com/generate_204",
			"interval": 300,
			"tolerance": 80,
			"lazy": true,
			"include-all-proxies": true,
			"icon": "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/flags/sg.svg",
			"filter": "(?i)^(?!.*(10x|6x)).*(🇸🇬|新加坡|狮城|(?<![a-z])(SG|Singapore)(?![a-z]))"
		},
		{
			"name": "♻️ 韩国自动",
			"type": "url-test",
			"url": "https://www.gstatic.com/generate_204",
			"interval": 300,
			"tolerance": 80,
			"lazy": true,
			"include-all-proxies": true,
			"icon": "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/flags/kr.svg",
			"filter": "(?i)^(?!.*(10x|6x)).*(🇰🇷|韩国|韓國|首尔|首爾|釜山|(?<![a-z])(KR|Korea)(?![a-z]))"
		},
		{
			"name": "♻️ 美国自动",
			"type": "url-test",
			"url": "https://www.gstatic.com/generate_204",
			"interval": 300,
			"tolerance": 80,
			"lazy": true,
			"include-all-proxies": true,
			"icon": "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/flags/us.svg",
			"filter": "(?i)^(?!.*(10x|6x)).*(🇺🇸|🇺🇲|美国|美國|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|(?<![a-z])(US|United States|America)(?![a-z]))"
		}
	];
}
