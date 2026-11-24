import { parseProxyUrl } from '../parsers/proxy-url.js';
import { decodeSubscriptionContent } from '../subscription-parser.js';
import { fetchWithUserAgentRotation, readBoundedResponseText, safeSubscriptionLogRef } from './fetch.js';

// 智能判断是否应该拒绝订阅
async function shouldRejectSubscription(subUrl, subInfo) {
	console.log(`[DEBUG] 检查订阅: ${safeSubscriptionLogRef(subUrl)}, success: ${subInfo.success}, statusCode: ${subInfo.statusCode}`);

	// 1. 网络连接失败，直接拒绝
	if (!subInfo.success && (subInfo.statusCode === 0 || subInfo.statusCode === 408)) {
		console.log(`[REJECT] 网络连接失败: ${safeSubscriptionLogRef(subUrl)}, statusCode: ${subInfo.statusCode}`);
		return {
			reject: true,
			reason: subInfo.statusCode === 408 ? '请求超时' : '网络连接失败'
		};
	}

	// 2. 对于HTTP错误状态码，直接拒绝
	if (!subInfo.success && subInfo.statusCode > 0) {
		console.log(`[REJECT] 检测到HTTP错误状态码: ${subInfo.statusCode}，直接拒绝订阅: ${safeSubscriptionLogRef(subUrl)}`);
		const errorMessage = getErrorMessage(subInfo.statusCode, true);
		return {
			reject: true,
			reason: errorMessage
		};
	}

	// 3. 对于成功的请求，检查内容有效性
	if (subInfo.success) {
		console.log(`检查订阅内容有效性: ${safeSubscriptionLogRef(subUrl)}`);

		try {
			let content = subInfo.content;
			if (!content) {
				const result = await fetchWithUserAgentRotation(subUrl, 8000);
				if (!result.success) {
					return { reject: true, reason: `无法获取订阅内容 (HTTP ${result.response?.status || 'Unknown'})` };
				}
				content = await readBoundedResponseText(result.response);
			}

			if (!content.trim()) return { reject: true, reason: '订阅内容为空' };
			const decoded = decodeSubscriptionContent(content, { parseProxyUrl });
			if (decoded.proxies.length === 0) {
				return { reject: true, reason: decoded.diagnostics[0] || '未识别到有效代理信息' };
			}
			console.log(`订阅内容验证通过: ${safeSubscriptionLogRef(subUrl)}`);

		} catch (error) {
			console.log(`获取订阅内容失败: ${safeSubscriptionLogRef(subUrl)}, 错误: ${error.message}`);
			return {
				reject: true,
				reason: '无法获取订阅内容进行验证: ' + error.message
			};
		}
	}

	// 4. 其他情况，接受订阅
	return { reject: false };
}

// 获取错误信息
function getErrorMessage(statusCode, success) {
	if (!success) {
		return '网络连接失败或超时';
	}

	switch (statusCode) {
		case 400:
			return '请求格式错误 (400)';
		case 401:
			return '未授权访问 (401)';
		case 403:
			return '访问被禁止 (403)';
		case 404:
			return '订阅链接不存在 (404)';
		case 405:
			return '请求方法不允许 (405)';
		case 408:
			return '请求超时 (408)';
		case 429:
			return '请求过于频繁 (429)';
		case 500:
			return '服务器内部错误 (500)';
		case 502:
			return '网关错误 (502)';
		case 503:
			return '服务不可用 (503)';
		case 504:
			return '网关超时 (504)';
		case 520:
			return 'Cloudflare 未知错误 (520)';
		case 521:
			return '服务器拒绝连接 (521)';
		case 522:
			return '连接超时 (522)';
		case 523:
			return '源服务器不可达 (523)';
		case 524:
			return '源服务器超时 (524)';
		default:
			return `HTTP错误 (${statusCode})`;
	}
}

