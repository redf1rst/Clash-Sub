import { parseLooseJSON } from '../parsers/helpers.js';
import { normalizeJSONProxy } from '../parsers/json.js';
import { parseProxyUrl } from '../parsers/proxy-url.js';
import { formatServerAddress, isIPv6Address } from '../utils/address.js';
import { areProxiesIdentical } from '../utils/proxy-identity.js';
import { detectRegion, REGION_NAMES, sortProxiesByRegion } from '../utils/regions.js';

// 排序现有节点
async function sortExistingProxies(env) {
	try {
		const proxies = JSON.parse(await env.CLASH_KV?.get('proxies') || '[]');

		if (proxies.length === 0) {
			return new Response(JSON.stringify({
				success: true,
				message: '没有节点需要排序',
				sorted: 0
			}), {
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 使用统一的排序逻辑
		sortProxiesByRegion(proxies);

		// 保存排序后的节点
		await env.CLASH_KV?.put('proxies', JSON.stringify(proxies));

		return new Response(JSON.stringify({
			success: true,
			message: '节点排序完成',
			sorted: proxies.length,
			proxies: proxies.map(p => p.name) // 返回排序后的节点名称列表
		}), {
			headers: { 'Content-Type': 'application/json' }
		});

	} catch (error) {
		return new Response(JSON.stringify({
			success: false,
			message: '节点排序失败: ' + error.message
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// 添加节点
async function addProxy(data, env) {
	try {
		const { proxyUrls, region } = data;
		const proxies = JSON.parse(await env.CLASH_KV?.get('proxies') || '[]');

		// 支持多行输入
		const urls = proxyUrls.split('\n').map(url => url.trim()).filter(url => url);

		let successCount = 0;
		let duplicateCount = 0;
		const addedProxies = [];

		for (const proxyUrl of urls) {
			const proxyConfig = parseProxyUrl(proxyUrl);

			if (!proxyConfig) {
				continue; // 跳过无效的节点链接
			}

			// 检查重复节点 - 所有字段都相同才认为是重复
			const isDuplicate = proxies.some(p =>
				areProxiesIdentical(p, proxyConfig)
			);

			if (isDuplicate) {
				duplicateCount++;
				continue;
			}

			// 生成节点名称 - 链接格式节点统一使用自动命名规则
			let detectedRegion;
			if (region === 'auto') {
				detectedRegion = await detectRegion(proxyConfig.server);
			} else {
				detectedRegion = region;
			}

			// 使用统一的地区代码映射
			const regionName = REGION_NAMES[detectedRegion] || detectedRegion;
			const isIPv6 = isIPv6Address(proxyConfig.server);
			const suffix = isIPv6 ? '-IPv6' : '';

			// 计算序号 - 找到该地区可用的最小序号，填补空缺
			const regionPattern = new RegExp(`^${regionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d{3})(-IPv6)?$`);
			const usedNumbers = new Set();

			// 检查现有节点使用的序号
			proxies.forEach(p => {
				const match = p.name.match(regionPattern);
				if (match) {
					const num = parseInt(match[1]);
					usedNumbers.add(num);
				}
			});

			// 检查本次添加的节点使用的序号
			addedProxies.forEach(p => {
				const match = p.name.match(regionPattern);
				if (match) {
					const num = parseInt(match[1]);
					usedNumbers.add(num);
				}
			});

			// 找到最小的可用序号（填补空缺）
			let nodeNumber = 1;
			while (usedNumbers.has(nodeNumber)) {
				nodeNumber++;
			}
			usedNumbers.add(nodeNumber);

			// 使用三位数字格式
			const nodeNumberStr = String(nodeNumber).padStart(3, '0');
			proxyConfig.name = `${regionName}${nodeNumberStr}${suffix}`;

			proxies.push(proxyConfig);
			addedProxies.push(proxyConfig);
			successCount++;
		}

		// 对节点进行排序 - 使用统一的排序逻辑
		sortProxiesByRegion(proxies);

		await env.CLASH_KV?.put('proxies', JSON.stringify(proxies));

		return new Response(JSON.stringify({
			success: true,
			successCount,
			duplicateCount,
			addedProxies
		}), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: '添加节点失败' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// 删除节点
async function deleteProxy(index, env) {
	try {
		const proxies = JSON.parse(await env.CLASH_KV?.get('proxies') || '[]');
		proxies.splice(index, 1);

		// 删除后也进行排序，保持一致性
		sortProxiesByRegion(proxies);

		await env.CLASH_KV?.put('proxies', JSON.stringify(proxies));

		return new Response(JSON.stringify({ success: true }), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: '删除节点失败' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// 清空所有节点
async function clearProxies(env) {
	try {
		await env.CLASH_KV?.put('proxies', '[]');
		return new Response(JSON.stringify({ success: true }), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: '清空节点失败' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// 批量删除节点
async function batchDeleteProxies(indexes, env) {
	try {
		const proxies = JSON.parse(await env.CLASH_KV?.get('proxies') || '[]');

		// 按索引降序排序，从后往前删除，避免索引错位
		const sortedIndexes = indexes.sort((a, b) => b - a);

		// 验证索引有效性
		for (const index of sortedIndexes) {
			if (index < 0 || index >= proxies.length) {
				return new Response(JSON.stringify({ error: '无效的节点索引' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		}

		// 删除节点
		for (const index of sortedIndexes) {
			proxies.splice(index, 1);
		}

		await env.CLASH_KV?.put('proxies', JSON.stringify(proxies));

		return new Response(JSON.stringify({
			success: true,
			deletedCount: indexes.length,
			remainingCount: proxies.length
		}), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: '批量删除节点失败' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// 添加JSON格式节点
async function addJSONProxies(proxiesToAdd, region, env) {
	try {
		const proxies = JSON.parse(await env.CLASH_KV?.get('proxies') || '[]');
		const addedProxies = [];
		let successCount = 0;
		let duplicateCount = 0;

		// 验证和处理每个节点
		for (const jsonData of proxiesToAdd) {
			let proxyData = jsonData;

			// 如果是无效JSON，尝试宽松解析
			if (jsonData._invalid) {
				try {
					proxyData = parseLooseJSON(jsonData._originalLine);
				} catch (parseError) {
					return new Response(JSON.stringify({
						error: `JSON解析失败: ${parseError.message}`
					}), {
						status: 400,
						headers: { 'Content-Type': 'application/json' }
					});
				}
			}

			// 基本字段验证
			if (!proxyData.name || !proxyData.server || !proxyData.port || !proxyData.type) {
				return new Response(JSON.stringify({
					error: '节点数据格式不完整，必须包含 name、server、port、type 字段'
				}), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			// 验证端口号
			const port = parseInt(proxyData.port);
			if (isNaN(port) || port < 1 || port > 65535) {
				return new Response(JSON.stringify({
					error: `节点 "${proxyData.name}" 的端口号无效`
				}), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			// 格式化server地址
			const formattedServer = formatServerAddress(proxyData.server.trim());

			// 检查重复节点 - 所有字段都相同才认为是重复
			// 先构建完整的节点对象用于比较
			const tempProxy = normalizeJSONProxy(proxyData, '', formattedServer, port);
			const isDuplicate = proxies.some(p =>
				areProxiesIdentical(p, tempProxy)
			);

			if (isDuplicate) {
				duplicateCount++;
				continue; // 跳过重复节点
			}

			// 地区检测：手动选择优先，否则自动检测
			let detectedRegion;
			if (region === 'auto') {
				detectedRegion = await detectRegion(formattedServer);
			} else {
				detectedRegion = region;
			}

			// 使用统一的地区代码映射
			const regionName = REGION_NAMES[detectedRegion] || detectedRegion;
			const isIPv6 = isIPv6Address(formattedServer);
			const suffix = isIPv6 ? '-IPv6' : '';

			// 计算序号
			const regionPattern = new RegExp(`^${regionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d{3})(-IPv6)?$`);
			const usedNumbers = new Set();

			// 检查现有节点
			proxies.forEach(p => {
				const match = p.name.match(regionPattern);
				if (match) {
					usedNumbers.add(parseInt(match[1]));
				}
			});

			// 检查本次添加的节点
			addedProxies.forEach(p => {
				const match = p.name.match(regionPattern);
				if (match) {
					usedNumbers.add(parseInt(match[1]));
				}
			});

			// JSON格式节点：优先使用原始名称，如果重复则智能处理编号
			// 检查原始名称是否以三位数字结尾
			const matchName = proxyData.name.match(/^(.+?)(\d{3})$/);
			let baseName, hasThreeDigits;

			if (matchName) {
				// 名称末尾是三位数字，例如 "香港节点001"
				baseName = matchName[1];  // "香港节点"
				hasThreeDigits = true;
			} else {
				// 名称末尾不是三位数字
				baseName = proxyData.name;
				hasThreeDigits = false;
			}

			// 从001开始遍历，找到第一个可用编号
			let counter = 1;
			let finalName = proxyData.name;  // 先尝试原始名称
			let isNameDuplicate = true;

			while (isNameDuplicate) {
				// 检查名称是否重复
				isNameDuplicate = proxies.some(p => p.name === finalName) ||
					addedProxies.some(p => p.name === finalName);

				if (isNameDuplicate) {
					const counterStr = String(counter).padStart(3, '0');
					// 无论末尾是否有三位数字，都直接拼接数字（如果有则替换，如果没有则添加）
					finalName = `${baseName}${counterStr}`;
					counter++;
				}
			}

			// 标准化节点数据 - 使用协议特定的解析函数
			const normalizedProxy = normalizeJSONProxy(proxyData, finalName, formattedServer, port);

			proxies.push(normalizedProxy);
			addedProxies.push(normalizedProxy);
			successCount++;
		}

		await env.CLASH_KV?.put('proxies', JSON.stringify(proxies));

		return new Response(JSON.stringify({
			success: true,
			successCount,
			duplicateCount,
			addedProxies
		}), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: '添加JSON节点失败: ' + error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// 添加混合格式节点到节点整合
async function addMixedProxies(data, env) {
	try {
		const { jsonProxies, proxyUrls, region } = data;

		// 1. 处理链接格式节点
		const linkResult = await addProxy({ proxyUrls, region }, env);
		const linkData = await linkResult.json();

		// 如果链接处理失败，直接返回错误
		if (linkData.error) {
			return new Response(JSON.stringify(linkData), {
				status: linkResult.status,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 2. 处理JSON格式节点
		const jsonResult = await addJSONProxies(jsonProxies, region, env);
		const jsonData = await jsonResult.json();

		// 如果JSON处理失败，直接返回错误
		if (jsonData.error) {
			return new Response(JSON.stringify(jsonData), {
				status: jsonResult.status,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 3. 合并结果
		const combinedResult = {
			success: true,
			successCount: (linkData.successCount || 0) + (jsonData.addedCount || 0),
			duplicateCount: (linkData.duplicateCount || 0) + 0, // JSON处理目前没有重复计数
			addedProxies: [...(linkData.addedProxies || []), ...(jsonData.addedProxies || [])]
		};

		return new Response(JSON.stringify(combinedResult), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: '添加混合格式节点失败: ' + error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

export { addJSONProxies, addMixedProxies, addProxy, batchDeleteProxies, clearProxies, deleteProxy, sortExistingProxies };
