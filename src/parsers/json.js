// 标准化JSON格式节点数据
function normalizeJSONProxy(proxyData, name, server, port) {
	const type = proxyData.type.toLowerCase();

	// 基础配置
	const config = {
		name: name,
		type: type,
		server: server,
		port: port
	};

	// 根据协议类型进行特定字段处理
	switch (type) {
		case 'vmess':
			return normalizeVmessJSON(proxyData, config);
		case 'vless':
			return normalizeVlessJSON(proxyData, config);
		case 'ss':
			return normalizeShadowsocksJSON(proxyData, config);
		case 'ssr':
			return normalizeShadowsocksRJSON(proxyData, config);
		case 'trojan':
			return normalizeTrojanJSON(proxyData, config);
		case 'hysteria':
			return normalizeHysteriaJSON(proxyData, config);
		case 'hysteria2':
			return normalizeHysteria2JSON(proxyData, config);
		case 'tuic':
			return normalizeTuicJSON(proxyData, config);
		case 'socks5':
			return normalizeSocks5JSON(proxyData, config);
		case 'http':
			return normalizeHttpJSON(proxyData, config);
		case 'snell':
			return normalizeSnellJSON(proxyData, config);
		case 'wireguard':
			return normalizeWireGuardJSON(proxyData, config);
		case 'mieru':
			return normalizeMieruJSON(proxyData, config);
		case 'anytls':
			return normalizeAnyTLSJSON(proxyData, config);
		case 'ssh':
			return normalizeSSHJSON(proxyData, config);
		default:
			// 对于未知协议，保留所有字段但覆盖基础字段
			return { ...proxyData, ...config };
	}
}

// VMess JSON标准化
function normalizeVmessJSON(data, config) {
	// 必需字段
	if (data.uuid) config.uuid = data.uuid;
	if (data.alterId !== undefined) config.alterId = parseInt(data.alterId) || 0;

	// 可选字段
	if (data.cipher) config.cipher = data.cipher;
	else config.cipher = 'auto';

	if (data.network) config.network = data.network;
	if (data.tls !== undefined) config.tls = data.tls === true || data.tls === 'true';
	if (data.udp !== undefined) config.udp = data.udp === true || data.udp === 'true';
	if (data['ip-version']) config['ip-version'] = data['ip-version'];
	if (data.fingerprint) config.fingerprint = data.fingerprint;
	if (data['client-fingerprint']) config['client-fingerprint'] = data['client-fingerprint'];
	if (data['skip-cert-verify'] !== undefined) config['skip-cert-verify'] = data['skip-cert-verify'] === true || data['skip-cert-verify'] === 'true';
	if (data.servername) config.servername = data.servername;

	// VMess 特有字段
	if (data['packet-encoding']) config['packet-encoding'] = data['packet-encoding'];
	if (data['global-padding'] !== undefined) config['global-padding'] = data['global-padding'] === true || data['global-padding'] === 'true';
	if (data['authenticated-length'] !== undefined) config['authenticated-length'] = data['authenticated-length'] === true || data['authenticated-length'] === 'true';
	if (data.alpn) config.alpn = Array.isArray(data.alpn) ? data.alpn : [data.alpn];

	// 传输层配置
	if (data['ws-opts']) config['ws-opts'] = data['ws-opts'];
	if (data['h2-opts']) config['h2-opts'] = data['h2-opts'];
	if (data['http-opts']) config['http-opts'] = data['http-opts'];
	if (data['grpc-opts']) config['grpc-opts'] = data['grpc-opts'];
	if (data['ech-opts']) config['ech-opts'] = data['ech-opts'];
	if (data['reality-opts']) config['reality-opts'] = data['reality-opts'];

	// SMUX配置
	if (data.smux) config.smux = data.smux;

	// Brutal配置
	if (data['brutal-opts']) config['brutal-opts'] = data['brutal-opts'];

	return config;
}

