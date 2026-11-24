import { formatServerAddress } from '../utils/address.js';

// 解析Mieru
function parseMieru(url) {
	const parsed = new URL(url);
	const params = parsed.searchParams;

	const config = {
		name: decodeURIComponent(parsed.hash.substring(1)) || 'Mieru',
		type: 'mieru',
		server: formatServerAddress(parsed.hostname),
		port: parseInt(parsed.port)
	};

	// 必需字段
	if (parsed.username) {
		config.username = decodeURIComponent(parsed.username);
	}
	if (parsed.password) {
		config.password = decodeURIComponent(parsed.password);
	}

	// 传输协议 (只支持TCP)
	config.transport = 'TCP';

	// 端口范围 (不可同时填写port和port-range)
	if (params.get('port-range')) {
		config['port-range'] = params.get('port-range');
		delete config.port; // 移除单独的port字段
	}

	// UDP支持 (UDP over TCP)
	if (params.get('udp') === 'true') {
		config.udp = true;
	}

	// 多路复用配置
	if (params.get('multiplexing')) {
		const multiplexing = params.get('multiplexing').toUpperCase();
		const validValues = ['MULTIPLEXING_OFF', 'MULTIPLEXING_LOW', 'MULTIPLEXING_MIDDLE', 'MULTIPLEXING_HIGH'];
		if (validValues.includes(multiplexing)) {
			config.multiplexing = multiplexing;
		} else {
			config.multiplexing = 'MULTIPLEXING_LOW'; // 默认值
		}
	} else {
		config.multiplexing = 'MULTIPLEXING_LOW'; // 默认值
	}

	return config;
}

export { parseMieru };
