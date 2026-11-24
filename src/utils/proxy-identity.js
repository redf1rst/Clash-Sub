

// 辅助函数：深度比较两个节点是否完全相同
function areProxiesIdentical(proxy1, proxy2) {
	// 排除name字段的比较，因为name是自动生成的
	const p1 = { ...proxy1 };
	const p2 = { ...proxy2 };
	delete p1.name;
	delete p2.name;

	// 获取所有键
	const keys1 = Object.keys(p1).sort();
	const keys2 = Object.keys(p2).sort();

	// 如果键的数量不同，则不相同
	if (keys1.length !== keys2.length) {
		return false;
	}

	// 检查是否有相同的键
	if (keys1.some((key, index) => key !== keys2[index])) {
		return false;
	}

	// 深度比较每个字段的值
	for (const key of keys1) {
		const val1 = p1[key];
		const val2 = p2[key];

		// 处理不同类型的值
		if (val1 === val2) {
			continue;
		}

		// 如果值类型不同
		if (typeof val1 !== typeof val2) {
			return false;
		}

		// 处理对象和数组
		if (typeof val1 === 'object' && val1 !== null && val2 !== null) {
			// 简单的JSON字符串比较
			if (JSON.stringify(val1) !== JSON.stringify(val2)) {
				return false;
			}
		} else {
			return false;
		}
	}

	return true;
}

export { areProxiesIdentical };