// VLess JSON标准化
function normalizeVlessJSON(data, config) {
	// 必需字段
	if (data.uuid) config.uuid = data.uuid;

	// 可选字段
	if (data.network) config.network = data.network;
	if (data.tls !== undefined) config.tls = data.tls === true || data.tls === 'true';
	if (data.udp !== undefined) config.udp = data.udp === true || data.udp === 'true';
	if (data['ip-version']) config['ip-version'] = data['ip-version'];

	// 处理flow字段，忽略null或空值
	if (data.flow && data.flow !== null && data.flow !== '') {
		config.flow = data.flow;
	}

	if (data.fingerprint) config.fingerprint = data.fingerprint;
	if (data['client-fingerprint']) config['client-fingerprint'] = data['client-fingerprint'];
	if (data['skip-cert-verify'] !== undefined) config['skip-cert-verify'] = data['skip-cert-verify'] === true || data['skip-cert-verify'] === 'true';
	if (data.servername) config.servername = data.servername;
	if (data.alpn) config.alpn = Array.isArray(data.alpn) ? data.alpn : [data.alpn];

	// 传输层配置
	if (data['ws-opts']) config['ws-opts'] = data['ws-opts'];
	if (data['h2-opts']) config['h2-opts'] = data['h2-opts'];
	if (data['grpc-opts']) config['grpc-opts'] = data['grpc-opts'];
	if (data['tcp-opts']) config['tcp-opts'] = data['tcp-opts'];
	if (data['ech-opts']) config['ech-opts'] = data['ech-opts'];
	if (data['reality-opts']) {
		config['reality-opts'] = data['reality-opts'];
		// 确保support-x25519mlkem768字段被正确处理
		if (data['reality-opts']['support-x25519mlkem768'] !== undefined) {
			config['reality-opts']['support-x25519mlkem768'] = data['reality-opts']['support-x25519mlkem768'] === true || data['reality-opts']['support-x25519mlkem768'] === 'true';
		}
	}

	// SMUX配置
	if (data.smux) config.smux = data.smux;

	// Brutal配置
	if (data['brutal-opts']) config['brutal-opts'] = data['brutal-opts'];

	return config;
}

// Shadowsocks JSON标准化
function normalizeShadowsocksJSON(data, config) {
	// 必需字段
	if (data.cipher) config.cipher = data.cipher;
	if (data.password) config.password = data.password;

	// 可选字段
	if (data.udp !== undefined) config.udp = data.udp === true || data.udp === 'true';
	if (data['udp-over-tcp'] !== undefined) config['udp-over-tcp'] = data['udp-over-tcp'] === true || data['udp-over-tcp'] === 'true';
	if (data['udp-over-tcp-version']) config['udp-over-tcp-version'] = parseInt(data['udp-over-tcp-version']);
	if (data['ip-version']) config['ip-version'] = data['ip-version'];
	if (data['client-fingerprint']) config['client-fingerprint'] = data['client-fingerprint'];

	// SMUX 配置
	if (data.smux) config.smux = data.smux;

	// 插件配置
	if (data.plugin) {
		config.plugin = data.plugin;
		if (data['plugin-opts']) config['plugin-opts'] = data['plugin-opts'];
	}

	return config;
}

// ShadowsocksR JSON标准化
function normalizeShadowsocksRJSON(data, config) {
	// 必需字段
	if (data.cipher) config.cipher = data.cipher;
	if (data.password) config.password = data.password;
	if (data.protocol) config.protocol = data.protocol;
	if (data.obfs) config.obfs = data.obfs;

	// 可选字段
	if (data['obfs-param']) config['obfs-param'] = data['obfs-param'];
	if (data['protocol-param']) config['protocol-param'] = data['protocol-param'];
	if (data.udp !== undefined) config.udp = data.udp === true || data.udp === 'true';

	return config;
}

