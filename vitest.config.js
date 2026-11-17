import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				// 项目使用 wrangler.toml(不存在 wrangler.jsonc, 原配置会导致整轮测试无法启动)
				wrangler: { configPath: './wrangler.toml' },
				miniflare: {
					// 单元测试默认关闭访问令牌; 需要认证的用例在内部自行覆盖 env
					bindings: { ACCESS_TOKEN_ENABLED: 'false' },
				},
			},
		},
	},
});

