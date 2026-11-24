import { formatServerAddress } from '../utils/address.js';

// 解析AnyTLS
function parseAnyTLS(url) {
	const parsed = new URL(url);
	const params = parsed.searchParams;

	const config = {
		name: decodeURIComponent(parsed.hash.substring(1)) || 'AnyTLS',
		type: 'anytls',
		server: formatServerAddress(parsed.hostname),
		port: parseInt(parsed.port)
	};

	// 必需字段 - password在URL中位于@前，被识别为username
	if (parsed.username) {
		config.password = decodeURIComponent(parsed.username);
	}

	// 支持peer参数作为sni的别名
	if (params.get('peer')) {
		config.sni = params.get('peer');
	} else if (params.get('sni')) {
		config.sni = params.get('sni');
	}

	// WebSocket路径支持
	if (params.get('path')) {
		config.path = decodeURIComponent(params.get('path'));
	}

	// 客户端指纹
	if (params.get('client-fingerprint')) {
		config['client-fingerprint'] = params.get('client-fingerprint');
	} else {
		config['client-fingerprint'] = 'chrome'; // 默认值
	}

	// UDP支持
	if (params.get('udp') === 'true') {
		config.udp = true;
	}

	// 会话管理配置
	if (params.get('idle-session-check-interval')) {
		config['idle-session-check-interval'] = parseInt(params.get('idle-session-check-interval'));
	} else {
		config['idle-session-check-interval'] = 30; // 默认30秒
	}

	if (params.get('idle-session-timeout')) {
		config['idle-session-timeout'] = parseInt(params.get('idle-session-timeout'));
	} else {
		config['idle-session-timeout'] = 30; // 默认30秒
	}

	if (params.get('min-idle-session')) {
		config['min-idle-session'] = parseInt(params.get('min-idle-session'));
	} else {
		config['min-idle-session'] = 0; // 默认0
	}

	// ALPN配置
	if (params.get('alpn')) {
		config.alpn = params.get('alpn').split(',');
	} else {
		config.alpn = ['h2', 'http/1.1']; // 默认值
	}

	// 跳过证书验证
	if (params.get('skip-cert-verify') === 'true') {
		config['skip-cert-verify'] = true;
	}

	return config;
}

export { parseAnyTLS };
