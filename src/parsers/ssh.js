import { formatServerAddress } from '../utils/address.js';

// 解析SSH
function parseSSH(url) {
	const parsed = new URL(url);
	const params = parsed.searchParams;

	const config = {
		name: decodeURIComponent(parsed.hash.substring(1)) || 'SSH',
		type: 'ssh',
		server: formatServerAddress(parsed.hostname),
		port: parseInt(parsed.port) || 22 // SSH默认端口22
	};

	// 用户名
	if (parsed.username) {
		config.username = decodeURIComponent(parsed.username);
	} else {
		config.username = 'root'; // 默认用户名
	}

	// 密码
	if (parsed.password) {
		config.password = decodeURIComponent(parsed.password);
	}

	// 私钥路径
	if (params.get('privateKey')) {
		config.privateKey = params.get('privateKey');
	}

	return config;
}

export { parseSSH };
