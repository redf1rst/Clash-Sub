import { parseLooseJSON } from '../parsers/helpers.js';
import { normalizeJSONProxy } from '../parsers/json.js';
import { parseProxyUrl } from '../parsers/proxy-url.js';
import { formatServerAddress, isIPv6Address } from '../utils/address.js';
import { areProxiesIdentical } from '../utils/proxy-identity.js';
import { detectRegion, REGION_NAMES, sortProxiesByRegion } from '../utils/regions.js';
import { getProxyCollections } from './proxies.js';

// 向集合添加节点
async function addProxyToCollection(collectionId, proxyUrls, region, env) {
	try {
		const collections = await getProxyCollections(env);
		const collection = collections.find(c => c.id === collectionId);

		if (!collection) {
			return new Response(JSON.stringify({ error: '节点集合不存在' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 支持多行输入
		const urls = proxyUrls.split('\n').map(url => url.trim()).filter(url => url);

		let successCount = 0;
		let duplicateCount = 0;
		let errorCount = 0;
		const addedProxies = [];

		for (const proxyUrl of urls) {
			const proxyConfig = parseProxyUrl(proxyUrl);

			if (!proxyConfig) {
				errorCount++;
				continue; // 跳过无效的节点链接
			}

			// 验证解析结果的关键字段
			if (!proxyConfig.type || !proxyConfig.server || !proxyConfig.port) {
				errorCount++;
				continue; // 跳过解析结果不完整的节点
			}

			// 检查重复节点 - 所有字段都相同才认为是重复
			const isDuplicate = collection.proxies.some(p =>
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
			collection.proxies.forEach(p => {
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

			collection.proxies.push(proxyConfig);
			addedProxies.push(proxyConfig);
			successCount++;
		}

		// 排序节点 - 使用统一的排序逻辑
		sortProxiesByRegion(collection.proxies);

		await env.CLASH_KV?.put('proxy_collections', JSON.stringify(collections));

		return new Response(JSON.stringify({
			success: true,
			successCount,
			duplicateCount,
			errorCount,
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

// 添加混合格式节点到节点集合
async function addMixedProxiesToCollection(collectionId, data, env) {
	try {
		const { jsonProxies, proxyUrls, region } = data;

		// 1. 处理链接格式节点
		const linkResult = await addProxyToCollection(collectionId, proxyUrls, region, env);
		const linkData = await linkResult.json();

		// 如果链接处理失败，直接返回错误
		if (linkData.error) {
			return new Response(JSON.stringify(linkData), {
				status: linkResult.status,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 2. 处理JSON格式节点
		const jsonResult = await addJSONProxiesToCollection(collectionId, jsonProxies, region, env);
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
			successCount: (linkData.successCount || 0) + (jsonData.successCount || 0),
			duplicateCount: (linkData.duplicateCount || 0) + (jsonData.duplicateCount || 0),
			errorCount: (linkData.errorCount || 0) + (jsonData.errorCount || 0),
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

// 添加JSON格式节点到集合
async function addJSONProxiesToCollection(collectionId, proxiesToAdd, region, env) {
	try {
		const collections = await getProxyCollections(env);
		const collection = collections.find(c => c.id === collectionId);

		if (!collection) {
			return new Response(JSON.stringify({ error: '节点集合不存在' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		let successCount = 0;
		let duplicateCount = 0;
		let errorCount = 0;
		const addedProxies = [];

		// 为每个地区+IP版本组合维护独立的编号集合
		const regionUsedNumbers = new Map();

		// 验证和处理每个节点
		for (const jsonData of proxiesToAdd) {
			let proxyData = jsonData;

			// ���ַ���(�� YAML ��һ�� "- { ... }" ��ʽ)�����Խ���
			if (typeof jsonData === 'string') {
				try {
					let inline = jsonData.trim();
					if (inline.startsWith('-')) {
						inline = inline.replace(/^\-\s*/, '');
					}
					// Ϊ name ֵ�����ԣ�ʹ�ø���ֵ�к���ַ���/CJKֵ�ܹ������
					inline = inline.replace(/(\bname\s*:\s*)([^,}]+)/, function (_, p1, v) {
						const t = v.trim();
						if (t.startsWith('"') || t.startsWith('\'')) return p1 + t;
						return p1 + '"' + t.replace(/"/g, '\\"') + '"';
					});
					proxyData = parseLooseJSON(inline);
				} catch (parseError) {
					return new Response(JSON.stringify({
						error: `JSON����ʧ��: ${parseError.message}`
					}), {
						status: 400,
						headers: { 'Content-Type': 'application/json' }
					});
				}
			}

			// 如果是无效JSON，尝试宽松解析
			if (jsonData._invalid) {
				try {
					proxyData = parseLooseJSON(jsonData._originalLine);
				} catch (parseError) {
					errorCount++;
					continue; // 跳过解析失败的JSON
				}
			}

			// 基本字段验证
			if (!proxyData.name || !proxyData.server || !proxyData.port || !proxyData.type) {
				errorCount++;
				continue; // 跳过格式错误的节点，继续处理其他节点
			}

			// 验证端口号
			const port = parseInt(proxyData.port);
			if (isNaN(port) || port < 1 || port > 65535) {
				errorCount++;
				continue; // 跳过端口号无效的节点
			}

			// 格式化server地址
			const formattedServer = formatServerAddress(proxyData.server.trim());

			// 检查重复节点 - 所有字段都相同才认为是重复
			// 先构建完整的节点对象用于比较
			const tempProxy = normalizeJSONProxy(proxyData, '', formattedServer, port);
			const isDuplicate = collection.proxies.some(p =>
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

			// 计算序号 - 找到该地区可用的最小序号，填补空缺
			const regionPattern = new RegExp(`^${regionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d{3})(-IPv6)?$`);
			const regionKey = `${regionName}${suffix}`; // 如 "US美国-IPv4"

			// 获取或创建该地区的编号集合
			if (!regionUsedNumbers.has(regionKey)) {
				const usedNumbers = new Set();

				// 检查现有节点使用的序号
				collection.proxies.forEach(p => {
					const match = p.name.match(regionPattern);
					if (match) {
						const num = parseInt(match[1]);
						usedNumbers.add(num);
					}
				});

				// 检查本次已添加的节点使用的序号
				addedProxies.forEach(p => {
					const match = p.name.match(regionPattern);
					if (match) {
						const num = parseInt(match[1]);
						usedNumbers.add(num);
					}
				});

				regionUsedNumbers.set(regionKey, usedNumbers);
			}

			const usedNumbers = regionUsedNumbers.get(regionKey);
			console.log(`[DEBUG] Region: ${regionKey}, usedNumbers before assignment:`, Array.from(usedNumbers));

			// 找到最小的可用序号（填补空缺）
			let nodeNumber = 1;
			while (usedNumbers.has(nodeNumber)) {
				nodeNumber++;
			}
			usedNumbers.add(nodeNumber); // 立即添加到集合中，防止重复

			// JSON格式节点：优先使用原始名称，如果重复则智能处理编号
			// 检查原始名称是否以三位数字结尾
			const match = proxyData.name.match(/^(.+?)(\d{3})$/);
			let baseName, hasThreeDigits;

			if (match) {
				// 名称末尾是三位数字，例如 "香港节点001"
				baseName = match[1];  // "香港节点"
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
				isNameDuplicate = collection.proxies.some(p => p.name === finalName) ||
					addedProxies.some(p => p.name === finalName);

				if (isNameDuplicate) {
					const counterStr = String(counter).padStart(3, '0');
					// 无论末尾是否有三位数字，都直接拼接数字（如果有则替换，如果没有则添加）
					finalName = `${baseName}${counterStr}`;
					counter++;
				}
			}

			console.log(`[DEBUG] JSON node original name: ${proxyData.name}, final name: ${finalName}`);

			// 标准化节点数据 - 使用协议特定的解析函数
			const normalizedProxy = normalizeJSONProxy(proxyData, finalName, formattedServer, port);

			collection.proxies.push(normalizedProxy);
			addedProxies.push(normalizedProxy);
			successCount++;
		}

		// 排序节点 - 使用统一的排序逻辑
		sortProxiesByRegion(collection.proxies);

		await env.CLASH_KV?.put('proxy_collections', JSON.stringify(collections));

		return new Response(JSON.stringify({
			success: true,
			successCount,
			duplicateCount,
			errorCount,
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

export { addJSONProxiesToCollection, addMixedProxiesToCollection, addProxyToCollection };