// Trojan JSON标准化
function normalizeTrojanJSON(data, config) {
	// 必需字段
	if (data.password) config.password = data.password;

	// 可选字段
	if (data.udp !== undefined) config.udp = data.udp === true || data.udp === 'true';
	else config.udp = true; // Trojan默认开启UDP

	if (data['client-fingerprint']) config['client-fingerprint'] = data['client-fingerprint'];
	if (data.fingerprint) config.fingerprint = data.fingerprint;
	if (data.sni) config.sni = data.sni;
	if (data.alpn) config.alpn = Array.isArray(data.alpn) ? data.alpn : [data.alpn];
	if (data['skip-cert-verify'] !== undefined) config['skip-cert-verify'] = data['skip-cert-verify'] === true || data['skip-cert-verify'] === 'true';
	if (data.flow) config.flow = data.flow;
	if (data['flow-show'] !== undefined) config['flow-show'] = data['flow-show'] === true || data['flow-show'] === 'true';
	if (data.network) config.network = data.network;

	// 传输层配置
	if (data['ws-opts']) config['ws-opts'] = data['ws-opts'];
	if (data['grpc-opts']) config['grpc-opts'] = data['grpc-opts'];
	if (data['ss-opts']) config['ss-opts'] = data['ss-opts'];
	if (data['ech-opts']) config['ech-opts'] = data['ech-opts'];
	if (data['reality-opts']) config['reality-opts'] = data['reality-opts'];

	// SMUX配置
	if (data.smux) config.smux = data.smux;

	return config;
}

// Hysteria JSON标准化
function normalizeHysteriaJSON(data, config) {
	// 可选字段
	if (data['auth-str']) config['auth-str'] = data['auth-str'];
	if (data.ports) config.ports = data.ports;
	if (data.obfs) config.obfs = data.obfs;
	if (data.alpn) config.alpn = Array.isArray(data.alpn) ? data.alpn : [data.alpn];
	if (data.protocol) config.protocol = data.protocol;
	if (data.up) config.up = data.up;
	if (data.down) config.down = data.down;
	if (data.sni) config.sni = data.sni;
	if (data['skip-cert-verify'] !== undefined) config['skip-cert-verify'] = data['skip-cert-verify'] === true || data['skip-cert-verify'] === 'true';
	if (data['recv-window-conn']) config['recv-window-conn'] = parseInt(data['recv-window-conn']);
	if (data['recv-window']) config['recv-window'] = parseInt(data['recv-window']);
	if (data.ca) config.ca = data.ca;
	if (data['ca-str']) config['ca-str'] = data['ca-str'];
	if (data['disable-mtu-discovery'] !== undefined) config['disable-mtu-discovery'] = data['disable-mtu-discovery'] === true || data['disable-mtu-discovery'] === 'true';
	if (data.fingerprint) config.fingerprint = data.fingerprint;
	if (data['fast-open'] !== undefined) config['fast-open'] = data['fast-open'] === true || data['fast-open'] === 'true';
	if (data['ech-opts']) config['ech-opts'] = data['ech-opts'];

	return config;
}

// Hysteria2 JSON标准化
function normalizeHysteria2JSON(data, config) {
	// 必需字段 - 支持 password 和 auth 字段
	if (data.password) config.password = data.password;
	else if (data.auth) config.password = data.auth; // 兼容 auth 字段

	// 可选字段
	if (data.udp !== undefined) config.udp = data.udp === true || data.udp === 'true';
	if (data.ports) config.ports = data.ports;

	// 处理hop-interval字段的多种写法
	if (data['hop-interval']) config['hop-interval'] = parseInt(data['hop-interval']);
	else if (data.HopInterval) config['hop-interval'] = parseInt(data.HopInterval);
	else if (data.hopInterval) config['hop-interval'] = parseInt(data.hopInterval);

	if (data.up) config.up = data.up;
	if (data.down) config.down = data.down;
	if (data.obfs) config.obfs = data.obfs;
	if (data['obfs-password']) config['obfs-password'] = data['obfs-password'];
	if (data.sni) config.sni = data.sni;
	if (data['skip-cert-verify'] !== undefined) config['skip-cert-verify'] = data['skip-cert-verify'] === true || data['skip-cert-verify'] === 'true';
	if (data.fingerprint) config.fingerprint = data.fingerprint;
	if (data.alpn) config.alpn = Array.isArray(data.alpn) ? data.alpn : [data.alpn];
	if (data.ca) config.ca = data.ca;
	if (data['ca-str']) config['ca-str'] = data['ca-str'];
	if (data['ech-opts']) config['ech-opts'] = data['ech-opts'];

	// QUIC 特殊配置
	if (data['initial-stream-receive-window']) config['initial-stream-receive-window'] = parseInt(data['initial-stream-receive-window']);
	if (data['max-stream-receive-window']) config['max-stream-receive-window'] = parseInt(data['max-stream-receive-window']);
	if (data['initial-connection-receive-window']) config['initial-connection-receive-window'] = parseInt(data['initial-connection-receive-window']);
	if (data['max-connection-receive-window']) config['max-connection-receive-window'] = parseInt(data['max-connection-receive-window']);

	return config;
}

