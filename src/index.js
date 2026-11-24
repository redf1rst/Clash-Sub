// Cloudflare Worker entry: routing only. Business logic lives in focused modules.
import { handleProxiesAPI } from './api/proxies.js';
import { handleProxyCollectionsAPI } from './api/proxy-collections.js';
import { handleSubCollectionsAPI } from './api/subscription-collections.js';
import { handleSubMergeAPI } from './api/subscriptions.js';
import { generateProxyCollectionConfig } from './config/proxy-collection.js';
import { generateSubCollectionConfig } from './config/subscription-collection.js';
import { handleSubscriptionCheck } from './subscriptions/health.js';
import { checkToken, handleClearToken, handleTokenVerification } from './token-auth.js';

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const path = url.pathname;

		// 令牌验证路由（不需要令牌）
		if (path === '/api/verify-token') {
			return handleTokenVerification(request, env);
		}

		if (path === '/api/clear-token') {
			return handleClearToken(request);
		}

		// 检查访问令牌
		const tokenCheck = checkToken(request, env);
		if (!tokenCheck.authenticated) {
			return tokenCheck.response;
		}

		// 路由处理
		// 根路径现在由静态文件处理，不需要特殊处理

		if (path === '/api/proxies') {
			return handleProxiesAPI(request, env);
		}

		if (path === '/api/proxy-collections') {
			return handleProxyCollectionsAPI(request, env);
		}

		if (path === '/api/submerge') {
			return handleSubMergeAPI(request, env);
		}

		if (path === '/api/sub-collections') {
			return handleSubCollectionsAPI(request, env);
		}

		if (path === '/api/submerge/check') {
			return handleSubscriptionCheck(request);
		}

		// 节点集合配置生成
		if (path.startsWith('/clash/proxies/')) {
			const collectionId = path.split('/')[3];
			return generateProxyCollectionConfig(collectionId, env, url.searchParams.get('target'), url.searchParams.get('part'), url.searchParams.get('tun'), url.searchParams.get('profile'));
		}

		// 订阅集合配置生成
		if (path.startsWith('/clash/submerge/')) {
			const collectionId = path.split('/')[3];
			return generateSubCollectionConfig(collectionId, env, url.searchParams.get('target'), url.searchParams.get('part'), url.searchParams.get('tun'), url.searchParams.get('profile'));
		}

		// 处理静态资源 (通过认证后才能访问)
		if (env.ASSETS) {
			return env.ASSETS.fetch(request);
		}

		return new Response('Not Found', { status: 404 });
	}
};
