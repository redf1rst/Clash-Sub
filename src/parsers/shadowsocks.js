import { formatServerAddress } from '../utils/address.js';
import { parseSmuxConfig } from './helpers.js';

// 解析Shadowsocks
function parseShadowsocks(url) {
	// 支持两种格式：
	// 1. ss://base64(method:password)@server:port#name
	// 2. ss://base64(method:password@server:port)#name

	const hashIndex = url.indexOf('#');
	const name = hashIndex !== -1 ? decodeURIComponent(url.substring(hashIndex + 1)) : 'Shadowsocks';
	const mainPart = hashIndex !== -1 ? url.substring(0, hashIndex) : url;

	// 移除 ss:// 前缀
	const withoutPrefix = mainPart.substring(5);

	let method, password, server, port;

	// 检查是否包含 @ 符号来判断格式
	if (withoutPrefix.includes('@')) {
		// 格式1: base64(method:password)@server:port
		const atIndex = withoutPrefix.lastIndexOf('@');
		const encodedPart = withoutPrefix.substring(0, atIndex);
		const serverPart = withoutPrefix.substring(atIndex + 1);

		// 解码用户信息
		const userInfo = atob(encodedPart);
		const colonIndex = userInfo.indexOf(':');
		method = userInfo.substring(0, colonIndex);
		password = userInfo.substring(colonIndex + 1);

		// 解析服务器信息
		const lastColonIndex = serverPart.lastIndexOf(':');
		server = serverPart.substring(0, lastColonIndex);
		port = parseInt(serverPart.substring(lastColonIndex + 1));
	} else {
		// 格式2: base64(method:password@server:port)
		const decoded = atob(withoutPrefix);
		const atIndex = decoded.lastIndexOf('@');
		const userInfo = decoded.substring(0, atIndex);
		const serverPart = decoded.substring(atIndex + 1);

		// 解析用户信息
		const colonIndex = userInfo.indexOf(':');
		method = userInfo.substring(0, colonIndex);
		password = userInfo.substring(colonIndex + 1);

		// 解析服务器信息
		const lastColonIndex = serverPart.lastIndexOf(':');
		server = serverPart.substring(0, lastColonIndex);
		port = parseInt(serverPart.substring(lastColonIndex + 1));
	}

	// 处理IPv6地址
	if (server.startsWith('[') && server.endsWith(']')) {
		server = server.slice(1, -1);
	}

	const config = {
		name: name,
		type: 'ss',
		server: formatServerAddress(server),
		port: port,
		cipher: method,
		password: password
	};

	// 从 URL 参数中解析额外配置
	const urlObj = new URL(url.replace('ss://', 'http://'));
	const params = urlObj.searchParams;

	// 添加 UDP 支持
	if (params.get('udp')) {
		config.udp = params.get('udp') === 'true' || params.get('udp') === '1';
	}

	// 添加 UDP over TCP
	if (params.get('udp-over-tcp')) {
		config['udp-over-tcp'] = params.get('udp-over-tcp') === 'true' || params.get('udp-over-tcp') === '1';
	}

	// 添加 UDP over TCP 版本
	if (params.get('udp-over-tcp-version')) {
		config['udp-over-tcp-version'] = parseInt(params.get('udp-over-tcp-version'));
	}

	// 添加 IP 版本偏好
	if (params.get('ip-version')) {
		config['ip-version'] = params.get('ip-version');
	}

	// 添加客户端指纹
	if (params.get('client-fingerprint')) {
		config['client-fingerprint'] = params.get('client-fingerprint');
	}

	// 添加 SMUX 配置
	if (params.get('smux-enabled') === 'true') {
		config.smux = {
			enabled: true,
			protocol: params.get('smux-protocol') || 'smux'
		};
		if (params.get('smux-max-connections')) {
			config.smux['max-connections'] = parseInt(params.get('smux-max-connections'));
		}
		if (params.get('smux-min-streams')) {
			config.smux['min-streams'] = parseInt(params.get('smux-min-streams'));
		}
		if (params.get('smux-max-streams')) {
			config.smux['max-streams'] = parseInt(params.get('smux-max-streams'));
		}
		if (params.get('smux-padding')) {
			config.smux.padding = params.get('smux-padding') === 'true';
		}
		if (params.get('smux-statistic')) {
			config.smux.statistic = params.get('smux-statistic') === 'true';
		}
		if (params.get('smux-only-tcp')) {
			config.smux['only-tcp'] = params.get('smux-only-tcp') === 'true';
		}
	}

	// 添加插件配置
	if (params.get('plugin')) {
		config.plugin = params.get('plugin');
		config['plugin-opts'] = {};

		// obfs 插件配置
		if (params.get('plugin') === 'obfs') {
			if (params.get('obfs-mode')) {
				config['plugin-opts'].mode = params.get('obfs-mode');
			}
			if (params.get('obfs-host')) {
				config['plugin-opts'].host = params.get('obfs-host');
			}
		}

		// v2ray-plugin 配置
		if (params.get('plugin') === 'v2ray-plugin') {
			if (params.get('v2ray-mode')) {
				config['plugin-opts'].mode = params.get('v2ray-mode');
			}
			if (params.get('v2ray-tls')) {
				config['plugin-opts'].tls = params.get('v2ray-tls') === 'true';
			}
			if (params.get('v2ray-host')) {
				config['plugin-opts'].host = params.get('v2ray-host');
			}
			if (params.get('v2ray-path')) {
				config['plugin-opts'].path = params.get('v2ray-path');
			}
			if (params.get('v2ray-mux')) {
				config['plugin-opts'].mux = params.get('v2ray-mux') === 'true';
			}
			if (params.get('v2ray-fingerprint')) {
				config['plugin-opts'].fingerprint = params.get('v2ray-fingerprint');
			}
			if (params.get('v2ray-skip-cert-verify')) {
				config['plugin-opts']['skip-cert-verify'] = params.get('v2ray-skip-cert-verify') === 'true';
			}
		}

		// shadow-tls 插件配置
		if (params.get('plugin') === 'shadow-tls') {
			if (params.get('shadow-tls-host')) {
				config['plugin-opts'].host = params.get('shadow-tls-host');
			}
			if (params.get('shadow-tls-password')) {
				config['plugin-opts'].password = params.get('shadow-tls-password');
			}
			if (params.get('shadow-tls-version')) {
				config['plugin-opts'].version = parseInt(params.get('shadow-tls-version'));
			}
			if (params.get('shadow-tls-alpn')) {
				config['plugin-opts'].alpn = params.get('shadow-tls-alpn').split(',');
			}
			// 添加客户端指纹支持
			if (params.get('client-fingerprint')) {
				config['client-fingerprint'] = params.get('client-fingerprint');
			}
		}

		// gost-plugin 配置
		if (params.get('plugin') === 'gost-plugin') {
			if (params.get('gost-mode')) {
				config['plugin-opts'].mode = params.get('gost-mode');
			}
			if (params.get('gost-tls')) {
				config['plugin-opts'].tls = params.get('gost-tls') === 'true';
			}
			if (params.get('gost-host')) {
				config['plugin-opts'].host = params.get('gost-host');
			}
			if (params.get('gost-path')) {
				config['plugin-opts'].path = params.get('gost-path');
			}
			if (params.get('gost-mux')) {
				config['plugin-opts'].mux = params.get('gost-mux') === 'true';
			}
			if (params.get('gost-fingerprint')) {
				config['plugin-opts'].fingerprint = params.get('gost-fingerprint');
			}
			if (params.get('gost-skip-cert-verify')) {
				config['plugin-opts']['skip-cert-verify'] = params.get('gost-skip-cert-verify') === 'true';
			}
			if (params.get('gost-headers')) {
				try {
					config['plugin-opts'].headers = JSON.parse(params.get('gost-headers'));
				} catch (e) {
					// 如果解析失败，忽略headers配置
				}
			}
		}

		// restls 插件配置
		if (params.get('plugin') === 'restls') {
			if (params.get('restls-host')) {
				config['plugin-opts'].host = params.get('restls-host');
			}
			if (params.get('restls-password')) {
				config['plugin-opts'].password = params.get('restls-password');
			}
			if (params.get('restls-version-hint')) {
				config['plugin-opts']['version-hint'] = params.get('restls-version-hint');
			}
			if (params.get('restls-script')) {
				config['plugin-opts']['restls-script'] = params.get('restls-script');
			}
		}
	}

	// 添加 SMUX 配置
	const smuxConfig = parseSmuxConfig(params);
	if (smuxConfig) {
		config.smux = smuxConfig;
	}

	return config;
}

