import { formatServerAddress } from '../utils/address.js';

// 解析Snell
function parseSnell(url) {
	const parsed = new URL(url);
	const params = parsed.searchParams;

	const config = {
		name: decodeURIComponent(parsed.hash.substring(1)) || 'Snell',
		type: 'snell',
		server: formatServerAddress(parsed.hostname),
		port: parseInt(parsed.port)
	};

	// 添加 PSK (预共享密钥)
	if (parsed.username) {
		config.psk = decodeURIComponent(parsed.username);
	}

	// 添加版本
	if (params.get('version')) {
		config.version = parseInt(params.get('version'));
	} else {
		config.version = 4; // 默认版本4
	}

	// 添加混淆配置
	if (params.get('obfs')) {
		config['obfs-opts'] = {
			mode: params.get('obfs')
		};
		if (params.get('obfs-host')) {
			config['obfs-opts'].host = params.get('obfs-host');
		}
	}

	// 添加 UDP 支持
	if (params.get('udp') === 'true') {
		config.udp = true;
	}

	// 添加 IP 版本偏好
	if (params.get('ip-version')) {
		config['ip-version'] = params.get('ip-version');
	}

	return config;
}

export { parseSnell };
