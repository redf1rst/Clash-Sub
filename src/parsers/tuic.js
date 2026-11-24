import { formatServerAddress } from '../utils/address.js';

// 解析TUIC
function parseTuic(url) {
	const parsed = new URL(url);
	const params = parsed.searchParams;

	// 解析用户名部分 (UUID:密码)
	const userInfo = decodeURIComponent(parsed.username);
	let uuid, password, token;

	if (userInfo.includes(':')) {
		const colonIndex = userInfo.indexOf(':');
		uuid = userInfo.substring(0, colonIndex);
		password = userInfo.substring(colonIndex + 1);
	} else {
		// 如果没有冒号，整个作为UUID，密码从参数获取
		uuid = userInfo;
		password = params.get('password') || '';
	}

	// 检查是否是 TUIC v4 (使用 token)
	if (params.get('token')) {
		token = params.get('token');
	}

	const config = {
		name: decodeURIComponent(parsed.hash.substring(1)) || 'TUIC',
		type: 'tuic',
		server: formatServerAddress(parsed.hostname),
		port: parseInt(parsed.port)
	};

	// TUIC v4 使用 token，v5 使用 uuid + password
	if (token) {
		config.token = token;
	} else {
		config.uuid = uuid;
		config.password = password;
	}

	// 添加 IP 覆盖
	if (params.get('ip')) {
		config.ip = params.get('ip');
	}

	// 添加心跳间隔
	if (params.get('heartbeat-interval')) {
		config['heartbeat-interval'] = parseInt(params.get('heartbeat-interval'));
	}

	// 添加 ALPN
	if (params.get('alpn')) {
		config.alpn = params.get('alpn').split(',');
	}

	// 添加禁用 SNI
	if (params.get('disable-sni')) {
		config['disable-sni'] = params.get('disable-sni') === 'true';
	}

	// 添加减少 RTT
	if (params.get('reduce-rtt')) {
		config['reduce-rtt'] = params.get('reduce-rtt') === 'true';
	}

	// 添加请求超时
	if (params.get('request-timeout')) {
		config['request-timeout'] = parseInt(params.get('request-timeout'));
	}

	// 添加 UDP 中继模式
	if (params.get('udp-relay-mode')) {
		config['udp-relay-mode'] = params.get('udp-relay-mode');
	}

	// 添加拥塞控制算法
	if (params.get('congestion-controller')) {
		config['congestion-controller'] = params.get('congestion-controller');
	}

	// 添加拥塞窗口
	if (params.get('cwnd')) {
		config.cwnd = parseInt(params.get('cwnd'));
	}

	// 添加最大 UDP 中继包大小
	if (params.get('max-udp-relay-packet-size')) {
		config['max-udp-relay-packet-size'] = parseInt(params.get('max-udp-relay-packet-size'));
	}

	// 添加快速打开
	if (params.get('fast-open')) {
		config['fast-open'] = params.get('fast-open') === 'true';
	}

	// 添加跳过证书验证
	if (params.get('skip-cert-verify')) {
		config['skip-cert-verify'] = params.get('skip-cert-verify') === 'true';
	}

	// 添加最大打开流数
	if (params.get('max-open-streams')) {
		config['max-open-streams'] = parseInt(params.get('max-open-streams'));
	}

	// 添加 SNI
	if (params.get('sni')) {
		config.sni = params.get('sni');
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

	// 添加 UDP over Stream (私有扩展)
	if (params.get('udp-over-stream')) {
		config['udp-over-stream'] = params.get('udp-over-stream') === 'true';
	}
	if (params.get('udp-over-stream-version')) {
		config['udp-over-stream-version'] = parseInt(params.get('udp-over-stream-version'));
	}

	// 添加拥塞控制算法
	if (params.get('congestion_control')) {
		config['congestion-controller'] = params.get('congestion_control');
	} else {
		config['congestion-controller'] = 'bbr';
	}

	// 添加 UDP 中继模式
	if (params.get('udp_relay_mode')) {
		config['udp-relay-mode'] = params.get('udp_relay_mode');
	} else {
		config['udp-relay-mode'] = 'native';
	}

	// 添加 ALPN
	if (params.get('alpn')) {
		config.alpn = decodeURIComponent(params.get('alpn')).split(',');
	} else {
		// TUIC 默认使用 h3
		config.alpn = ['h3'];
	}

	// 添加 skip-cert-verify
	if (params.get('insecure') === '1' || params.get('allowInsecure') === '1') {
		config['skip-cert-verify'] = true;
	}

	// 添加禁用 SNI
	if (params.get('disable_sni') === '1') {
		config['disable-sni'] = true;
	}

	// 添加 reduce-rtt
	if (params.get('reduce_rtt') === '1') {
		config['reduce-rtt'] = true;
	}

	return config;
}

export { parseTuic };