// 获取订阅信息（名称、流量、到期时间）
async function getSubscriptionInfo(subUrl, { includeContent = false } = {}) {
	const subInfo = {
		name: '',
		download: 0,
		total: 0,
		expire: null,
		success: true,
		statusCode: 0
	};

	try {
		// 使用轮询方式尝试不同的 User-Agent，设置较短的超时时间用于活跃检测
		const result = await fetchWithUserAgentRotation(subUrl, 8000);
		const response = result.response;

		subInfo.statusCode = response.status;
		subInfo.success = response.ok; // 200-299 范围内的状态码被认为是成功的
		if (includeContent && response.ok) subInfo.content = await readBoundedResponseText(response);

		console.log(`订阅 ${safeSubscriptionLogRef(subUrl)} 使用 ${result.userAgent} 请求，状态码: ${response.status}`);

		// 获取响应头（大小写不敏感）
		// 尝试多种可能的大小写组合
		let contentDisposition = response.headers.get('content-disposition') ||
			response.headers.get('Content-Disposition') ||
			response.headers.get('CONTENT-DISPOSITION');

		let userInfo = response.headers.get('subscription-userinfo') ||
			response.headers.get('Subscription-Userinfo') ||
			response.headers.get('SUBSCRIPTION-USERINFO') ||
			response.headers.get('Subscription-UserInfo') ||
			response.headers.get('subscription-UserInfo');

		// 如果还是没有找到，遍历所有头部
		if (!contentDisposition || !userInfo) {
			for (const [key, value] of response.headers.entries()) {
				const lowerKey = key.toLowerCase();
				if (!contentDisposition && lowerKey === 'content-disposition') {
					contentDisposition = value;
				}
				if (!userInfo && lowerKey === 'subscription-userinfo') {
					userInfo = value;
				}
			}
		}



		// 解析响应头
		return parseHeaders(contentDisposition, userInfo, subInfo);

	} catch (error) {
		// 网络错误、超时等情况
		console.log(`订阅 ${safeSubscriptionLogRef(subUrl)} 请求失败:`, error.message);
		subInfo.success = false;
		// 如果是超时错误，设置特殊状态码
		if (error.name === 'TimeoutError' || error.name === 'AbortError' || error.message.includes('timeout')) {
			subInfo.statusCode = 408; // Request Timeout
		} else if (error.message.includes('fetch failed') || error.message.includes('network')) {
			subInfo.statusCode = 0; // Network error
		} else {
			subInfo.statusCode = 0; // 其他网络错误
		}
	}

	return subInfo;
}

