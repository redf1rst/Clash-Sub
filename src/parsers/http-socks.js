import { formatServerAddress } from '../utils/address.js';

// 解析SOCKS5
function parseSocks5(url) {
	const parsed = new URL(url);
	const params = parsed.searchParams;

	const config = {
		name: decodeURIComponent(parsed.hash.substring(1)) || 'SOCKS5',
		type: 'socks5',
		server: formatServerAddress(parsed.hostname),
		port: parseInt(parsed.port)
	};

	// 添加用户名和密码
	if (parsed.username) {
		config.username = decodeURIComponent(parsed.username);
	}
	if (parsed.password) {
		config.password = decodeURIComponent(parsed.password);
	}

	// 添加 TLS 支持
	if (params.get('tls') === 'true') {
		config.tls = true;
	}

	// 添加指纹
	if (params.get('fingerprint')) {
		config.fingerprint = params.get('fingerprint');
	}

	// 添加跳过证书验证
	if (params.get('skip-cert-verify') === 'true') {
		config['skip-cert-verify'] = true;
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

// 解析HTTP代理
function parseHttp(url) {
	const parsed = new URL(url);
	const params = parsed.searchParams;

	const config = {
		name: decodeURIComponent(parsed.hash.substring(1)) || 'HTTP',
		type: 'http',
		server: formatServerAddress(parsed.hostname),
		port: parseInt(parsed.port)
	};

	// 添加用户名和密码
	if (parsed.username) {
		config.username = decodeURIComponent(parsed.username);
	}
	if (parsed.password) {
		config.password = decodeURIComponent(parsed.password);
	}

	// 添加 TLS 支持 (HTTPS)
	if (url.startsWith('https://') || params.get('tls') === 'true') {
		config.tls = true;
	}

	// 添加跳过证书验证
	if (params.get('skip-cert-verify') === 'true') {
		config['skip-cert-verify'] = true;
	}

	// 添加 SNI
	if (params.get('sni')) {
		config.sni = params.get('sni');
	}

	// 添加指纹
	if (params.get('fingerprint')) {
		config.fingerprint = params.get('fingerprint');
	}

	// 添加 IP 版本偏好
	if (params.get('ip-version')) {
		config['ip-version'] = params.get('ip-version');
	}

	return config;
}

export { parseHttp, parseSocks5 };
