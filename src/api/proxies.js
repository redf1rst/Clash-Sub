import { addJSONProxies, addMixedProxies, addProxy, batchDeleteProxies, clearProxies, deleteProxy, sortExistingProxies } from '../legacy/proxies.js';

// 处理节点整合API
async function handleProxiesAPI(request, env) {
	const method = request.method;

	if (method === 'GET') {
		const url = new URL(request.url);

		// 检查是否需要排序现有节点
		if (url.searchParams.get('sort') === 'true') {
			return await sortExistingProxies(env);
		}

		const proxies = await env.CLASH_KV?.get('proxies') || '[]';
		return new Response(proxies, {
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (method === 'POST') {
		const requestData = await request.json();
		const { action, data, indexes, proxies } = requestData;

		switch (action) {
			case 'add':
				return await addProxy(data, env);
			case 'delete':
				return await deleteProxy(data.index, env);
			case 'clear':
				return await clearProxies(env);
			case 'batchDelete':
				return await batchDeleteProxies(indexes, env);
			case 'addJSON':
				return await addJSONProxies(proxies, data?.region || 'auto', env);
			case 'addMixed':
				return await addMixedProxies(data, env);
			default:
				return new Response('Invalid action', { status: 400 });
		}
	}

	return new Response('Method not allowed', { status: 405 });
}

export { handleProxiesAPI };