// TUIC JSON标准化
function normalizeTuicJSON(data, config) {
	// TUIC v4 使用 token，v5 使用 uuid + password
	if (data.token) {
		config.token = data.token;
	} else {
		if (data.uuid) config.uuid = data.uuid;
		if (data.password) config.password = data.password;
	}

	// 可选字段
	if (data.ip) config.ip = data.ip;
	if (data['heartbeat-interval']) config['heartbeat-interval'] = parseInt(data['heartbeat-interval']);
	if (data.alpn) config.alpn = Array.isArray(data.alpn) ? data.alpn : [data.alpn];
	else config.alpn = ['h3']; // TUIC 默认使用 h3

	if (data['disable-sni'] !== undefined) config['disable-sni'] = data['disable-sni'] === true || data['disable-sni'] === 'true';
	if (data['reduce-rtt'] !== undefined) config['reduce-rtt'] = data['reduce-rtt'] === true || data['reduce-rtt'] === 'true';
	if (data['request-timeout']) config['request-timeout'] = parseInt(data['request-timeout']);
	if (data['udp-relay-mode']) config['udp-relay-mode'] = data['udp-relay-mode'];
	else config['udp-relay-mode'] = 'native';

	if (data['congestion-controller']) config['congestion-controller'] = data['congestion-controller'];
	else config['congestion-controller'] = 'bbr';

	if (data.cwnd) config.cwnd = parseInt(data.cwnd);
	if (data['max-udp-relay-packet-size']) config['max-udp-relay-packet-size'] = parseInt(data['max-udp-relay-packet-size']);
	if (data['fast-open'] !== undefined) config['fast-open'] = data['fast-open'] === true || data['fast-open'] === 'true';
	if (data['skip-cert-verify'] !== undefined) config['skip-cert-verify'] = data['skip-cert-verify'] === true || data['skip-cert-verify'] === 'true';
	if (data['max-open-streams']) config['max-open-streams'] = parseInt(data['max-open-streams']);
	if (data.sni) config.sni = data.sni;
	if (data['ech-opts']) config['ech-opts'] = data['ech-opts'];
	if (data['udp-over-stream'] !== undefined) config['udp-over-stream'] = data['udp-over-stream'] === true || data['udp-over-stream'] === 'true';
	if (data['udp-over-stream-version']) config['udp-over-stream-version'] = parseInt(data['udp-over-stream-version']);

	return config;
}

// SOCKS5 JSON标准化
function normalizeSocks5JSON(data, config) {
	// 可选字段
	if (data.username) config.username = data.username;
	if (data.password) config.password = data.password;
	if (data.tls !== undefined) config.tls = data.tls === true || data.tls === 'true';
	if (data.fingerprint) config.fingerprint = data.fingerprint;
	if (data['skip-cert-verify'] !== undefined) config['skip-cert-verify'] = data['skip-cert-verify'] === true || data['skip-cert-verify'] === 'true';
	if (data.udp !== undefined) config.udp = data.udp === true || data.udp === 'true';
	if (data['ip-version']) config['ip-version'] = data['ip-version'];

	return config;
}

// HTTP JSON标准化
function normalizeHttpJSON(data, config) {
	// 可选字段
	if (data.username) config.username = data.username;
	if (data.password) config.password = data.password;
	if (data.tls !== undefined) config.tls = data.tls === true || data.tls === 'true';
	if (data['skip-cert-verify'] !== undefined) config['skip-cert-verify'] = data['skip-cert-verify'] === true || data['skip-cert-verify'] === 'true';
	if (data.sni) config.sni = data.sni;
	if (data.fingerprint) config.fingerprint = data.fingerprint;
	if (data['ip-version']) config['ip-version'] = data['ip-version'];

	return config;
}

