import { formatServerAddress } from '../utils/address.js';
import { decodeBase64Text } from './helpers.js';

// 解析VMess
function parseVmess(url) {
	const data = JSON.parse(decodeBase64Text(url.substring(8)));
	const config = {
		name: data.ps || 'VMess',
		type: 'vmess',
		server: formatServerAddress(data.add),
		port: parseInt(data.port),
		uuid: data.id,
		alterId: parseInt(data.aid) || 0,
		cipher: data.scy || 'auto',
		network: data.net || 'tcp',
		tls: data.tls === 'tls'
	};

	// 添加 UDP 支持
	if (data.udp !== undefined) {
		config.udp = data.udp === true || data.udp === 'true';
	}

	// 添加 IP 版本偏好
	if (data['ip-version']) {
		config['ip-version'] = data['ip-version'];
	}

	// 添加指纹配置
	if (data.fingerprint) {
		config.fingerprint = data.fingerprint;
	}

	// 添加客户端指纹
	if (data['client-fingerprint']) {
		config['client-fingerprint'] = data['client-fingerprint'];
	}

	// 添加跳过证书验证
	if (data['skip-cert-verify'] !== undefined) {
		config['skip-cert-verify'] = data['skip-cert-verify'] === true || data['skip-cert-verify'] === 'true';
	}

	// 添加 servername (SNI)
	if (data.tls === 'tls' && data.host) {
		config.servername = data.host;
	}

	// 添加 ECH 配置
	if (data['ech-opts']) {
		config['ech-opts'] = data['ech-opts'];
	}

	// 添加 Reality 配置
	if (data.tls === 'reality' || data.security === 'reality') {
		config['reality-opts'] = {};
		if (data.pbk) {
			config['reality-opts']['public-key'] = data.pbk;
		}
		if (data.sid) {
			config['reality-opts']['short-id'] = data.sid;
		}
		if (data['support-x25519mlkem768']) {
			config['reality-opts']['support-x25519mlkem768'] = data['support-x25519mlkem768'] === true || data['support-x25519mlkem768'] === 'true';
		}
	}

	// 添加 WebSocket 配置
	if (data.net === 'ws') {
		config['ws-opts'] = {};
		if (data.path) {
			config['ws-opts'].path = data.path;
		}
		if (data.host) {
			config['ws-opts'].headers = {
				Host: data.host
			};
		}
		// 添加 WebSocket 扩展配置
		if (data['max-early-data']) {
			config['ws-opts']['max-early-data'] = parseInt(data['max-early-data']);
		}
		if (data['early-data-header-name']) {
			config['ws-opts']['early-data-header-name'] = data['early-data-header-name'];
		}
		if (data['v2ray-http-upgrade'] !== undefined) {
			config['ws-opts']['v2ray-http-upgrade'] = data['v2ray-http-upgrade'] === true || data['v2ray-http-upgrade'] === 'true';
		}
		if (data['v2ray-http-upgrade-fast-open'] !== undefined) {
			config['ws-opts']['v2ray-http-upgrade-fast-open'] = data['v2ray-http-upgrade-fast-open'] === true || data['v2ray-http-upgrade-fast-open'] === 'true';
		}
	}

	// 添加 HTTP/2 配置
	if (data.net === 'h2') {
		config.network = 'h2';
		config['h2-opts'] = {};
		if (data.host) {
			// 支持多个主机
			config['h2-opts'].host = Array.isArray(data.host) ? data.host : [data.host];
		}
		if (data.path) {
			config['h2-opts'].path = data.path;
		}
	}

	// 添加 HTTP 配置
	if (data.net === 'http') {
		config['http-opts'] = {};
		if (data.method) {
			config['http-opts'].method = data.method;
		}
		if (data.path) {
			config['http-opts'].path = Array.isArray(data.path) ? data.path : [data.path];
		}
		if (data.headers) {
			config['http-opts'].headers = data.headers;
		}
	}

	// 添加 HTTP 配置
	if (data.net === 'http') {
		config.network = 'http';
		config['http-opts'] = {};
		if (data.method) {
			config['http-opts'].method = data.method;
		} else {
			config['http-opts'].method = 'GET';
		}
		if (data.path) {
			// 支持数组格式的path
			if (Array.isArray(data.path)) {
				config['http-opts'].path = data.path;
			} else {
				config['http-opts'].path = [data.path];
			}
		} else {
			config['http-opts'].path = ['/'];
		}
		if (data.headers) {
			config['http-opts'].headers = data.headers;
		}
	}

	// 添加 gRPC 配置
	if (data.net === 'grpc') {
		config['grpc-opts'] = {};
		if (data.path) {
			config['grpc-opts']['grpc-service-name'] = data.path;
		}
	}

	// 添加 VMess 特有字段
	if (data['packet-encoding']) {
		config['packet-encoding'] = data['packet-encoding'];
	}
	if (data['global-padding'] !== undefined) {
		config['global-padding'] = data['global-padding'] === true || data['global-padding'] === 'true';
	}
	if (data['authenticated-length'] !== undefined) {
		config['authenticated-length'] = data['authenticated-length'] === true || data['authenticated-length'] === 'true';
	}
	if (data.alpn) {
		config.alpn = Array.isArray(data.alpn) ? data.alpn : [data.alpn];
	}

	// 添加 SMUX 配置
	if (data.smux) {
		config.smux = data.smux;
	}

	// 添加 Brutal 配置
	if (data['brutal-opts']) {
		config['brutal-opts'] = data['brutal-opts'];
	}

	return config;
}

export { parseVmess };
