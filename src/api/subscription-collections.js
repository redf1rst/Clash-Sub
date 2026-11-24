import { addSubscriptionToCollection } from '../collections/subscription-import.js';
import { batchDeleteSubscriptionsFromCollection, clearSubscriptionsFromCollection, createSubCollection, deleteSubCollection, deleteSubscriptionFromCollection, getSubCollections, renameSubCollection, toggleSubCollectionPrefix, updateSubscriptionNameInCollection } from '../collections/subscriptions.js';
import { activeDetectionForCollection } from '../subscriptions/health.js';

// 处理订阅集合API
async function handleSubCollectionsAPI(request, env) {
	const method = request.method;

	if (method === 'GET') {
		// 获取所有订阅集合
		const collections = await getSubCollections(env);
		return new Response(JSON.stringify(collections), {
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (method === 'POST') {
		const requestData = await request.json();
		const { action, data, collectionId, indexes } = requestData;

		switch (action) {
			case 'create':
				return await createSubCollection(data.name, env);
			case 'rename':
				return await renameSubCollection(data.id, data.newName, env);
			case 'delete':
				return await deleteSubCollection(data.id, env);
			case 'addSubscription':
				return await addSubscriptionToCollection(data.collectionId, data.subscriptionUrls, env);
			case 'deleteSubscription':
				return await deleteSubscriptionFromCollection(data.collectionId, data.index, env);
			case 'clearSubscriptions':
				return await clearSubscriptionsFromCollection(data.collectionId, env);
			case 'updateSubscriptionName':
				return await updateSubscriptionNameInCollection(data.collectionId, data.index, data.newName, env);
			case 'activeDetection':
				return await activeDetectionForCollection(data.collectionId, data.results, env);
			case 'batchDeleteSubscription':
				return await batchDeleteSubscriptionsFromCollection(collectionId, indexes, env);
			case 'togglePrefix':
				return await toggleSubCollectionPrefix(collectionId, env);
			default:
				return new Response('Invalid action', { status: 400 });
		}
	}

	return new Response('Method not allowed', { status: 405 });
}

export { handleSubCollectionsAPI };
