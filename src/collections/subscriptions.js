

// 获取所有订阅集合
async function getSubCollections(env) {
	try {
		const collections = await env.CLASH_KV?.get('sub_collections') || '[]';
		return JSON.parse(collections);
	} catch (error) {
		return [];
	}
}

// 创建新的订阅集合
async function createSubCollection(name, env) {
	try {
		const collections = await getSubCollections(env);

		// 生成唯一ID
		const id = 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);

		// 如果没有提供名称，生成默认名称
		if (!name || name.trim() === '') {
			const existingNumbers = collections
				.map(c => c.name.match(/^SubMerge(\d+)$/))
				.filter(match => match)
				.map(match => parseInt(match[1]));

			let counter = 1;
			while (existingNumbers.includes(counter)) {
				counter++;
			}
			name = `SubMerge${String(counter).padStart(2, '0')}`;
		}

		const newCollection = {
			id,
			name: name.trim(),
			subscriptions: [],
			subscriptionNames: [],
			enablePrefix: true, // 默认开启前缀
			createdAt: Date.now()
		};

		collections.push(newCollection);
		await env.CLASH_KV?.put('sub_collections', JSON.stringify(collections));

		return new Response(JSON.stringify({
			success: true,
			collection: newCollection
		}), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: '创建订阅集合失败' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// 重命名订阅集合
async function renameSubCollection(id, newName, env) {
	try {
		const collections = await getSubCollections(env);
		const collection = collections.find(c => c.id === id);

		if (!collection) {
			return new Response(JSON.stringify({ error: '订阅集合不存在' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		if (!newName || newName.trim() === '') {
			return new Response(JSON.stringify({ error: '集合名称不能为空' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		collection.name = newName.trim();
		await env.CLASH_KV?.put('sub_collections', JSON.stringify(collections));

		return new Response(JSON.stringify({
			success: true,
			message: '订阅集合重命名成功'
		}), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: '重命名订阅集合失败' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// 切换订阅集合前缀开关
async function toggleSubCollectionPrefix(collectionId, env) {
	try {
		const collections = await getSubCollections(env);
		const collection = collections.find(c => c.id === collectionId);

		if (!collection) {
			return new Response(JSON.stringify({ error: '订阅集合不存在' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 切换前缀开关（如果字段不存在，默认为true，切换后为false）
		collection.enablePrefix = collection.enablePrefix === false ? true : false;

		await env.CLASH_KV?.put('sub_collections', JSON.stringify(collections));

		return new Response(JSON.stringify({
			success: true,
			enablePrefix: collection.enablePrefix,
			message: collection.enablePrefix ? '已开启订阅名称前缀' : '已关闭订阅名称前缀'
		}), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: '切换前缀开关失败' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// 删除订阅集合
async function deleteSubCollection(id, env) {
	try {
		const collections = await getSubCollections(env);
		const index = collections.findIndex(c => c.id === id);

		if (index === -1) {
			return new Response(JSON.stringify({ error: '订阅集合不存在' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		collections.splice(index, 1);
		await env.CLASH_KV?.put('sub_collections', JSON.stringify(collections));

		return new Response(JSON.stringify({
			success: true,
			message: '订阅集合删除成功'
		}), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: '删除订阅集合失败' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// 从集合删除订阅
async function deleteSubscriptionFromCollection(collectionId, index, env) {
	try {
		const collections = await getSubCollections(env);
		const collection = collections.find(c => c.id === collectionId);

		if (!collection) {
			return new Response(JSON.stringify({ error: '订阅集合不存在' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		if (index < 0 || index >= collection.subscriptions.length) {
			return new Response(JSON.stringify({ error: '无效的订阅索引' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		collection.subscriptions.splice(index, 1);
		collection.subscriptionNames.splice(index, 1);

		await env.CLASH_KV?.put('sub_collections', JSON.stringify(collections));

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

// 清空集合中的所有订阅
async function clearSubscriptionsFromCollection(collectionId, env) {
	try {
		const collections = await getSubCollections(env);
		const collection = collections.find(c => c.id === collectionId);

		if (!collection) {
			return new Response(JSON.stringify({ error: '订阅集合不存在' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		collection.subscriptions = [];
		collection.subscriptionNames = [];

		await env.CLASH_KV?.put('sub_collections', JSON.stringify(collections));

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

// 批量删除集合中的订阅
async function batchDeleteSubscriptionsFromCollection(collectionId, indexes, env) {
	try {
		const collections = await getSubCollections(env);
		const collection = collections.find(c => c.id === collectionId);

		if (!collection) {
			return new Response(JSON.stringify({ error: '订阅集合不存在' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 按索引降序排序，从后往前删除，避免索引错位
		const sortedIndexes = indexes.sort((a, b) => b - a);

		// 验证索引有效性
		for (const index of sortedIndexes) {
			if (index < 0 || index >= collection.subscriptions.length) {
				return new Response(JSON.stringify({ error: '无效的订阅索引' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		}

		// 删除订阅和对应的名称
		for (const index of sortedIndexes) {
			collection.subscriptions.splice(index, 1);
			if (index < collection.subscriptionNames.length) {
				collection.subscriptionNames.splice(index, 1);
			}
		}

		await env.CLASH_KV?.put('sub_collections', JSON.stringify(collections));

		return new Response(JSON.stringify({
			success: true,
			deletedCount: indexes.length,
			remainingCount: collection.subscriptions.length
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

// 更新集合中订阅的名称
async function updateSubscriptionNameInCollection(collectionId, index, newName, env) {
	try {
		const collections = await getSubCollections(env);
		const collection = collections.find(c => c.id === collectionId);

		if (!collection) {
			return new Response(JSON.stringify({ error: '订阅集合不存在' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		if (index < 0 || index >= collection.subscriptions.length) {
			return new Response(JSON.stringify({ error: '无效的订阅索引' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		if (!newName || newName.trim() === '') {
			return new Response(JSON.stringify({ error: '订阅名称不能为空' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		collection.subscriptionNames[index] = newName.trim();

		await env.CLASH_KV?.put('sub_collections', JSON.stringify(collections));

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

export { batchDeleteSubscriptionsFromCollection, clearSubscriptionsFromCollection, createSubCollection, deleteSubCollection, deleteSubscriptionFromCollection, getSubCollections, renameSubCollection, toggleSubCollectionPrefix, updateSubscriptionNameInCollection };
