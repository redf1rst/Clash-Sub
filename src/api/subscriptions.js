import { addSubscription, batchDeleteSubscriptions, clearSubscriptions, deleteSubscription, updateSubscriptionName, updateSubscriptionNames } from '../legacy/subscriptions.js';
import { activeDetection, activeDetectionBatch } from '../subscriptions/health.js';

// 处理订阅整合API
async function handleSubMergeAPI(request, env) {
	const method = request.method;

	if (method === 'GET') {
		const url = new URL(request.url);
		if (url.searchParams.get('names') === 'true') {
			const subscriptionNames = await env.CLASH_KV?.get('subscription_names') || '[]';
			return new Response(subscriptionNames, {
				headers: { 'Content-Type': 'application/json' }
			});
		}

		if (url.searchParams.get('update') === 'true') {
			return await updateSubscriptionNames(env);
		}

		if (url.searchParams.get('active_detection') === 'true') {
			return await activeDetection(env);
		}

		const subscriptions = await env.CLASH_KV?.get('subscriptions') || '[]';
		return new Response(subscriptions, {
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (method === 'POST') {
		const url = new URL(request.url);

		// 处理批量活跃检测
		if (url.searchParams.get('active_detection_batch') === 'true') {
			try {
				const requestBody = await request.json();
				console.log('收到的请求体 results 数量:', requestBody.results?.length);
				const { results } = requestBody;

				if (!results) {
					console.error('缺少 results 字段');
					return new Response(JSON.stringify({
						success: false,
						message: '缺少 results 字段'
					}), {
						status: 400,
						headers: { 'Content-Type': 'application/json' }
					});
				}

				return await activeDetectionBatch(results, env);
			} catch (error) {
				console.error('处理活跃检测批量请求失败:', error);
				return new Response(JSON.stringify({
					success: false,
					message: '处理失败: ' + error.message
				}), {
					status: 500,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		}
		const requestData = await request.json();
		const { action, data, indexes } = requestData;

		switch (action) {
			case 'add':
				return await addSubscription(data, env);
			case 'delete':
				return await deleteSubscription(data.index, env);
			case 'clear':
				return await clearSubscriptions(env);
			case 'updateName':
				return await updateSubscriptionName(data.index, data.newName, env);
			case 'batchDelete':
				return await batchDeleteSubscriptions(indexes, env);
			default:
				return new Response('Invalid action', { status: 400 });
		}
	}

	return new Response('Method not allowed', { status: 405 });
}

export { handleSubMergeAPI };
