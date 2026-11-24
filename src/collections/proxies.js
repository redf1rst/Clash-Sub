import { formatServerAddress } from '../utils/address.js';

// 获取所有节点集合
async function getProxyCollections(env) {
	try {
		const collections = await env.CLASH_KV?.get('proxy_collections') || '[]';
		return JSON.parse(collections);
	} catch (error) {
		return [];
	}
}

// 创建新的节点集合
async function createProxyCollection(name, env) {
	try {
		const collections = await getProxyCollections(env);

		// 生成唯一ID
		const id = 'proxy_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);

		// 如果没有提供名称，生成默认名称
		if (!name || name.trim() === '') {
			const existingNumbers = collections
				.map(c => c.name.match(/^ProxySub(\d+)$/))
				.filter(match => match)
				.map(match => parseInt(match[1]));

			let counter = 1;
			while (existingNumbers.includes(counter)) {
				counter++;
			}
			name = `ProxySub${String(counter).padStart(2, '0')}`;
		}

		const newCollection = {
			id,
			name: name.trim(),
			proxies: [],
			createdAt: Date.now()
		};

		collections.push(newCollection);
		await env.CLASH_KV?.put('proxy_collections', JSON.stringify(collections));

		return new Response(JSON.stringify({
			success: true,
			collection: newCollection
		}), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: '创建节点集合失败' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// 重命名节点集合
async function renameProxyCollection(id, newName, env) {
	try {
		const collections = await getProxyCollections(env);
		const collection = collections.find(c => c.id === id);

		if (!collection) {
			return new Response(JSON.stringify({ error: '节点集合不存在' }), {
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
		await env.CLASH_KV?.put('proxy_collections', JSON.stringify(collections));

		return new Response(JSON.stringify({
			success: true,
			message: '节点集合重命名成功'
		}), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: '重命名节点集合失败' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// 删除节点集合
async function deleteProxyCollection(id, env) {
	try {
		const collections = await getProxyCollections(env);
		const index = collections.findIndex(c => c.id === id);

		if (index === -1) {
			return new Response(JSON.stringify({ error: '节点集合不存在' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		collections.splice(index, 1);
		await env.CLASH_KV?.put('proxy_collections', JSON.stringify(collections));

		return new Response(JSON.stringify({
			success: true,
			message: '节点集合删除成功'
		}), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: '删除节点集合失败' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// 从集合删除节点
async function deleteProxyFromCollection(collectionId, index, env) {
	try {
		const collections = await getProxyCollections(env);
		const collection = collections.find(c => c.id === collectionId);

		if (!collection) {
			return new Response(JSON.stringify({ error: '节点集合不存在' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		if (index < 0 || index >= collection.proxies.length) {
			return new Response(JSON.stringify({ error: '无效的节点索引' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		collection.proxies.splice(index, 1);
		await env.CLASH_KV?.put('proxy_collections', JSON.stringify(collections));

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

// 清空集合中的所有节点
async function clearProxiesFromCollection(collectionId, env) {
	try {
		const collections = await getProxyCollections(env);
		const collection = collections.find(c => c.id === collectionId);

		if (!collection) {
			return new Response(JSON.stringify({ error: '节点集合不存在' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		collection.proxies = [];
		await env.CLASH_KV?.put('proxy_collections', JSON.stringify(collections));

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

// 批量删除集合中的节点
async function batchDeleteProxiesFromCollection(collectionId, indexes, env) {
	try {
		const collections = await getProxyCollections(env);
		const collection = collections.find(c => c.id === collectionId);

		if (!collection) {
			return new Response(JSON.stringify({ error: '节点集合不存在' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 按索引降序排序，从后往前删除，避免索引错位
		const sortedIndexes = indexes.sort((a, b) => b - a);

		// 验证索引有效性
		for (const index of sortedIndexes) {
			if (index < 0 || index >= collection.proxies.length) {
				return new Response(JSON.stringify({ error: '无效的节点索引' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		}

		// 删除节点
		for (const index of sortedIndexes) {
			collection.proxies.splice(index, 1);
		}

		await env.CLASH_KV?.put('proxy_collections', JSON.stringify(collections));

		return new Response(JSON.stringify({
			success: true,
			deletedCount: indexes.length,
			remainingCount: collection.proxies.length
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

// 更新节点集合中的节点名称
async function updateProxyNameInCollection(collectionId, index, newName, env) {
	try {
		const collections = await getProxyCollections(env);
		const collection = collections.find(c => c.id === collectionId);

		if (!collection) {
			return new Response(JSON.stringify({ error: '节点集合不存在' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 验证索引
		if (index < 0 || index >= collection.proxies.length) {
			return new Response(JSON.stringify({ error: '无效的节点索引' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 验证新名称
		if (!newName || newName.trim() === '') {
			return new Response(JSON.stringify({ error: '节点名称不能为空' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 更新节点名称
		collection.proxies[index].name = newName.trim();

		// 保存到KV
		await env.CLASH_KV?.put('proxy_collections', JSON.stringify(collections));

		return new Response(JSON.stringify({
			success: true,
			message: '节点名称更新成功',
			newName: newName.trim()
		}), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: '更新节点名称失败' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// 更新节点集合中的节点server (IP优选)
async function updateProxyServerInCollection(collectionId, index, newServer, env) {
	try {
		const collections = await getProxyCollections(env);
		const collection = collections.find(c => c.id === collectionId);

		if (!collection) {
			return new Response(JSON.stringify({ error: '节点集合不存在' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 验证索引
		if (index < 0 || index >= collection.proxies.length) {
			return new Response(JSON.stringify({ error: '无效的节点索引' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 验证新server地址
		if (!newServer || newServer.trim() === '') {
			return new Response(JSON.stringify({ error: 'Server地址不能为空' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 格式化server地址(处理IPv6)
		const formattedServer = formatServerAddress(newServer.trim());

		// 更新节点server
		collection.proxies[index].server = formattedServer;

		// 保存到KV
		await env.CLASH_KV?.put('proxy_collections', JSON.stringify(collections));

		return new Response(JSON.stringify({
			success: true,
			message: 'Server地址更新成功',
			newServer: formattedServer
		}), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: '更新Server地址失败' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

export { batchDeleteProxiesFromCollection, clearProxiesFromCollection, createProxyCollection, deleteProxyCollection, deleteProxyFromCollection, getProxyCollections, renameProxyCollection, updateProxyNameInCollection, updateProxyServerInCollection };
