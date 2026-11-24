import { formatServerAddress } from '../utils/address.js';

// 解析Hysteria (v1)
function parseHysteria(url) {
	const parsed = new URL(url);
	const params = parsed.searchParams;

	const config = {
		name: decodeURIComponent(parsed.hash.substring(1)) || 'Hysteria',
		type: 'hysteria',
		server: formatServerAddress(parsed.hostname),
		port: parseInt(parsed.port)
	};

	// 添加认证字符串 - 支持多种参数名
	if (parsed.username) {
		config['auth-str'] = parsed.username;
	}
	// 支持 auth 参数（映射到 auth-str）
	if (params.get('auth')) {
		config['auth-str'] = params.get('auth');
	}
	// 支持 auth_str 参数（直接映射到 auth-str）
	if (params.get('auth_str')) {
		config['auth-str'] = params.get('auth_str');
	}

	// 添加端口范围
	if (params.get('ports')) {
		config.ports = params.get('ports');
	}

	// 添加混淆
	if (params.get('obfs')) {
		config.obfs = params.get('obfs');
	}

	// 添加协议类型 (udp/wechat-video/faketcp)
	if (params.get('protocol')) {
		config.protocol = params.get('protocol');
	}

	// 添加 ALPN
	if (params.get('alpn')) {
		config.alpn = params.get('alpn').split(',');
	}

	// 添加上传下载速度
	if (params.get('up')) {
		config.up = params.get('up');
	}
	if (params.get('down')) {
		config.down = params.get('down');
	}
	// 支持 upmbps 和 downmbps 参数
	if (params.get('upmbps')) {
		config.up = params.get('upmbps');
	}
	if (params.get('downmbps')) {
		config.down = params.get('downmbps');
	}

	// 添加 SNI - 支持多种参数名
	if (params.get('sni')) {
		config.sni = params.get('sni');
	}
	// 支持 peer 参数（映射到 sni）
	if (params.get('peer')) {
		config.sni = params.get('peer');
	}

	// 添加跳过证书验证 - 支持多种参数名
	if (params.get('skip-cert-verify')) {
		config['skip-cert-verify'] = params.get('skip-cert-verify') === 'true';
	}
	// 支持 insecure 参数（映射到 skip-cert-verify）
	if (params.get('insecure')) {
		config['skip-cert-verify'] = params.get('insecure') === '1' || params.get('insecure') === 'true';
	}

	// 添加延迟参数（虽然Clash可能不直接支持，但保留用于信息记录）
	if (params.get('delay')) {
		// 可以作为注释信息保存在名称中，或者忽略
		const delay = params.get('delay');
		if (delay && !isNaN(parseInt(delay))) {
			// 将延迟信息添加到节点名称中
			config.name += ` (${delay}ms)`;
		}
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

	// 添加接收窗口配置
	if (params.get('recv-window-conn')) {
		config['recv-window-conn'] = parseInt(params.get('recv-window-conn'));
	}
	if (params.get('recv-window')) {
		config['recv-window'] = parseInt(params.get('recv-window'));
	}

	// 添加 CA 配置
	if (params.get('ca')) {
		config.ca = params.get('ca');
	}
	if (params.get('ca-str')) {
		config['ca-str'] = params.get('ca-str');
	}

	// 添加禁用 MTU 发现
	if (params.get('disable-mtu-discovery')) {
		config['disable-mtu-discovery'] = params.get('disable-mtu-discovery') === 'true';
	}

	// 添加指纹
	if (params.get('fingerprint')) {
		config.fingerprint = params.get('fingerprint');
	}

	// 添加快速打开
	if (params.get('fast-open')) {
		config['fast-open'] = params.get('fast-open') === 'true';
	}

	return config;
}

// 解析Hysteria2
function parseHysteria2(url) {
	const parsed = new URL(url);
	const params = parsed.searchParams;

	const config = {
		name: decodeURIComponent(parsed.hash.substring(1)) || 'Hysteria2',
		type: 'hysteria2',
		server: formatServerAddress(parsed.hostname),
		port: parseInt(parsed.port),
		password: parsed.username
	};

	// 添加端口范围支持
	if (params.get('ports')) {
		config.ports = params.get('ports');
	}

	// 添加跳跃间隔
	if (params.get('hop-interval')) {
		config['hop-interval'] = parseInt(params.get('hop-interval'));
	}

	// 添加上传下载速度
	if (params.get('up')) {
		config.up = params.get('up');
	}
	if (params.get('down')) {
		config.down = params.get('down');
	}

	// 添加 SNI
	if (params.get('sni')) {
		config.sni = params.get('sni');
	}

	// 添加 skip-cert-verify
	if (params.get('insecure') === '1' || params.get('skip-cert-verify') === 'true') {
		config['skip-cert-verify'] = true;
	}

	// 添加指纹
	if (params.get('fingerprint')) {
		config.fingerprint = params.get('fingerprint');
	}

	// 添加 ALPN
	if (params.get('alpn')) {
		config.alpn = decodeURIComponent(params.get('alpn')).split(',');
	}

	// 添加 CA 配置
	if (params.get('ca')) {
		config.ca = params.get('ca');
	}
	if (params.get('ca-str')) {
		config['ca-str'] = params.get('ca-str');
	}

	// 添加混淆
	if (params.get('obfs')) {
		config.obfs = params.get('obfs');
		if (params.get('obfs-password')) {
			config['obfs-password'] = params.get('obfs-password');
		}
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

	// 添加 QUIC 特殊配置
	if (params.get('initial-stream-receive-window')) {
		config['initial-stream-receive-window'] = parseInt(params.get('initial-stream-receive-window'));
	}
	if (params.get('max-stream-receive-window')) {
		config['max-stream-receive-window'] = parseInt(params.get('max-stream-receive-window'));
	}
	if (params.get('initial-connection-receive-window')) {
		config['initial-connection-receive-window'] = parseInt(params.get('initial-connection-receive-window'));
	}
	if (params.get('max-connection-receive-window')) {
		config['max-connection-receive-window'] = parseInt(params.get('max-connection-receive-window'));
	}

	// 添加端口跳跃
	if (params.get('mport')) {
		config['ports'] = params.get('mport');
	}

	return config;
}

export { parseHysteria, parseHysteria2 };
