import { formatServerAddress } from '../utils/address.js';
import { parseSmuxConfig } from './helpers.js';

// 解析Trojan
function parseTrojan(url) {
	const parsed = new URL(url);
	const params = parsed.searchParams;

	const config = {
		name: decodeURIComponent(parsed.hash.substring(1)) || 'Trojan',
		type: 'trojan',
		server: formatServerAddress(parsed.hostname),
		port: parseInt(parsed.port),
		password: parsed.username,
		udp: true  // Trojan通常默认开启UDP
	};

	// 添加客户端指纹
	if (params.get('client-fingerprint')) {
		config['client-fingerprint'] = params.get('client-fingerprint');
	}

	// 添加指纹
	if (params.get('fingerprint')) {
		config.fingerprint = params.get('fingerprint');
	}

	// 添加 SNI (支持 sni 和 peer 两种参数名)
	if (params.get('sni')) {
		config.sni = params.get('sni');
	} else if (params.get('peer')) {
		config.sni = params.get('peer');
	} else {
		config.sni = parsed.hostname;
	}

	// 添加 skip-cert-verify (支持 allowInsecure 和 insecure)
	if (params.get('allowInsecure') === '1' ||
		params.get('allowInsecure') === 'true' ||
		params.get('insecure') === '1' ||
		params.get('insecure') === 'true') {
		config['skip-cert-verify'] = true;
	}

	// 添加 ALPN
	if (params.get('alpn')) {
		config.alpn = decodeURIComponent(params.get('alpn')).split(',');
	}

	// 添加 flow (用于流控模式，如 xtls-rprx-vision)
	if (params.get('flow')) {
		config.flow = params.get('flow');
	}

	// 添加 flow-show
	if (params.get('flow-show')) {
		config['flow-show'] = params.get('flow-show') === 'true';
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

	// 添加 Shadowsocks 配置
	if (params.get('ss-enabled') === 'true') {
		config['ss-opts'] = {
			enabled: true
		};
		if (params.get('ss-method')) {
			config['ss-opts'].method = params.get('ss-method');
		}
		if (params.get('ss-password')) {
			config['ss-opts'].password = params.get('ss-password');
		}
	}

	// 添加 network (传输协议)
	const network = params.get('type');
	if (network && network !== 'tcp') {
		config.network = network;

		// WebSocket 配置
		if (network === 'ws') {
			config['ws-opts'] = {};
			if (params.get('path')) {
				config['ws-opts'].path = decodeURIComponent(params.get('path'));
			}
			if (params.get('host')) {
				config['ws-opts'].headers = {
					Host: params.get('host')
				};
			}
		}

		// gRPC 配置
		if (network === 'grpc') {
			config['grpc-opts'] = {};
			if (params.get('serviceName')) {
				config['grpc-opts']['grpc-service-name'] = params.get('serviceName');
			}
		}
	}

	// 添加 client-fingerprint (TLS指纹)
	if (params.get('fp')) {
		config['client-fingerprint'] = params.get('fp');
	}

	// 添加 Reality 配置
	if (params.get('security') === 'reality' || params.get('tls') === 'reality') {
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

	// 添加 flow-show 字段
	if (params.get('flow-show')) {
		config['flow-show'] = params.get('flow-show') === 'true';
	}

	// 添加 ss-opts 配置
	if (params.get('ss-enabled') === 'true') {
		config['ss-opts'] = {
			enabled: true
		};
		if (params.get('ss-method')) {
			config['ss-opts'].method = params.get('ss-method');
		}
		if (params.get('ss-password')) {
			config['ss-opts'].password = params.get('ss-password');
		}
	}

	// 添加 SMUX 配置
	const smuxConfig = parseSmuxConfig(params);
	if (smuxConfig) {
		config.smux = smuxConfig;
	}

	return config;
}

export { parseTrojan };
