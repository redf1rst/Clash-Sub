import { formatServerAddress } from '../utils/address.js';

// 解析WireGuard
function parseWireGuard(url) {
	const parsed = new URL(url);
	const params = parsed.searchParams;

	const config = {
		name: decodeURIComponent(parsed.hash.substring(1)) || 'WireGuard',
		type: 'wireguard',
		server: formatServerAddress(parsed.hostname),
		port: parseInt(parsed.port)
	};

	// 必需字段
	if (params.get('private-key')) {
		config['private-key'] = params.get('private-key');
	}
	if (params.get('public-key')) {
		config['public-key'] = params.get('public-key');
	}

	// IP配置
	if (params.get('ip')) {
		config.ip = params.get('ip');
	}
	if (params.get('ipv6')) {
		config.ipv6 = params.get('ipv6');
	}

	// 可选字段
	if (params.get('pre-shared-key')) {
		config['pre-shared-key'] = params.get('pre-shared-key');
	}
	if (params.get('reserved')) {
		const reserved = params.get('reserved');
		// 支持数组格式 [209,98,59] 或字符串格式 "U4An"
		if (reserved.startsWith('[') && reserved.endsWith(']')) {
			try {
				config.reserved = JSON.parse(reserved);
			} catch (e) {
				config.reserved = reserved;
			}
		} else {
			config.reserved = reserved;
		}
	}

	// 高级配置
	if (params.get('dialer-proxy')) {
		config['dialer-proxy'] = params.get('dialer-proxy');
	}
	if (params.get('remote-dns-resolve') === 'true') {
		config['remote-dns-resolve'] = true;
	}
	if (params.get('dns')) {
		config.dns = params.get('dns').split(',');
	}
	if (params.get('refresh-server-ip-interval')) {
		config['refresh-server-ip-interval'] = parseInt(params.get('refresh-server-ip-interval'));
	}

	// UDP支持
	if (params.get('udp') === 'true') {
		config.udp = true;
	}

	// Peers配置 (如果存在)
	if (params.get('peers')) {
		try {
			config.peers = JSON.parse(decodeURIComponent(params.get('peers')));
		} catch (e) {
			// 如果解析失败，忽略peers配置
		}
	}

	// AmneziaWG配置
	if (params.get('amnezia-jc')) {
		config['amnezia-wg-option'] = {
			jc: parseInt(params.get('amnezia-jc')),
			jmin: parseInt(params.get('amnezia-jmin')) || 500,
			jmax: parseInt(params.get('amnezia-jmax')) || 501,
			s1: parseInt(params.get('amnezia-s1')) || 30,
			s2: parseInt(params.get('amnezia-s2')) || 40,
			h1: parseInt(params.get('amnezia-h1')) || 123456,
			h2: parseInt(params.get('amnezia-h2')) || 67543,
			h3: parseInt(params.get('amnezia-h3')) || 123123,
			h4: parseInt(params.get('amnezia-h4')) || 32345
		};
	}

	return config;
}

export { parseWireGuard };
