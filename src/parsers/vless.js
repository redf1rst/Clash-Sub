import { formatServerAddress } from '../utils/address.js';
import { parseBrutalConfig, parseSmuxConfig } from './helpers.js';

// 解析VLess
function parseVless(url) {
	const parsed = new URL(url);
	const params = parsed.searchParams;

	const config = {
		name: decodeURIComponent(parsed.hash.substring(1)) || 'VLess',
		type: 'vless',
		server: formatServerAddress(parsed.hostname),
		port: parseInt(parsed.port),
		uuid: parsed.username,
		network: params.get('type') || 'tcp',
		tls: params.get('security') === 'tls' || params.get('security') === 'reality'
	};

	// 添加 UDP 支持
	if (params.get('udp')) {
		config.udp = params.get('udp') === 'true' || params.get('udp') === '1';
	}

	// 添加 IP 版本偏好
	if (params.get('ip-version')) {
		config['ip-version'] = params.get('ip-version');
	}

	// 添加 flow 字段（用于 XTLS）
	if (params.get('flow')) {
		config.flow = params.get('flow');
	}

	// 添加指纹配置
	if (params.get('fingerprint')) {
		config.fingerprint = params.get('fingerprint');
	}

	// 添加客户端指纹
	if (params.get('client-fingerprint')) {
		config['client-fingerprint'] = params.get('client-fingerprint');
	}

	// 添加跳过证书验证
	if (params.get('skip-cert-verify')) {
		config['skip-cert-verify'] = params.get('skip-cert-verify') === 'true' || params.get('skip-cert-verify') === '1';
	}

	// 添加 servername (SNI)
	if (params.get('sni')) {
		config.servername = params.get('sni');
	} else if (params.get('security') === 'tls' && params.get('host')) {
		config.servername = params.get('host');
	}

	// 添加 ECH 配置
	if (params.get('ech-enable') === 'true') {
		config['ech-opts'] = {
			enable: true
		};
		if (params.get('ech-config')) {
			config['ech-opts'].config = params.get('ech-config');
		}
	}

	// 添加 Reality 配置
	if (params.get('security') === 'reality') {
		config['reality-opts'] = {};
		if (params.get('pbk')) {
			config['reality-opts']['public-key'] = params.get('pbk');
		}
		if (params.get('sid')) {
			config['reality-opts']['short-id'] = params.get('sid');
		}
		if (params.get('support-x25519mlkem768')) {
			config['reality-opts']['support-x25519mlkem768'] = params.get('support-x25519mlkem768') === 'true';
		}
	}

	// 添加 client-fingerprint
	if (params.get('fp')) {
		config['client-fingerprint'] = params.get('fp');
	} else if (config.tls) {
		config['client-fingerprint'] = 'chrome';
	}

	// 添加 WebSocket 配置
	if (params.get('type') === 'ws') {
		config['ws-opts'] = {};
		if (params.get('path')) {
			config['ws-opts'].path = decodeURIComponent(params.get('path'));
		}
		if (params.get('host')) {
			config['ws-opts'].headers = {
				Host: params.get('host')
			};
		}
		// 添加 VLess WebSocket 增强字段
		if (params.get('v2ray-http-upgrade')) {
			config['ws-opts']['v2ray-http-upgrade'] = params.get('v2ray-http-upgrade') === 'true';
		}
		if (params.get('v2ray-http-upgrade-fast-open')) {
			config['ws-opts']['v2ray-http-upgrade-fast-open'] = params.get('v2ray-http-upgrade-fast-open') === 'true';
		}
	}

	// 添加 gRPC 配置
	if (params.get('type') === 'grpc') {
		config['grpc-opts'] = {};
		if (params.get('serviceName')) {
			config['grpc-opts']['grpc-service-name'] = params.get('serviceName');
		}
	}

	// 添加 HTTP/2 配置
	if (params.get('type') === 'h2') {
		config['h2-opts'] = {};
		if (params.get('host')) {
			config['h2-opts'].host = params.get('host').split(',');
		}
		if (params.get('path')) {
			config['h2-opts'].path = params.get('path');
		}
	}

	// 添加 TCP 配置（HTTP伪装）
	if (params.get('type') === 'tcp' && params.get('headerType') === 'http') {
		config['tcp-opts'] = {
			'header': {
				'type': 'http'
			}
		};
		if (params.get('host')) {
			config['tcp-opts'].header.request = {
				'headers': {
					'Host': params.get('host').split(',')
				}
			};
		}
	}

	// 添加 skip-cert-verify
	if (params.get('insecure') === '1' || params.get('allowInsecure') === '1') {
		config['skip-cert-verify'] = true;
	}

	// 添加 ALPN
	if (params.get('alpn')) {
		config.alpn = decodeURIComponent(params.get('alpn')).split(',');
	}

	// 添加 Reality 配置增强
	if (config['reality-opts'] && params.get('support-x25519mlkem768')) {
		config['reality-opts']['support-x25519mlkem768'] = params.get('support-x25519mlkem768') === 'true';
	}

	// 添加 SMUX 配置
	const smuxConfig = parseSmuxConfig(params);
	if (smuxConfig) {
		config.smux = smuxConfig;
	}

	// 添加 Brutal 配置
	const brutalConfig = parseBrutalConfig(params);
	if (brutalConfig) {
		config['brutal-opts'] = brutalConfig;
	}

	return config;
}

export { parseVless };
