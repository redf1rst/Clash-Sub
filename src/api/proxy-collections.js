import { batchDeleteProxiesFromCollection, clearProxiesFromCollection, createProxyCollection, deleteProxyCollection, deleteProxyFromCollection, getProxyCollections, renameProxyCollection, updateProxyNameInCollection, updateProxyServerInCollection } from '../collections/proxies.js';
import { addJSONProxiesToCollection, addMixedProxiesToCollection, addProxyToCollection } from '../collections/proxy-import.js';

// 处理节点集合API
async function handleProxyCollectionsAPI(request, env) {
	const method = request.method;

	if (method === 'GET') {
		// 获取所有节点集合
		const collections = await getProxyCollections(env);
		return new Response(JSON.stringify(collections), {
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (method === 'POST') {
		const requestData = await request.json();
		const { action, data, collectionId, indexes, proxies } = requestData;

		switch (action) {
			case 'create':
				return await createProxyCollection(data.name, env);
			case 'rename':
				return await renameProxyCollection(data.id, data.newName, env);
			case 'delete':
				return await deleteProxyCollection(data.id, env);
			case 'addProxy':
				return await addProxyToCollection(data.collectionId, data.proxyUrls, data.region, env);
			case 'deleteProxy':
				return await deleteProxyFromCollection(data.collectionId, data.index, env);
			case 'clearProxies':
				return await clearProxiesFromCollection(data.collectionId, env);
			case 'batchDeleteProxy':
				return await batchDeleteProxiesFromCollection(collectionId, indexes, env);
			case 'addJSONProxy':
				return await addJSONProxiesToCollection(collectionId, proxies, data?.region || 'auto', env);
			case 'addMixedProxy':
				return await addMixedProxiesToCollection(collectionId, data, env);
			case 'updateProxyName':
				return await updateProxyNameInCollection(data.collectionId, data.index, data.newName, env);
			case 'updateProxyServer':
				return await updateProxyServerInCollection(data.collectionId, data.index, data.newServer, env);
			default:
				return new Response('Invalid action', { status: 400 });
		}
	}

	return new Response('Method not allowed', { status: 405 });
}

export { handleProxyCollectionsAPI };
