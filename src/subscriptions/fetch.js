

function isNonPublicSubscriptionHost(hostname) {
	const host = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
	if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host === 'metadata.google.internal') return true;
	const parts = host.split('.');
	if (parts.length !== 4 || parts.some(part => !/^\d{1,3}$/.test(part))) {
		return host === '::' || host === '::1' || host.startsWith('::ffff:') || host.startsWith('ff') || /^(fc|fd|fe8|fe9|fea|feb)/i.test(host);
	}
	const octets = parts.map(Number);
	if (octets.some(octet => octet < 0 || octet > 255)) return true;
	const [a, b] = octets;
	return a === 0 || a === 10 || a === 127 || a >= 224 ||
		(a === 100 && b >= 64 && b <= 127) ||
		(a === 169 && b === 254) ||
		(a === 172 && b >= 16 && b <= 31) ||
		(a === 192 && b === 168) ||
		(a === 192 && b === 0) ||
		(a === 198 && (b === 18 || b === 19));
}

function validateSubscriptionUrl(input) {
	const url = new URL(input);
	if (!['http:', 'https:'].includes(url.protocol)) throw new Error('订阅地址仅支持 HTTP 或 HTTPS');
	if (url.username || url.password) throw new Error('订阅地址不能在 URL 中包含登录凭证');
	if (isNonPublicSubscriptionHost(url.hostname)) throw new Error('订阅地址不能指向本机、内网或保留地址');
	return url;
}

async function fetchSubscriptionResponse(input, headers, timeout) {
	let url = validateSubscriptionUrl(input);
	for (let redirects = 0; redirects <= 4; redirects++) {
		const response = await fetch(url.toString(), {
			method: 'GET',
			headers,
			signal: AbortSignal.timeout(timeout),
			redirect: 'manual'
		});
		if (response.status < 300 || response.status >= 400) return response;
		const location = response.headers.get('location');
		if (!location) return response;
		if (redirects === 4) throw new Error('订阅重定向次数超过限制');
		url = validateSubscriptionUrl(new URL(location, url).toString());
	}
	throw new Error('订阅重定向次数超过限制');
}

function safeSubscriptionLogRef(value) {
	try { return new URL(value).host; } catch { return 'invalid-subscription-url'; }
}

// 定义三种主要 Clash 客户端请求头
const CLASH_USER_AGENTS = [
	{
		name: 'Clash Verge',
		headers: {
			'User-Agent': 'Clash Verge',
			'Accept': '*/*',
			'Accept-Encoding': 'gzip'
		}
	},
	{
		name: 'Clash Meta',
		headers: {
			'User-Agent': 'Clash Meta',
			'Accept': '*/*',
			'Accept-Encoding': 'gzip'
		}
	},
	{
		name: 'Mihomo',
		headers: {
			'User-Agent': 'mihomo',
			'Accept': '*/*',
			'Accept-Encoding': 'gzip, deflate',
			'Connection': 'keep-alive'
		}
	}
];

// 使用多种请求头轮询获取订阅
async function fetchWithUserAgentRotation(url, timeout = 5000, { retry = true } = {}) {
	validateSubscriptionUrl(url);
	let lastError = null;
	let lastResponse = null;
	let attemptCount = 0;

	for (const userAgent of CLASH_USER_AGENTS) {
		attemptCount++;
		try {
			// 为403错误添加随机延迟，避免被识别为机器人
			if (attemptCount > 1) {
				await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
			}

			const response = await fetchSubscriptionResponse(url, userAgent.headers, timeout);

			// 记录最后一个响应（即使是错误状态码）
			lastResponse = response;

			// 如果是成功的HTTP状态码，返回响应
			if (response.ok) {
				console.log(`${userAgent.name} 请求成功: ${response.status}`);
				return {
					response,
					userAgent: userAgent.name,
					success: true
				};
			} else if (response.status === 403) {
				// 403错误特殊处理，记录但继续尝试其他User-Agent
				console.log(`${userAgent.name} 返回403禁止访问，尝试下一个User-Agent`);
				lastError = new Error(`HTTP 403 - 访问被拒绝`);
			} else {
				// 其他HTTP错误状态码，记录但继续尝试下一个User-Agent
				console.log(`${userAgent.name} 返回HTTP错误状态码: ${response.status}`);
				lastError = new Error(`HTTP ${response.status}`);
			}
			if (!retry) break;
		} catch (error) {
			lastError = error;
			console.log(`${userAgent.name} 网络请求失败: ${error.message}`);
			if (!retry) break;
			// 继续尝试下一个 User-Agent
		}
	}

	// 如果有HTTP错误响应，返回最后一个响应（用于获取准确的状态码）
	if (lastResponse && !lastResponse.ok) {
		console.log(`所有User-Agent都失败，返回最后一个响应: ${lastResponse.status}`);
		return {
			response: lastResponse,
			userAgent: 'multiple-attempts',
			success: false
		};
	}

	// 所有 User-Agent 都失败了（网络错误）
	console.log(`所有User-Agent都失败，抛出错误: ${lastError?.message || '未知错误'}`);
	throw lastError || new Error('所有请求头都失败');
}

async function readBoundedResponseText(response, maxBytes = 3 * 1024 * 1024) {
	const length = Number(response.headers.get('content-length'));
	if (Number.isFinite(length) && length > maxBytes) throw new Error('订阅正文超过 3 MiB 限制');
	if (!response.body) return '';

	const reader = response.body.getReader();
	const chunks = [];
	let total = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			total += value.byteLength;
			if (total > maxBytes) {
				await reader.cancel();
				throw new Error('订阅正文超过 3 MiB 限制');
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}

	const bytes = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return new TextDecoder().decode(bytes);
}

export { fetchWithUserAgentRotation, readBoundedResponseText, safeSubscriptionLogRef };
