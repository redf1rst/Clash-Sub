import { safeSubscriptionLogRef } from '../subscriptions/fetch.js';
import { generateSubscriptionName, getSubscriptionInfo, shouldRejectSubscription } from '../subscriptions/info.js';
import { getSubCollections } from './subscriptions.js';

// 向集合添加订阅
async function addSubscriptionToCollection(collectionId, subscriptionUrls, env) {
	try {
		const collections = await getSubCollections(env);
		const collection = collections.find(c => c.id === collectionId);

		if (!collection) {
			return new Response(JSON.stringify({ error: '订阅集合不存在' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 支持批量添加
		const urls = subscriptionUrls.split('\n').map(url => url.trim()).filter(url => url);
		const seenUrls = new Set(collection.subscriptions);

		let successCount = 0;
		let duplicateCount = 0;
		let failedCount = 0;
		const addedSubscriptions = [];
		const failedSubscriptions = [];

		// 分批处理订阅，避免超时
		const BATCH_SIZE = 3; // 每批处理3个订阅()
		const batches = [];
		for (let i = 0; i < urls.length; i += BATCH_SIZE) {
			batches.push(urls.slice(i, i + BATCH_SIZE));
		}

		for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
			const batch = batches[batchIndex];
			console.log(`[COLLECTION BATCH] 处理第 ${batchIndex + 1}/${batches.length} 批，包含 ${batch.length} 个订阅`);

			// 并行处理当前批次的订阅
			const batchPromises = batch.map(async (subUrl, index) => {
				const globalIndex = batchIndex * BATCH_SIZE + index;
				console.log(`[COLLECTION ${globalIndex + 1}/${urls.length}] 处理订阅URL: ${safeSubscriptionLogRef(subUrl)}`);

				// 检查重复订阅
				if (seenUrls.has(subUrl)) {
					console.log(`[COLLECTION SKIP] 重复订阅: ${safeSubscriptionLogRef(subUrl)}`);
					return { type: 'duplicate', url: subUrl };
				}
				seenUrls.add(subUrl);

				try {
					// 添加随机延迟，避免请求过于集中
					if (index > 0) {
						await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
					}

					// 获取订阅信息
					console.log(`[COLLECTION ${globalIndex + 1}/${urls.length}] 获取订阅信息: ${safeSubscriptionLogRef(subUrl)}`);
					const subInfo = await getSubscriptionInfo(subUrl, { includeContent: true });

					// 智能连通性判断
					console.log(`[COLLECTION ${globalIndex + 1}/${urls.length}] 开始连通性检查: ${safeSubscriptionLogRef(subUrl)}`);
					const shouldReject = await shouldRejectSubscription(subUrl, subInfo);
					if (shouldReject.reject) {
						console.log(`[COLLECTION FAILED] 订阅被拒绝: ${safeSubscriptionLogRef(subUrl)}, 原因: ${shouldReject.reason}`);
						return {
							type: 'failed',
							url: subUrl,
							error: shouldReject.reason,
							statusCode: subInfo.statusCode
						};
					}

					// 生成订阅名称
					console.log(`[COLLECTION SUCCESS] 订阅通过检查，生成名称: ${safeSubscriptionLogRef(subUrl)}`);
					const subName = generateSubscriptionName(subInfo, collection.subscriptionNames);

					console.log(`[COLLECTION ADDED] 订阅添加成功: ${safeSubscriptionLogRef(subUrl)} -> ${subName}`);
					return {
						type: 'success',
						url: subUrl,
						name: subName,
						subInfo: subInfo
					};
				} catch (error) {
					console.log(`[COLLECTION ERROR] 处理订阅时出错: ${safeSubscriptionLogRef(subUrl)}, 错误: ${error.message}`);
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
							collection.subscriptions.push(data.url);
							collection.subscriptionNames.push(data.name);
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

		await env.CLASH_KV?.put('sub_collections', JSON.stringify(collections));

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

export { addSubscriptionToCollection };
