

// Fresh configuration data on every call; preserve property and rule order.
export function buildProxyGroups(proxies) {
	return [
		{
			name: '节点选择',
			type: 'select',
			proxies: [...proxies.map(p => p.name), 'DIRECT'],
			icon: 'https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Proxy.png'
		},
		{
			name: 'AI服务',
			type: 'select',
			proxies: ['节点选择', ...proxies.map(p => p.name), 'DIRECT'],
			icon: 'https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/ChatGPT.png'
		},
		{
			name: 'Linux DO',
			type: 'select',
			proxies: ['节点选择', 'DIRECT'],
			icon: 'https://github.com/redf1rst/clash-sub/blob/main/img/linux-do.png?raw=true'
		},
		{
			name: '微软服务',
			type: 'select',
			proxies: ['节点选择', 'DIRECT'],
			icon: 'https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Microsoft.png'
		},
		{
			name: '苹果服务',
			type: 'select',
			proxies: ['DIRECT', '节点选择'],
			icon: 'https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Apple.png'
		},
		// {
		// 	name: 'Local',
		// 	type: 'select',
		// 	proxies: ['DIRECT', '节点选择'],
		// }
	];
}