// 解析ShadowsocksR
function parseShadowsocksR(url) {
	// SSR URL 格式: ssr://base64(server:port:protocol:method:obfs:password_base64/?params)
	const base64Part = url.substring(6); // 移除 ssr://
	const decoded = atob(base64Part);

	// 分割主要部分和参数部分
	const questionIndex = decoded.indexOf('/?');
	const mainPart = questionIndex !== -1 ? decoded.substring(0, questionIndex) : decoded;
	const paramsPart = questionIndex !== -1 ? decoded.substring(questionIndex + 2) : '';

	// 解析主要部分: server:port:protocol:method:obfs:password_base64
	const parts = mainPart.split(':');
	if (parts.length < 6) {
		return null;
	}

	const server = parts[0];
	const port = parseInt(parts[1]);
	const protocol = parts[2];
	const method = parts[3];
	const obfs = parts[4];
	const passwordBase64 = parts[5];

	// 解码密码
	let password;
	try {
		password = atob(passwordBase64);
	} catch (e) {
		password = passwordBase64; // 如果解码失败，直接使用原始值
	}

	const config = {
		name: 'ShadowsocksR',
		type: 'ssr',
		server: formatServerAddress(server),
		port: port,
		cipher: method,
		password: password,
		protocol: protocol,
		obfs: obfs
	};

	// 解析参数
	if (paramsPart) {
		const params = new URLSearchParams(paramsPart);

		// 解析混淆参数
		if (params.get('obfsparam')) {
			try {
				config['obfs-param'] = atob(params.get('obfsparam'));
			} catch (e) {
				config['obfs-param'] = params.get('obfsparam');
			}
		}

		// 解析协议参数
		if (params.get('protoparam')) {
			try {
				config['protocol-param'] = atob(params.get('protoparam'));
			} catch (e) {
				config['protocol-param'] = params.get('protoparam');
			}
		}

		// 解析备注
		if (params.get('remarks')) {
			try {
				config.name = atob(params.get('remarks'));
			} catch (e) {
				config.name = params.get('remarks');
			}
		}

		// 添加 UDP 支持
		if (params.get('udp')) {
			config.udp = params.get('udp') === 'true' || params.get('udp') === '1';
		}
	}

	return config;
}

export { parseShadowsocks, parseShadowsocksR };
