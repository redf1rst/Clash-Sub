

// 检测是否为IPv6地址
function isIPv6Address(address) {
	// 移除可能的方括号（如 [2001:db8::1]）
	const cleanAddress = address.replace(/^\[|\]$/g, '');

	// IPv6地址的基本特征：包含冒号且符合IPv6格式
	if (!cleanAddress.includes(':')) {
		return false;
	}

	// 简单的IPv6格式验证
	// IPv6地址由8组4位十六进制数字组成，用冒号分隔
	// 支持压缩格式（::）和混合格式
	const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:)*::([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$|^::([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:)+::$|^::$/;

	return ipv6Regex.test(cleanAddress);
}

// 格式化server字段，确保IPv6地址格式正确
function formatServerAddress(server) {
	if (!server) return server;

	// 移除可能已存在的方括号
	const cleanServer = server.replace(/^\[|\]$/g, '');

	// 检查是否为IPv6地址
	if (isIPv6Address(cleanServer)) {
		// IPv6地址需要用方括号包围（当有端口时）
		// 但在Clash配置中，server字段只包含地址，不包含端口
		// 所以这里只返回纯IPv6地址，不加方括号
		return cleanServer;
	}

	// IPv4地址或域名直接返回
	return cleanServer;
}

export { formatServerAddress, isIPv6Address };
