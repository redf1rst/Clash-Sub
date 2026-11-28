import { describe, it, expect, beforeEach } from 'vitest';
import appRouter from '../src/index.js';
import { createTestEnv } from './helpers/node-test-env.js';

let env;

describe('Clash订阅生成器', () => {
	beforeEach(() => {
		env = createTestEnv();
	});

	describe('API Routes', () => {
		it('GET /api/proxies returns empty array initially', async () => {
			const request = new Request('http://example.com/api/proxies');
			const response = await appRouter.fetch(request, env);

			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Type')).toBe('application/json');
			const data = await response.json();
			expect(Array.isArray(data)).toBe(true);
		});

		it('GET /api/submerge returns empty array initially', async () => {
			const request = new Request('http://example.com/api/submerge');
			const response = await appRouter.fetch(request, env);

			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Type')).toBe('application/json');
			const data = await response.json();
			expect(Array.isArray(data)).toBe(true);
		});

		it('POST /api/proxies with invalid action returns 400', async () => {
			const request = new Request('http://example.com/api/proxies', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'invalid' })
			});
			const response = await appRouter.fetch(request, env);

			expect(response.status).toBe(400);
		});

		it('POST /api/submerge with invalid action returns 400', async () => {
			const request = new Request('http://example.com/api/submerge', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'invalid' })
			});
			const response = await appRouter.fetch(request, env);

			expect(response.status).toBe(400);
		});
	});

	describe('Config Generation', () => {
		// 旧版全局端点 (/clash/proxies, /clash/submerge) 已移除, 仅支持集合版
		// /clash/proxies/{collectionId} 与 /clash/submerge/{collectionId}
		it('GET /clash/proxies (legacy global endpoint) returns 404', async () => {
			const request = new Request('http://example.com/clash/proxies');
			const response = await appRouter.fetch(request, env);

			expect(response.status).toBe(404);
		});

		it('GET /clash/submerge (legacy global endpoint) returns 404', async () => {
			const request = new Request('http://example.com/clash/submerge');
			const response = await appRouter.fetch(request, env);

			expect(response.status).toBe(404);
		});
	});

	describe('Static File Serving', () => {
		it('GET / serves the static index page', async () => {
			const request = new Request('http://example.com/');
			const response = await appRouter.fetch(request, env);

			// 静态资源由 ASSETS 提供
			expect(response.status).toBe(200);
		});
	});

	describe('404 Handling', () => {
		it('GET /nonexistent returns 404', async () => {
			const request = new Request('http://example.com/nonexistent');
			const response = await appRouter.fetch(request, env);

			// 不存在的路径交给 ASSETS, 只断言状态码
			expect(response.status).toBe(404);
		});
	});

	describe('Content-Disposition Header Parsing', () => {
		it('should parse filename*=UTF-8 format correctly', () => {
			// 模拟 parseHeaders 函数的逻辑
			const testCases = [
				{
					header: "attachment;filename*=UTF-8''%E9%9D%92%E4%BA%91%E6%A2%AF",
					expected: "青云梯"
				},
				{
					header: "attachment; filename=SubMerge",
					expected: "SubMerge"
				},
				{
					header: 'attachment; filename="PandaFan Home User 353784"',
					expected: "PandaFan Home User 353784"
				},
				{
					header: "attachment;filename*=UTF-8''Nova%E5%8A%A0%E9%80%9F",
					expected: "Nova加速"
				}
			];

			testCases.forEach(({ header, expected }) => {
				const subInfo = { name: '', download: 0, total: 0, expire: null, success: true, statusCode: 200 };

				// 模拟 parseHeaders 函数的 Content-Disposition 解析逻辑
				if (header) {
					// 先处理 filename*=UTF-8'' 格式（RFC 5987）
					const filenameStarMatch = header.match(/filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/i);
					if (filenameStarMatch) {
						try {
							// URL 解码，filenameStarMatch[1] 是实际的文件名值
							subInfo.name = decodeURIComponent(filenameStarMatch[1]);
						} catch (e) {
							// 解码失败，尝试作为原始值
							subInfo.name = filenameStarMatch[1];
						}
					}

					// 如果没有获取到名称，尝试标准 filename= 格式
					if (!subInfo.name) {
						const filenameMatch = header.match(/filename\s*=\s*([^;]+)/i);
						if (filenameMatch) {
							let rawName = filenameMatch[1].trim();

							// 移除可能的引号
							if ((rawName.startsWith('"') && rawName.endsWith('"')) ||
								(rawName.startsWith("'") && rawName.endsWith("'"))) {
								rawName = rawName.slice(1, -1);
							}

							if (rawName) {
								if (rawName.includes('%')) {
									try {
										subInfo.name = decodeURIComponent(rawName);
									} catch (e) {
										subInfo.name = rawName;
									}
								} else {
									subInfo.name = rawName;
								}
							}
						}
					}
				}

				expect(subInfo.name).toBe(expected);
			});
		});

		describe('Case-Insensitive Header Parsing', () => {
			it('should handle case-insensitive headers correctly', () => {
				// 模拟大小写不敏感的头部获取函数
				function getHeaderCaseInsensitive(headers, headerName) {
					// 首先尝试直接获取
					let value = headers.get(headerName);
					if (value) return value;

					// 如果没有找到，遍历所有头部进行大小写不敏感匹配
					const lowerHeaderName = headerName.toLowerCase();
					for (const [key, val] of headers.entries()) {
						if (key.toLowerCase() === lowerHeaderName) {
							return val;
						}
					}

					return null;
				}

				// 模拟 Headers 对象
				const mockHeaders = new Map([
					['content-disposition', 'attachment;filename*=UTF-8\'\'Nova%E5%8A%A0%E9%80%9F'],
					['subscription-userinfo', 'upload=8808742990; download=682978730455; total=1073741824000000; expire=']
				]);

				// 测试大小写不敏感获取
				expect(getHeaderCaseInsensitive(mockHeaders, 'Content-Disposition')).toBe('attachment;filename*=UTF-8\'\'Nova%E5%8A%A0%E9%80%9F');
				expect(getHeaderCaseInsensitive(mockHeaders, 'CONTENT-DISPOSITION')).toBe('attachment;filename*=UTF-8\'\'Nova%E5%8A%A0%E9%80%9F');
				expect(getHeaderCaseInsensitive(mockHeaders, 'content-disposition')).toBe('attachment;filename*=UTF-8\'\'Nova%E5%8A%A0%E9%80%9F');

				expect(getHeaderCaseInsensitive(mockHeaders, 'Subscription-Userinfo')).toBe('upload=8808742990; download=682978730455; total=1073741824000000; expire=');
				expect(getHeaderCaseInsensitive(mockHeaders, 'SUBSCRIPTION-USERINFO')).toBe('upload=8808742990; download=682978730455; total=1073741824000000; expire=');
				expect(getHeaderCaseInsensitive(mockHeaders, 'subscription-userinfo')).toBe('upload=8808742990; download=682978730455; total=1073741824000000; expire=');
			});

			it('should parse subscription-userinfo with various cases correctly', () => {
				const testCases = [
					{
						userInfo: 'upload=86333840; download=64883843714; total=64424509440; expire=1760187900',
						expected: {
							download: 64883843714,
							total: 64424509440,
							expire: 1760187900
						}
					},
					{
						userInfo: 'UPLOAD=86333840; DOWNLOAD=64883843714; TOTAL=64424509440; EXPIRE=1760187900',
						expected: {
							download: 64883843714,
							total: 64424509440,
							expire: 1760187900
						}
					},
					{
						userInfo: 'upload=8808742990; download=682978730455; total=1073741824000000; expire=',
						expected: {
							download: 682978730455,
							total: 1073741824000000,
							expire: null
						}
					}
				];

				testCases.forEach(({ userInfo, expected }) => {
					const subInfo = { name: '', download: 0, total: 0, expire: null, success: true, statusCode: 200 };

					// 模拟 parseHeaders 函数的 Subscription-Userinfo 解析逻辑
					if (userInfo) {
						const parts = userInfo.split(';').map(part => part.trim());
						for (const part of parts) {
							const [key, value] = part.split('=').map(s => s.trim());
							const lowerKey = key.toLowerCase();
							switch (lowerKey) {
								case 'upload':
									// 上传流量，暂时不使用但保留解析
									break;
								case 'download':
									subInfo.download = parseInt(value) || 0;
									break;
								case 'total':
									subInfo.total = parseInt(value) || 0;
									break;
								case 'expire':
									// 处理空值或无效值的情况
									const expireValue = parseInt(value);
									subInfo.expire = (expireValue && expireValue > 0) ? expireValue : null;
									break;
							}
						}
					}

					expect(subInfo.download).toBe(expected.download);
					expect(subInfo.total).toBe(expected.total);
					expect(subInfo.expire).toBe(expected.expire);
				});
			});
		});
	});

	describe('Access Token Auth', () => {
		// 这些用例临时打开令牌校验, 覆盖手机端"每次都要重新填令牌"的回归点
		async function call(request) {
			const authEnv = { ...env, ACCESS_TOKEN_ENABLED: 'true', ACCESS_TOKEN: 'my=secret;token' };
			return appRouter.fetch(request, authEnv);
		}

		it('sets both cookies with SameSite=Lax (mobile in-app navigations must carry them)', async () => {
			const response = await call(new Request('http://example.com/api/verify-token', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token: 'my=secret;token' })
			}));

			expect(response.status).toBe(200);

			const cookies = response.headers.getSetCookie();
			expect(cookies).toHaveLength(2);

			const tokenCookie = cookies.find(c => c.startsWith('access_token='));
			const markerCookie = cookies.find(c => c.startsWith('access_token_client='));

			expect(tokenCookie).toContain('SameSite=Lax');
			expect(tokenCookie).not.toContain('Strict');
			expect(tokenCookie).toContain('HttpOnly');
			expect(markerCookie).toContain('SameSite=Lax');
			expect(markerCookie).not.toContain('Strict');
		});

		it('treats the frontend marker cookie alone as NOT logged in', async () => {
			const response = await call(new Request('http://example.com/api/proxies', {
				headers: { Cookie: 'access_token_client=1' }
			}));

			expect(response.status).toBe(401);
		});

		it('round-trips a token containing = ; , through the cookie', async () => {
			const response = await call(new Request('http://example.com/api/proxies', {
				headers: { Cookie: 'access_token=' + encodeURIComponent('my=secret;token') + '; access_token_client=1' }
			}));

			expect(response.status).toBe(200);
		});

		it('returns 401 JSON (not a 302 to HTML) for unauthenticated API calls', async () => {
			const response = await call(new Request('http://example.com/api/proxies'));

			expect(response.status).toBe(401);
			expect(response.headers.get('Content-Type')).toBe('application/json');
		});

		it('redirects page requests to /auth keeping path and query', async () => {
			const response = await call(new Request('http://example.com/some/page?x=1'));

			expect(response.status).toBe(302);
			const location = decodeURIComponent(response.headers.get('Location'));
			expect(location).toContain('/auth?redirect=/some/page?x=1');
		});

		it('keeps subscription endpoints whitelisted for Clash clients', async () => {
			const response = await call(new Request('http://example.com/clash/submerge/123'));

			expect(response.status).not.toBe(401);
			expect(response.status).not.toBe(302);
		});
	});
});
