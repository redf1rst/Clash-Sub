# Clash Sub

基于 Node.js 与 Docker 部署的节点与订阅聚合工具。支持 PostgreSQL 或本地 SQLite 持久化集合数据，生成适用于不同代理客户端的订阅配置。

## 功能

- 管理多个节点集合和订阅集合。
- 导入代理链接、JSON 节点及混合内容，支持去重、重命名和服务器地址修改。
- 合并 Clash YAML/JSON、Base64 和代理链接订阅。
- 更新配置时刷新来源订阅，来源失败时回退到最近成功的缓存。
- 提供地区识别、订阅名称前缀、批量操作和订阅活跃检测。
- 使用访问令牌保护管理页面和管理 API。

支持 VMess、VLESS、SS、SSR、Trojan、Hysteria、Hysteria2、TUIC、SOCKS5、HTTP、Snell、WireGuard、Mieru、AnyTLS 和 SSH。实际可用协议取决于客户端及核心版本。

## 部署

支持两种持久化存储后端，按环境变量自动切换：

- **PostgreSQL 模式**（推荐用于 Render 免费版等无持久化磁盘的云平台）：配置 `DATABASE_URL` 即可自动建表并使用 PostgreSQL 持久化，兼容 Aiven、Neon、Supabase、Railway、自建 PostgreSQL 等任意平台。
- **本地 SQLite 模式**（适合 VPS / NAS 自托管）：不配置 `DATABASE_URL` 时默认持久化到容器内 `/data/clash-sub.sqlite`。

### 使用 Docker Compose

```bash
cp .env.example .env
# 编辑 .env，设置 ACCESS_TOKEN（如需外接 PostgreSQL，同时填写 DATABASE_URL）
docker compose up -d
```

### 使用 docker run

```bash
# 方式 A：使用 PostgreSQL（例如 Aiven / Neon）
docker run -d \
  --name clash-sub \
  --restart unless-stopped \
  -p 8787:8787 \
  -e ACCESS_TOKEN_ENABLED=true \
  -e ACCESS_TOKEN=your-strong-token \
  -e DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require" \
  -e ENVIRONMENT=production \
  -e TRUST_PROXY=true \
  redfirst/clash-sub:latest

# 方式 B：使用本地 SQLite 卷持久化
docker run -d \
  --name clash-sub \
  --restart unless-stopped \
  -p 8787:8787 \
  -e ACCESS_TOKEN_ENABLED=true \
  -e ACCESS_TOKEN=your-strong-token \
  -v clash-sub-data:/data \
  redfirst/clash-sub:latest
```

### 环境变量说明

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `8787` | 服务监听端口（Render 等平台会自动注入 `PORT`） |
| `DATABASE_URL` | 空 | PostgreSQL 连接串；设置后自动启用 PostgreSQL 持久化 |
| `DATABASE_SSL` | 自动推断 | PostgreSQL SSL 开关（`true` / `false` / `verify-full` / `no-verify`），自动兼容 Aiven 自签名 CA |
| `DATABASE_CA_CERT` | 空 | 可选，自定义 CA 证书（支持 PEM、单行 `\n` 或 Base64） |
| `PG_POOL_MAX` | `5` | PostgreSQL 连接池最大连接数 |
| `DATA_DIR` | `/data` | 未设置 `DATABASE_URL` 时的本地 SQLite 目录 |
| `ACCESS_TOKEN_ENABLED` | `true` | 是否开启访问令牌认证 |
| `ACCESS_TOKEN` | 空 | 生产访问令牌 |
| `ACCESS_TOKEN_DEV` | 空 | 开发令牌（`ENVIRONMENT=development` 或未设置 `ACCESS_TOKEN` 时生效） |
| `TRUST_PROXY` | `true` | 反向代理后识别 `X-Forwarded-Proto` / `X-Forwarded-Host` |

### 本地 Node.js 运行

```bash
npm ci
npm start
# 或开发热重载
npm run dev
```

## 使用

1. 创建节点集合或订阅集合。
2. 添加代理节点或订阅链接。
3. 根据需要调整节点名称、服务器地址或订阅名称前缀。
4. 在“导入软件”中选择客户端，导入或复制订阅地址。
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

[服务端入口](<server/index.js>) 负责 HTTP 适配、健康检查（`/healthz`）、静态资源与 KV 持久化，[路由入口](<src/index.js>) 负责路由、认证和分发。业务按 API、集合、协议解析、订阅服务、配置和工具模块拆分，详见 [架构说明](<ARCHITECTURE.md>)。

```bash
# 运行全部回归测试（配置/协议/路由 + Docker 运行时）
npm run test:all
```

测试使用合成节点、模拟订阅和内存/临时 KV。[配置基线说明](<test/fixtures/BASELINE.md>) 用于防止未经授权的输出变更。

## 注意事项

- 地区识别可能不准确，可手动修改节点名称。
- 订阅活跃检测不代表所有节点都可用。
- 来源站点的访问限制可能导致服务端拉取失败，可改用节点集合导入。
- DNS、规则、协议和 TUN 的实际行为受客户端版本与网络环境影响。
