# Clash Sub

部署在 Cloudflare Workers 上的节点与订阅聚合工具。使用 KV 保存集合数据，生成适用于不同代理客户端的订阅配置。

## 功能

- 管理多个节点集合和订阅集合。
- 导入代理链接、JSON 节点及混合内容，支持去重、重命名和服务器地址修改。
- 合并 Clash YAML/JSON、Base64 和代理链接订阅。
- 更新配置时刷新来源订阅，来源失败时回退到最近成功的缓存。
- 提供地区识别、订阅名称前缀、批量操作和订阅活跃检测。
- 使用访问令牌保护管理页面和管理 API。

支持 VMess、VLESS、SS、SSR、Trojan、Hysteria、Hysteria2、TUIC、SOCKS5、HTTP、Snell、WireGuard、Mieru、AnyTLS 和 SSH。实际可用协议取决于客户端及核心版本。

## 部署

需要 Node.js 和 Cloudflare 账号。

### 1. 安装依赖

```bash
git clone https://github.com/redf1rst/Clash-Sub.git
cd Clash-Sub
npm ci
npx wrangler login
```

### 2. 配置 KV

复制 [wrangler.example.toml](<wrangler.example.toml>) 为 [wrangler.toml](<wrangler.toml>)，然后创建 KV 命名空间：

```bash
npx wrangler kv namespace create CLASH_KV
```

将返回的命名空间 ID 填入 `kv_namespaces.id`，保持绑定名称为 `CLASH_KV`。已有部署应沿用原命名空间，避免丢失对原数据的访问。

### 3. 设置令牌并发布

在 [Wrangler 配置](<wrangler.toml>) 中保持 `ACCESS_TOKEN_ENABLED = "true"`。生产令牌通过 Secret 设置，不要提交到仓库：

```bash
npx wrangler secret put ACCESS_TOKEN
npm run deploy
```

首次使用时按 Wrangler 提示创建 Worker。部署完成后，打开输出的访问地址并输入令牌。

本地调试使用配置中的 `ACCESS_TOKEN_DEV`：

```bash
npm run dev
```

## 使用

1. 创建节点集合或订阅集合。
2. 添加代理节点或订阅链接。
3. 根据需要调整节点名称、服务器地址或订阅名称前缀。
4. 在“导入订阅”中选择客户端，导入或复制订阅地址。
5. 修改配置或更新来源后，在客户端刷新订阅。

集合订阅地址：

```text
/clash/proxies/{collectionId}
/clash/submerge/{collectionId}
```

启用认证后，管理功能需要登录；集合订阅地址允许客户端直接访问。请勿公开敏感订阅链接。

## 客户端输出

在集合订阅地址后追加对应参数：

| 客户端 | 参数 | 输出 |
| --- | --- | --- |
| Clash / Mihomo | 不追加参数 | Clash YAML，包含 DNS、代理组和规则 |
| Stash | `?target=stash` | 兼容 YAML |
| Shadowrocket | `?target=shadowrocket` | 与 Stash 相同的兼容 YAML，兼容性有限 |
| sing-box | `?target=singbox` | JSON 配置 |
| Quantumult X | `?target=qx` | 节点列表 |
| Quantumult X 规则 | `?target=qx&part=rules` | 策略与分流配置 |

sing-box 可使用 `&tun=1` 生成 TUN 入站，或使用 `&profile=minimal` 生成诊断配置。

各客户端并非完全等价。部分规则会被替换或省略，不支持的节点可能被跳过。sing-box 和 Quantumult X 的跳过数量通过 `X-ClashSub-Skipped` 响应头返回。Quantumult X 输出不展开远程规则集。

## 开发与维护

[入口文件](<src/index.js>) 只负责路由、认证和静态资源分发。业务按 API、集合、协议解析、订阅服务、配置和工具模块拆分，详见 [架构说明](<ARCHITECTURE.md>)。

两类集合共享 [分流规则](<src/config/rules.js>) 和 [规则提供者](<src/config/rule-providers.js>)，各自保留 DNS 和代理组配置。[DNS 配置](<src/config/dns.js>) 已移除上游地址中的 IPv6 解析限制；未关闭全局 IPv6，也未添加 IPv6 全直连规则。

```bash
# 运行本地回归测试
npm test -- --run
# 检查打包，不发布
npx wrangler deploy --dry-run
```

测试使用合成节点、模拟订阅和本地 KV。[配置基线说明](<test/fixtures/BASELINE.md>) 用于防止未经授权的输出变更。

## 注意事项

- 地区识别可能不准确，可手动修改节点名称。
- 订阅活跃检测不代表所有节点都可用。
- 来源站点的访问限制可能导致 Worker 拉取失败，可改用节点集合导入。
- DNS、规则、协议和 TUN 的实际行为受客户端版本与网络环境影响。
