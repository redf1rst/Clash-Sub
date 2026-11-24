import { getSubCollections } from '../collections/subscriptions.js';
import { safeSubscriptionLogRef } from './fetch.js';
import { generateSubscriptionName, getSubscriptionInfo, shouldRejectSubscription } from './info.js';

// 订阅集合的活跃检测
async function activeDetectionForCollection(collectionId, results, env) {
	try {
		const collections = await getSubCollections(env);
		const collection = collections.find(c => c.id === collectionId);

		if (!collection) {
			return new Response(JSON.stringify({ error: '订阅集合不存在' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 验证输入参数
		if (!results || !Array.isArray(results)) {
			return new Response(JSON.stringify({
				success: false,
				message: '无效的检测结果数据'
			}), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const validSubscriptions = [];
		const validNames = [];
		const removedSubscriptions = [];

		// 存储已经使用的基础名称（不含流量和到期信息）以避免重复
		const usedBaseNames = new Set();

		for (const result of results) {
			// 检查订阅的有效性
			const subInfo = await getSubscriptionInfo(result.url, { includeContent: true });
			const shouldReject = await shouldRejectSubscription(result.url, subInfo);

			if (shouldReject.reject) {
				// 记录被移除的订阅
				removedSubscriptions.push({
					url: result.url,
					name: result.name || '未知订阅',
					reason: shouldReject.reason
				});
				continue; // 跳过无效的订阅
			}

			// 订阅有效，保留并更新名称
			validSubscriptions.push(result.url);

			// 提取基础名称
			let baseName = result.name;

			// 从现有名称中提取基础名称（去除流量和到期信息）
			if (baseName) {
				const baseNameMatch = baseName.match(/^([^[\(]+?)(?:\s*\[.*?\])?(?:\s*\(.*?\))?$/);
				if (baseNameMatch) {
					baseName = baseNameMatch[1].trim();
				}
			}

			// 如果没有基础名称，使用订阅编号
			if (!baseName) {
				const usedNumbers = new Set();
				validNames.forEach(name => {
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
			const tempSubInfo = {
				name: uniqueBaseName,
				download: subInfo.download || 0,
				total: subInfo.total || 0,
				expire: subInfo.expire || null
			};
			const newName = generateSubscriptionName(tempSubInfo, validNames);
			validNames.push(newName);
		}

		// 更新集合中的订阅和名称
		collection.subscriptions = validSubscriptions;
		collection.subscriptionNames = validNames;

		// 保存更新后的集合
		await env.CLASH_KV?.put('sub_collections', JSON.stringify(collections));

		return new Response(JSON.stringify({
			success: true,
			message: '活跃检测完成',
			totalChecked: results.length,
			updated: validNames.length,
			removed: removedSubscriptions.length,
			removedSubscriptions: removedSubscriptions
		}), {
			headers: { 'Content-Type': 'application/json' }
		});

	} catch (error) {
		return new Response(JSON.stringify({
			success: false,
			message: '活跃检测失败: ' + error.message
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// 活跃检测 - 更新订阅名称并移除无效订阅
async function activeDetection(env) {
	try {
		const subscriptions = JSON.parse(await env.CLASH_KV?.get('subscriptions') || '[]');
		const oldNames = JSON.parse(await env.CLASH_KV?.get('subscription_names') || '[]');
		const validSubscriptions = [];
		const validNames = [];
		const removedSubscriptions = [];

		// 存储已经使用的基础名称（不含流量和到期信息）以避免重复
		const usedBaseNames = new Set();

		for (let i = 0; i < subscriptions.length; i++) {
			const subUrl = subscriptions[i];
			const subInfo = await getSubscriptionInfo(subUrl, { includeContent: true });

			// 进行连通性检测
			const shouldReject = await shouldRejectSubscription(subUrl, subInfo);

			if (shouldReject.reject) {
				// 记录被移除的订阅
				removedSubscriptions.push({
					url: subUrl,
					name: oldNames[i] || `订阅${i + 1}`,
					reason: shouldReject.reason
				});
				continue; // 跳过无效的订阅
			}

			// 订阅有效，保留并更新名称
			validSubscriptions.push(subUrl);

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
				validNames.forEach(name => {
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
			const newName = generateSubscriptionName(tempSubInfo, validNames);
			validNames.push(newName);
		}

		// 保存更新后的订阅和名称
		await env.CLASH_KV?.put('subscriptions', JSON.stringify(validSubscriptions));
		await env.CLASH_KV?.put('subscription_names', JSON.stringify(validNames));

		return new Response(JSON.stringify({
			success: true,
			message: '活跃检测完成',
			updated: validNames.length,
			removed: removedSubscriptions.length,
			removedSubscriptions: removedSubscriptions
		}), {
			headers: { 'Content-Type': 'application/json' }
		});

	} catch (error) {
		return new Response(JSON.stringify({
			success: false,
			message: '活跃检测失败: ' + error.message
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// 处理单个订阅检测
async function handleSubscriptionCheck(request) {
	if (request.method !== 'POST') {
		return new Response('Method not allowed', { status: 405 });
	}

	try {
		const { url } = await request.json();

		if (!url) {
			return new Response(JSON.stringify({
				valid: false,
				reason: '缺少URL参数'
			}), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 获取订阅信息
		const subInfo = await getSubscriptionInfo(url, { includeContent: true });
		console.log(`订阅检测 ${safeSubscriptionLogRef(url)}: success=${subInfo.success}, statusCode=${subInfo.statusCode}`);

		// 进行连通性检测
		const shouldReject = await shouldRejectSubscription(url, subInfo);
		console.log(`连通性判断 ${safeSubscriptionLogRef(url)}: reject=${shouldReject.reject}, reason=${shouldReject.reason}`);

		return new Response(JSON.stringify({
			valid: !shouldReject.reject,
			name: subInfo.name || '',
			reason: shouldReject.reason || '检测通过',
			statusCode: subInfo.statusCode,
			download: subInfo.download,
			total: subInfo.total,
			expire: subInfo.expire
		}), {
			headers: { 'Content-Type': 'application/json' }
		});

	} catch (error) {
		return new Response(JSON.stringify({
			valid: false,
			reason: '检测失败: ' + error.message
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// 批量处理活跃检测结果
async function activeDetectionBatch(results, env) {
	try {
		// 验证输入参数
		if (!results || !Array.isArray(results)) {
			return new Response(JSON.stringify({
				success: false,
				message: '无效的检测结果数据'
			}), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const validSubscriptions = [];
		const validNames = [];
		const removedSubscriptions = [];

		// 存储已经使用的基础名称（不含流量和到期信息）以避免重复
		const usedBaseNames = new Set();

		for (const result of results) {
			if (!result.valid) {
				// 记录被移除的订阅
				removedSubscriptions.push({
					url: result.url,
					name: result.name || '未知订阅',
					reason: result.reason
				});
				continue; // 跳过无效的订阅
			}

			// 订阅有效，保留并更新名称
			validSubscriptions.push(result.url);

			// 提取基础名称
			let baseName = result.name;

			// 如果没有基础名称，使用订阅编号
			if (!baseName) {
				const usedNumbers = new Set();
				validNames.forEach(name => {
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
			const tempSubInfo = {
				name: uniqueBaseName,
				download: result.download || 0,
				total: result.total || 0,
				expire: result.expire || null
			};
			const newName = generateSubscriptionName(tempSubInfo, validNames);
			validNames.push(newName);
		}

		// 保存更新后的订阅和名称
		await env.CLASH_KV?.put('subscriptions', JSON.stringify(validSubscriptions));
		await env.CLASH_KV?.put('subscription_names', JSON.stringify(validNames));

		return new Response(JSON.stringify({
			success: true,
			message: '活跃检测完成',
			updated: validNames.length,
			removed: removedSubscriptions.length,
			removedSubscriptions: removedSubscriptions
		}), {
			headers: { 'Content-Type': 'application/json' }
		});

	} catch (error) {
		return new Response(JSON.stringify({
			success: false,
			message: '批量处理失败: ' + error.message
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

export { activeDetection, activeDetectionBatch, activeDetectionForCollection, handleSubscriptionCheck };