// Snell JSON标准化
function normalizeSnellJSON(data, config) {
	// 必需字段
	if (data.psk) config.psk = data.psk;
	if (data.version !== undefined) config.version = parseInt(data.version) || 4;

	// 可选字段
	if (data.udp !== undefined) config.udp = data.udp === true || data.udp === 'true';
	if (data['ip-version']) config['ip-version'] = data['ip-version'];

	// 混淆配置
	if (data['obfs-opts']) {
		config['obfs-opts'] = data['obfs-opts'];
	}

	return config;
}

// WireGuard JSON标准化
function normalizeWireGuardJSON(data, config) {
	// 必需字段
	if (data['private-key']) config['private-key'] = data['private-key'];
	if (data['public-key']) config['public-key'] = data['public-key'];
	if (data.ip) config.ip = data.ip;

	// 可选字段
	if (data.ipv6) config.ipv6 = data.ipv6;
	if (data['pre-shared-key']) config['pre-shared-key'] = data['pre-shared-key'];
	if (data.reserved) config.reserved = data.reserved;
	if (data['dialer-proxy']) config['dialer-proxy'] = data['dialer-proxy'];
	if (data['remote-dns-resolve'] !== undefined) config['remote-dns-resolve'] = data['remote-dns-resolve'] === true || data['remote-dns-resolve'] === 'true';
	if (data.dns) config.dns = Array.isArray(data.dns) ? data.dns : [data.dns];
	if (data['refresh-server-ip-interval']) config['refresh-server-ip-interval'] = parseInt(data['refresh-server-ip-interval']);
	if (data.udp !== undefined) config.udp = data.udp === true || data.udp === 'true';
	if (data.peers) config.peers = data.peers;
	if (data['amnezia-wg-option']) config['amnezia-wg-option'] = data['amnezia-wg-option'];

	return config;
}

// Mieru JSON标准化
function normalizeMieruJSON(data, config) {
	// 必需字段
	if (data.username) config.username = data.username;
	if (data.password) config.password = data.password;

	// 传输协议 (只支持TCP)
	config.transport = 'TCP';

	// 端口范围
	if (data['port-range']) {
		config['port-range'] = data['port-range'];
		delete config.port; // 移除单独的port字段
	}

	// 可选字段
	if (data.udp !== undefined) config.udp = data.udp === true || data.udp === 'true';
	if (data.multiplexing) {
		const validValues = ['MULTIPLEXING_OFF', 'MULTIPLEXING_LOW', 'MULTIPLEXING_MIDDLE', 'MULTIPLEXING_HIGH'];
		if (validValues.includes(data.multiplexing.toUpperCase())) {
			config.multiplexing = data.multiplexing.toUpperCase();
		}
	}

	return config;
}

// AnyTLS JSON标准化
function normalizeAnyTLSJSON(data, config) {
	// 必需字段
	if (data.password) config.password = data.password;

	// 可选字段
	if (data['client-fingerprint']) config['client-fingerprint'] = data['client-fingerprint'];
	if (data.udp !== undefined) config.udp = data.udp === true || data.udp === 'true';
	if (data['idle-session-check-interval']) config['idle-session-check-interval'] = parseInt(data['idle-session-check-interval']);
	if (data['idle-session-timeout']) config['idle-session-timeout'] = parseInt(data['idle-session-timeout']);
	if (data['min-idle-session']) config['min-idle-session'] = parseInt(data['min-idle-session']);
	if (data.sni) config.sni = data.sni;
	if (data.alpn) config.alpn = Array.isArray(data.alpn) ? data.alpn : [data.alpn];
	if (data['skip-cert-verify'] !== undefined) config['skip-cert-verify'] = data['skip-cert-verify'] === true || data['skip-cert-verify'] === 'true';

	return config;
}

// SSH JSON标准化
function normalizeSSHJSON(data, config) {
	// 必需字段
	if (data.username) config.username = data.username;

	// 可选字段
	if (data.password) config.password = data.password;
	if (data.privateKey) config.privateKey = data.privateKey;

	return config;
}

export { normalizeJSONProxy };