// 解析响应头的辅助函数
function parseHeaders(contentDisposition, userInfo, subInfo) {
	// 解析 Content-Disposition 获取订阅名称
	if (contentDisposition) {
		// 先处理 filename*=UTF-8'' 格式（RFC 5987）
		// 支持多种格式:
		// filename*=UTF-8''%E9%9D%92%E4%BA%91%E6%A2%AF
		// filename*=utf-8''Nova%E5%8A%A0%E9%80%9F
		// filename*=UTF-8'en'Nova%E5%8A%A0%E9%80%9F (带语言标签)
		const filenameStarMatch = contentDisposition.match(/filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/i);
		if (filenameStarMatch) {
			try {
				// URL 解码，filenameStarMatch[1] 是实际的文件名值
				subInfo.name = decodeURIComponent(filenameStarMatch[1]);
			} catch (e) {
				// 解码失败，尝试作为原始值
				subInfo.name = filenameStarMatch[1];
			}
		}

		// 如果没有获取到名称，尝试标准 filename= 格式
		if (!subInfo.name) {
			// 匹配多种可能的格式:
			// filename="name"
			// filename='name'
			// filename=name
			const filenameMatch = contentDisposition.match(/filename\s*=\s*([^;]+)/i);
			if (filenameMatch) {
				let rawName = filenameMatch[1].trim();

				// 移除可能的引号
				if ((rawName.startsWith('"') && rawName.endsWith('"')) ||
					(rawName.startsWith("'") && rawName.endsWith("'"))) {
					rawName = rawName.slice(1, -1);
				}

				if (rawName) {
					// 检查是否需要 URL 解码
					if (rawName.includes('%')) {
						try {
							subInfo.name = decodeURIComponent(rawName);
						} catch (e) {
							// 解码失败则使用原始值
							subInfo.name = rawName;
						}
					} else {
						subInfo.name = rawName;
					}
				}
			}
		}

		// 额外处理：有些服务器可能使用非标准格式
		// 例如: attachment; filename*=sub_name 或 attachment;filename=sub_name（无空格）
		if (!subInfo.name) {
			// 尝试更宽松的匹配
			const looseMatch = contentDisposition.match(/filename\*?\s*=\s*([^\s;]+)/i);
			if (looseMatch) {
				let name = looseMatch[1];
				// 移除可能的引号
				name = name.replace(/^["']|["']$/g, '');
				if (name.includes('%')) {
					try {
						subInfo.name = decodeURIComponent(name);
					} catch (e) {
						subInfo.name = name;
					}
				} else {
					subInfo.name = name;
				}
			}
		}
	}

	// 解析 Subscription-Userinfo 获取流量信息
	if (userInfo) {
		// 解析格式: upload=123; download=456; total=789; expire=1234567890
		// 支持大小写不敏感的键名
		const parts = userInfo.split(';').map(part => part.trim());
		for (const part of parts) {
			const [key, value] = part.split('=').map(s => s.trim());
			const lowerKey = key.toLowerCase();
			switch (lowerKey) {
				case 'upload':
					// 上传流量，暂时不使用但保留解析
					break;
				case 'download':
					subInfo.download = parseInt(value) || 0;
					break;
				case 'total':
					subInfo.total = parseInt(value) || 0;
					break;
				case 'expire':
					// 处理空值或无效值的情况
					const expireValue = parseInt(value);
					subInfo.expire = (expireValue && expireValue > 0) ? expireValue : null;
					break;
			}
		}
	}

	return subInfo;
}

// 生成订阅名称
function generateSubscriptionName(subInfo, existingNames) {
	let baseName = subInfo.name;

	// 如果没有获取到名称，使用默认命名
	if (!baseName) {
		// 查找可用的最小序号，填补空缺
		const usedNumbers = new Set();
		existingNames.forEach(name => {
			const match = name.match(/^订阅(\d{2})(?:\s|\[|$)/);
			if (match) {
				usedNumbers.add(parseInt(match[1]));
			}
		});

		// 找到最小的可用序号
		let counter = 1;
		while (usedNumbers.has(counter)) {
			counter++;
		}
		baseName = `订阅${String(counter).padStart(2, '0')}`;
	}

	// 构建完整名称
	let fullName = baseName;

	// 添加流量信息
	if (subInfo.download > 0 && subInfo.total > 0) {
		const downloadGiB = (subInfo.download / (1024 * 1024 * 1024)).toFixed(2);
		const totalGiB = (subInfo.total / (1024 * 1024 * 1024)).toFixed(1);
		fullName += ` [${downloadGiB}GiB/${totalGiB}GiB]`;
	}

	// 添加到期时间
	if (subInfo.expire) {
		const expireDate = new Date(subInfo.expire * 1000);
		const year = expireDate.getFullYear();
		const month = String(expireDate.getMonth() + 1).padStart(2, '0');
		const day = String(expireDate.getDate()).padStart(2, '0');
		fullName += ` (${year}-${month}-${day}到期)`;
	}

	// 处理重复名称
	let finalName = fullName;
	let counter = 2;
	while (existingNames.includes(finalName)) {
		// 从基础名称开始构建，避免重复添加编号
		let numberedBaseName = `${baseName}-${String(counter).padStart(2, '0')}`;
		finalName = numberedBaseName;

		// 重新添加流量和到期信息
		if (subInfo.download > 0 && subInfo.total > 0) {
			const downloadGiB = (subInfo.download / (1024 * 1024 * 1024)).toFixed(2);
			const totalGiB = (subInfo.total / (1024 * 1024 * 1024)).toFixed(1);
			finalName += ` [${downloadGiB}GiB/${totalGiB}GiB]`;
		}

		if (subInfo.expire) {
			const expireDate = new Date(subInfo.expire * 1000);
			const year = expireDate.getFullYear();
			const month = String(expireDate.getMonth() + 1).padStart(2, '0');
			const day = String(expireDate.getDate()).padStart(2, '0');
			finalName += ` (${year}-${month}-${day}到期)`;
		}

		counter++;
	}

	return finalName;
}

export { generateSubscriptionName, getSubscriptionInfo, shouldRejectSubscription };
