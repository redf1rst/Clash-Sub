import { safeSubscriptionLogRef } from '../subscriptions/fetch.js';
import { generateSubscriptionName, getSubscriptionInfo, shouldRejectSubscription } from '../subscriptions/info.js';

// 添加订阅
async function addSubscription(data, env) {
	try {
		const subscriptions = JSON.parse(await env.CLASH_KV?.get('subscriptions') || '[]');
		const subscriptionNames = JSON.parse(await env.CLASH_KV?.get('subscription_names') || '[]');

		// 支持批量添加
		const urls = data.split('\n').map(url => url.trim()).filter(url => url);

		let successCount = 0;
		let duplicateCount = 0;
		let failedCount = 0;
		const addedSubscriptions = [];
		const failedSubscriptions = [];

		// 分批处理订阅，避免超时
		const BATCH_SIZE = 3; // 每批处理3个订阅
		const batches = [];
		for (let i = 0; i < urls.length; i += BATCH_SIZE) {
			batches.push(urls.slice(i, i + BATCH_SIZE));
		}

		for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
			const batch = batches[batchIndex];
			console.log(`[BATCH] 处理第 ${batchIndex + 1}/${batches.length} 批，包含 ${batch.length} 个订阅`);

			// 并行处理当前批次的订阅
			const batchPromises = batch.map(async (subUrl, index) => {
				const globalIndex = batchIndex * BATCH_SIZE + index;
				console.log(`[${globalIndex + 1}/${urls.length}] 处理订阅URL: ${safeSubscriptionLogRef(subUrl)}`);

				// 检查重复订阅
				if (subscriptions.includes(subUrl)) {
					console.log(`[SKIP] 重复订阅: ${safeSubscriptionLogRef(subUrl)}`);
					return { type: 'duplicate', url: subUrl };
				}

				try {
					// 添加随机延迟，避免请求过于集中
					if (index > 0) {
						await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
					}

					// 获取订阅信息（包括名称、流量、到期时间）
					console.log(`[${globalIndex + 1}/${urls.length}] 获取订阅信息: ${safeSubscriptionLogRef(subUrl)}`);
					const subInfo = await getSubscriptionInfo(subUrl, { includeContent: true });

					// 智能连通性判断
					console.log(`[${globalIndex + 1}/${urls.length}] 开始连通性检查: ${safeSubscriptionLogRef(subUrl)}`);
					const shouldReject = await shouldRejectSubscription(subUrl, subInfo);
					if (shouldReject.reject) {
						console.log(`[FAILED] 订阅被拒绝: ${safeSubscriptionLogRef(subUrl)}, 原因: ${shouldReject.reason}`);
						return {
							type: 'failed',
							url: subUrl,
							error: shouldReject.reason,
							statusCode: subInfo.statusCode
						};
					}

					// 生成订阅名称
					console.log(`[SUCCESS] 订阅通过检查，生成名称: ${safeSubscriptionLogRef(subUrl)}`);
					const subName = generateSubscriptionName(subInfo, subscriptionNames);

					console.log(`[ADDED] 订阅添加成功: ${safeSubscriptionLogRef(subUrl)} -> ${subName}`);
					return {
						type: 'success',
						url: subUrl,
						name: subName,
						subInfo: subInfo
					};
				} catch (error) {
					console.log(`[ERROR] 处理订阅时出错: ${safeSubscriptionLogRef(subUrl)}, 错误: ${error.message}`);
					return {
						type: 'failed',
						url: subUrl,
						error: '处理失败: ' + error.message,
						statusCode: 0
					};
				}
			});

			// 等待当前批次完成
			const batchResults = await Promise.allSettled(batchPromises);

			// 处理批次结果
			for (const result of batchResults) {
				if (result.status === 'fulfilled') {
					const data = result.value;
					switch (data.type) {
						case 'duplicate':
							duplicateCount++;
							break;
						case 'failed':
							failedCount++;
							failedSubscriptions.push({
								url: data.url,
								error: data.error,
								statusCode: data.statusCode
							});
							break;
						case 'success':
							subscriptions.push(data.url);
							subscriptionNames.push(data.name);
							addedSubscriptions.push({ url: data.url, name: data.name });
							successCount++;
							break;
					}
				} else {
					// Promise被拒绝的情况
					failedCount++;
					failedSubscriptions.push({
						url: 'unknown',
						error: '处理Promise失败: ' + result.reason,
						statusCode: 0
					});
				}
			}

			// 批次间添加短暂延迟
			if (batchIndex < batches.length - 1) {
				await new Promise(resolve => setTimeout(resolve, 1000));
			}
		}

		// 对订阅进行排序：按序号由小到大排序
		// 创建索引数组来保持订阅链接和名称的对应关系
		const subscriptionPairs = subscriptions.map((url, index) => ({
			url: url,
			name: subscriptionNames[index],
			index: index
		}));

		// 按订阅名称中的序号排序
		subscriptionPairs.sort((a, b) => {
			const matchA = a.name.match(/^订阅(\d{2})$/);
			const matchB = b.name.match(/^订阅(\d{2})$/);

			if (matchA && matchB) {
				const numberA = parseInt(matchA[1]);
				const numberB = parseInt(matchB[1]);
				return numberA - numberB;
			}

			// 如果不匹配默认格式，按名称排序
			return a.name.localeCompare(b.name);
		});

		// 重新构建排序后的数组
		const sortedSubscriptions = subscriptionPairs.map(pair => pair.url);
		const sortedSubscriptionNames = subscriptionPairs.map(pair => pair.name);

		await env.CLASH_KV?.put('subscriptions', JSON.stringify(sortedSubscriptions));
		await env.CLASH_KV?.put('subscription_names', JSON.stringify(sortedSubscriptionNames));

		return new Response(JSON.stringify({
			success: true,
			successCount,
			duplicateCount,
			failedCount,
			addedSubscriptions,
			failedSubscriptions
		}), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: '添加订阅失败' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// 删除订阅
async function deleteSubscription(index, env) {
	try {
		const subscriptions = JSON.parse(await env.CLASH_KV?.get('subscriptions') || '[]');
		const subscriptionNames = JSON.parse(await env.CLASH_KV?.get('subscription_names') || '[]');

		subscriptions.splice(index, 1);
		subscriptionNames.splice(index, 1);

		// 删除后进行排序：按序号由小到大排序
		// 创建索引数组来保持订阅链接和名称的对应关系
		const subscriptionPairs = subscriptions.map((url, idx) => ({
			url: url,
			name: subscriptionNames[idx],
			index: idx
		}));

		// 按订阅名称中的序号排序
		subscriptionPairs.sort((a, b) => {
			const matchA = a.name.match(/^订阅(\d{2})$/);
			const matchB = b.name.match(/^订阅(\d{2})$/);

			if (matchA && matchB) {
				const numberA = parseInt(matchA[1]);
				const numberB = parseInt(matchB[1]);
				return numberA - numberB;
			}

			// 如果不匹配默认格式，按名称排序
			return a.name.localeCompare(b.name);
		});

		// 重新构建排序后的数组
		const sortedSubscriptions = subscriptionPairs.map(pair => pair.url);
		const sortedSubscriptionNames = subscriptionPairs.map(pair => pair.name);

		await env.CLASH_KV?.put('subscriptions', JSON.stringify(sortedSubscriptions));
		await env.CLASH_KV?.put('subscription_names', JSON.stringify(sortedSubscriptionNames));

		return new Response(JSON.stringify({ success: true }), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: '删除订阅失败' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// 清空所有订阅
async function clearSubscriptions(env) {
	try {
		await env.CLASH_KV?.put('subscriptions', '[]');
		await env.CLASH_KV?.put('subscription_names', '[]');
		return new Response(JSON.stringify({ success: true }), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: '清空订阅失败' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// 批量删除订阅
async function batchDeleteSubscriptions(indexes, env) {
	try {
		const subscriptions = JSON.parse(await env.CLASH_KV?.get('subscriptions') || '[]');
		const subscriptionNames = JSON.parse(await env.CLASH_KV?.get('subscription_names') || '[]');

		// 按索引降序排序，从后往前删除，避免索引错位
		const sortedIndexes = indexes.sort((a, b) => b - a);

		// 验证索引有效性
		for (const index of sortedIndexes) {
			if (index < 0 || index >= subscriptions.length) {
				return new Response(JSON.stringify({ error: '无效的订阅索引' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		}

		// 删除订阅和对应的名称
		for (const index of sortedIndexes) {
			subscriptions.splice(index, 1);
			if (index < subscriptionNames.length) {
				subscriptionNames.splice(index, 1);
			}
		}

		await env.CLASH_KV?.put('subscriptions', JSON.stringify(subscriptions));
		await env.CLASH_KV?.put('subscription_names', JSON.stringify(subscriptionNames));

		return new Response(JSON.stringify({
			success: true,
			deletedCount: indexes.length,
			remainingCount: subscriptions.length
		}), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: '批量删除订阅失败' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// 更新订阅名称
async function updateSubscriptionName(index, newName, env) {
	try {
		const subscriptions = JSON.parse(await env.CLASH_KV?.get('subscriptions') || '[]');
		const subscriptionNames = JSON.parse(await env.CLASH_KV?.get('subscription_names') || '[]');

		// 验证索引
		if (index < 0 || index >= subscriptions.length) {
			return new Response(JSON.stringify({ error: '无效的订阅索引' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 验证新名称
		if (!newName || newName.trim() === '') {
			return new Response(JSON.stringify({ error: '订阅名称不能为空' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 更新名称
		subscriptionNames[index] = newName.trim();

		// 保存更新后的名称
		await env.CLASH_KV?.put('subscription_names', JSON.stringify(subscriptionNames));

		return new Response(JSON.stringify({
			success: true,
			message: '订阅名称更新成功'
		}), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: '更新订阅名称失败' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// 更新订阅名称
async function updateSubscriptionNames(env) {
	try {
		const subscriptions = JSON.parse(await env.CLASH_KV?.get('subscriptions') || '[]');
		const oldNames = JSON.parse(await env.CLASH_KV?.get('subscription_names') || '[]');
		const newNames = [];

		// 存储已经使用的基础名称（不含流量和到期信息）以避免重复
		const usedBaseNames = new Set();

		for (let i = 0; i < subscriptions.length; i++) {
			const subUrl = subscriptions[i];
			const subInfo = await getSubscriptionInfo(subUrl);

			// 如果订阅获取失败，保持原有名称
			if (!subInfo.success) {
				if (oldNames[i]) {
					newNames.push(oldNames[i]);
				} else {
					// 如果没有原有名称，生成默认名称
					const usedNumbers = new Set();
					newNames.forEach(name => {
						const match = name.match(/^订阅(\d{2})(?:\s|\[|$)/);
						if (match) {
							usedNumbers.add(parseInt(match[1]));
						}
					});

					let counter = 1;
					while (usedNumbers.has(counter)) {
						counter++;
					}
					newNames.push(`订阅${String(counter).padStart(2, '0')}`);
				}
				continue;
			}

			// 提取旧名称的基础部分
			let baseName = subInfo.name;
			if (!baseName && oldNames[i]) {
				// 从旧名称提取基础名称
				const baseNameMatch = oldNames[i].match(/^([^[\(]+?)(?:\s*\[.*?\])?(?:\s*\(.*?\))?$/);
				if (baseNameMatch) {
					baseName = baseNameMatch[1].trim();
				}
			}

			// 如果还是没有基础名称，使用订阅编号
			if (!baseName) {
				const usedNumbers = new Set();
				newNames.forEach(name => {
					const match = name.match(/^订阅(\d{2})(?:\s|\[|$)/);
					if (match) {
						usedNumbers.add(parseInt(match[1]));
					}
				});

				let counter = 1;
				while (usedNumbers.has(counter)) {
					counter++;
				}
				baseName = `订阅${String(counter).padStart(2, '0')}`;
			}

			// 处理基础名称重复的情况
			let uniqueBaseName = baseName;
			let counter = 2;
			while (usedBaseNames.has(uniqueBaseName)) {
				uniqueBaseName = `${baseName}-${String(counter).padStart(2, '0')}`;
				counter++;
			}
			usedBaseNames.add(uniqueBaseName);

			// 使用唯一的基础名称构造完整名称
			const tempSubInfo = { ...subInfo, name: uniqueBaseName };
			const newName = generateSubscriptionName(tempSubInfo, newNames);
			newNames.push(newName);
		}

		// 保存更新后的名称
		await env.CLASH_KV?.put('subscription_names', JSON.stringify(newNames));

		return new Response(JSON.stringify({
			success: true,
			message: '订阅名称更新成功',
			updated: newNames.length
		}), {
			headers: { 'Content-Type': 'application/json' }
		});

	} catch (error) {
		return new Response(JSON.stringify({
			success: false,
			message: '更新订阅名称失败: ' + error.message
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

export { addSubscription, batchDeleteSubscriptions, clearSubscriptions, deleteSubscription, updateSubscriptionName, updateSubscriptionNames };
