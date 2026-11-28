# Clash Sub 架构与维护边界

## 运行时与架构概述

项目已全面迁移至 **Node.js + Docker** 运行时（Cloudflare Workers 与 Wrangler 已废弃并清理），使用 JavaScript ES Modules、KV 持久层（PostgreSQL / 本地 SQLite）、静态资源服务、YAML 和纯 Node Vitest。

[HTTP 服务入口](<server/index.js>) 负责端口监听、健康检查（`/healthz`）、静态资源与 KV 初始化，并将 Web `Request` 分发给核心 [路由入口](<src/index.js>)（73 行）。核心源码保持 45 个职责清晰的模块，保留所有集合管理、协议解析、订阅缓存与多客户端转换逻辑。

## 模块地图

| 边界 | 文件与职责 |
| --- | --- |
| 服务与存储 | [server/index.js](<server/index.js>)、[server/kv-postgres.js](<server/kv-postgres.js>)、[server/kv.js](<server/kv.js>)、[server/assets.js](<server/assets.js>)：Node HTTP 服务、PostgreSQL/SQLite KV 与静态资源 |
| 路由入口 | [index.js](<src/index.js>)：认证接口、认证检查、路由、集合查询参数、ASSETS 回退 |
| 旧 API | [proxies.js](<src/api/proxies.js>)、[subscriptions.js](<src/api/subscriptions.js>)：HTTP 方法与 action 分发 |
| 集合 API | [proxy-collections.js](<src/api/proxy-collections.js>)、[subscription-collections.js](<src/api/subscription-collections.js>)：集合 HTTP 契约 |
| 节点集合 | [proxies.js](<src/collections/proxies.js>)：CRUD；[proxy-import.js](<src/collections/proxy-import.js>)：URI/JSON/混合导入、去重、地区命名 |
| 订阅集合 | [subscriptions.js](<src/collections/subscriptions.js>)：CRUD、前缀、名称；[subscription-import.js](<src/collections/subscription-import.js>)：来源添加与检查 |
| 旧版业务 | [proxies.js](<src/legacy/proxies.js>)、[subscriptions.js](<src/legacy/subscriptions.js>)：旧数据、命名和响应语义 |
| 订阅服务 | [fetch.js](<src/subscriptions/fetch.js>)：安全拉取；[info.js](<src/subscriptions/info.js>)：头信息、拒绝策略、名称；[health.js](<src/subscriptions/health.js>)：检测；[cache.js](<src/subscriptions/cache.js>)：来源快照及内联节点 |
| 解析入口 | [proxy-url.js](<src/parsers/proxy-url.js>)：URI 分派；[json.js](<src/parsers/json.js>)：JSON 导入规范化；[helpers.js](<src/parsers/helpers.js>)：Base64、SMUX、Brutal、宽松 JSON |
| 配置编排 | [proxy-collection.js](<src/config/proxy-collection.js>)、[subscription-collection.js](<src/config/subscription-collection.js>)：读取、排序/刷新、工厂和响应 |
| 配置工厂 | [global-options.js](<src/config/global-options.js>)、[dns.js](<src/config/dns.js>)、[proxy-groups.js](<src/config/proxy-groups.js>)、[subscription-groups.js](<src/config/subscription-groups.js>)、[rules.js](<src/config/rules.js>)、[rule-providers.js](<src/config/rule-providers.js>) |
| 工具 | [regions.js](<src/utils/regions.js>)：地区识别/排序；[address.js](<src/utils/address.js>)：地址格式；[proxy-identity.js](<src/utils/proxy-identity.js>)：节点比较；[yaml.js](<src/utils/yaml.js>)：Clash YAML |
| 既存外围 | [token-auth.js](<src/token-auth.js>)：双 Cookie；[subscription-parser.js](<src/subscription-parser.js>)：来源解码；[client-formats.js](<src/client-formats.js>)：客户端输出 |
| 页面 | [index.html](<public/index.html>)、[auth.html](<public/auth.html>)：管理与验证，不改变体验和请求形状 |

协议文件：
- [vmess.js](<src/parsers/vmess.js>)、[vless.js](<src/parsers/vless.js>)：VMess、VLESS。
- [shadowsocks.js](<src/parsers/shadowsocks.js>)：SS、SSR；[hysteria.js](<src/parsers/hysteria.js>)：Hysteria、Hysteria2/hy2。
- [trojan.js](<src/parsers/trojan.js>)、[tuic.js](<src/parsers/tuic.js>)：Trojan、TUIC。
- [http-socks.js](<src/parsers/http-socks.js>)：HTTP/HTTPS、SOCKS5。
- [snell.js](<src/parsers/snell.js>)、[wireguard.js](<src/parsers/wireguard.js>)：Snell、WireGuard/wg。
- [mieru.js](<src/parsers/mieru.js>)、[anytls.js](<src/parsers/anytls.js>)、[ssh.js](<src/parsers/ssh.js>)：Mieru、AnyTLS、SSH。

## 依赖方向

```text
Server → 路由入口 → API → 集合/旧版业务 → 订阅服务、解析、工具
Server → 路由入口 → 配置编排 → 集合读取、来源缓存、工厂、客户端格式、YAML
来源信息/缓存 → 来源解码（注入 options.parseProxyUrl）
URI 分派 → 协议解析器 → 地址工具/解析 helpers
```

使用显式命名导入/导出，保持无循环。基础集合 CRUD 不反向依赖导入业务。认证、来源解码、客户端格式不导入入口；JSON、helpers、地址工具和工厂不反向依赖 API/集合。工厂仅依赖参数和标准内建。

## HTTP 与前端契约

- `/api/proxies`、`/api/submerge`：旧版 GET/POST；`/api/proxy-collections`、`/api/sub-collections`：GET **直接返回数组**，POST 分发 action。
- `/api/submerge/check`：单来源检查；`/api/verify-token`、`/api/clear-token`：认证。
- `/clash/proxies/{collectionId}`、`/clash/submerge/{collectionId}`：保留 `target/part/tun/profile`。无集合 ID 的全局配置保持已移除。

| 集合动作 | 参数位置 |
| --- | --- |
| create/rename/delete | `data.name` 或 `data.id`、`data.newName` |
| 节点 addProxy | `data.collectionId/proxyUrls/region` |
| 节点 addJSONProxy | 顶层 `collectionId/proxies`，可选 `data.region` |
| 节点 addMixedProxy | 顶层 `collectionId`，`data.jsonProxies/proxyUrls/region` |
| 节点 batchDeleteProxy | 顶层 `collectionId/indexes` |
| 节点 deleteProxy/clearProxies/updateProxyName/updateProxyServer | `data.collectionId` 及相应 index/newName/newServer |
| 订阅 addSubscription/deleteSubscription/clearSubscriptions/updateSubscriptionName/activeDetection | `data.collectionId` 及业务参数 |
| 订阅 batchDeleteSubscription/togglePrefix | 顶层 `collectionId`；批量删除另有顶层 `indexes` |

不统一包装/响应：保持各动作 `success/error`、`successCount/addedCount`、跳过计数、已添加对象、移除明细及状态码。前端检测发送 `{url,name,index}`，后端执行检测，不假设前端已经检查。

客户端保留 Clash、Stash、Shadowrocket、sing-box、QX 及别名。Shadowrocket 走 Stash 转换；QX 默认服务器列表与 `part=rules` 不同；sing-box 保留 `tun/profile=minimal`。不改变不支持节点过滤和策略组转换。

## KV 与来源处理

绑定 `env.CLASH_KV`，不改键、不隐式迁移：

| 键 | 内容 |
| --- | --- |
| `proxies` | 旧版节点数组 |
| `subscriptions` | 旧版来源 URL 数组 |
| `subscription_names` | 按旧版来源索引对齐的名称数组 |
| `proxy_collections` | 节点集合数组，内含 `proxies` |
| `sub_collections` | 订阅集合数组，内含 `subscriptions/subscriptionNames/enablePrefix` |
| `subproxy:{collectionId}:{SHA256(subscriptionUrl)}` | 成功快照：节点、格式、正文指纹、保存时间；写入 TTL 为 30 天 |

URL/名称按索引对齐；`enablePrefix !== false` 默认开启。集合 ID、命名、去重、排序、批量操作、写入顺序保持。

[拉取模块](<src/subscriptions/fetch.js>) 保留 HTTP/HTTPS、URL 凭证/非公网地址检查、跳转复检、最多四次重定向、UA 顺序、超时和 3 MiB 流式限制。现有机制不等于完整 DNS 解析层面的 SSRF 防护。

[来源解码](<src/subscription-parser.js>) 支持 YAML/JSON、URI 及最多两层 Base64，默认单来源最多 2000 个代理。结构化节点只规范化 `name/type/server/port`，其余保留，不改用 JSON 导入白名单。通过注入 URI 解析保持解耦。

[快照刷新](<src/subscriptions/cache.js>) 每批四路并发，每次客户端更新仍拉取，失败才回退快照，不按 TTL 跳过刷新。正文指纹不变不重复写入，保留 TTL 语义。按来源顺序汇集，处理前缀/重名后缀，保留 5000 节点上限、超限 413、无可用节点 502。

## 配置与序列化

- 两类集合按最新源配置共享 [全局选项](<src/config/global-options.js>)、[DNS](<src/config/dns.js>)、23 个 [代理组](<src/config/subscription-groups.js>)、32 条 [规则](<src/config/rules.js>) 和 19 个 [提供者](<src/config/rule-providers.js>)，默认策略统一为 `🚀 默认代理`。[节点组工厂](<src/config/proxy-groups.js>) 委托共享组工厂；具体节点仍由集合和订阅动态提供。
- 工厂每次返回新对象/数组，健康检查与 `include-all` 转换就地修改组，不能跨请求共享可变单例。
- 授权策略同步之外，属性/规则/节点顺序、DNS、策略名、来源 URL、附件名、响应头均为兼容边界。源配置 fixture 仅保留非节点字段，不含真实节点或凭据。
- 保留源规则顺序、`+.yfjc.xyz` DNS 策略及指定的 `no-resolve`；末尾为 `RULE-SET,cn_ip,DIRECT` 和默认代理兜底。不恢复旧 `CNcidr/GEOIP,CN` 策略或 `::/0` 全直连。
- Stash/Shadowrocket 过滤转换后不存在的 DNS 提供者引用，广告别名降级为 `category-ads-all`；各格式的既有转换无法保证完整复制 Mihomo 策略。
- Clash 的 [convertToYAML](<src/utils/yaml.js>) 使用 YAML 库与 `defaultStringType: 'QUOTE_DOUBLE'`；其它 YAML target 使用 [客户端渲染器](<src/client-formats.js>) 的独立参数。两者都不是手工 YAML，但引号/封装不同，不为统一而改变结果。

## 保留的行为风险

以下不是本轮待修项，未来调整须另获授权及专项测试：
1. [URI 分派](<src/parsers/proxy-url.js>) 大小写敏感、异常返回 `null`；来源解码先降低 scheme 大小写。
2. VMess 使用 UTF-8/Base64 辅助及 binary 回退，SS/SSR 的 `atob` 不统一。
3. 保留后覆盖前顺序：VMess 重复 HTTP 块、VLESS `fp`/默认 chrome、TUIC 下划线参数/后置 bbr/native。
4. [JSON 规范化](<src/parsers/json.js>) 保留已知白名单/未知字段及与 URI 的默认差异；VLESS `reality-opts` 同对象就地布尔化，不偷偷深拷贝。
5. [地址工具](<src/utils/address.js>) 保持类型、方括号、IPv6 判断，不拓宽输入。
6. [认证](<src/token-auth.js>) 保持订阅前缀白名单、API 401 JSON、页面 302 路径/查询、双 Cookie、SameSite=Lax、HTTPS Secure、双 `Set-Cookie` append。标记不含令牌，认证先于 ASSETS，清令牌路由位置不变。
7. 返回文本/降级与注释不一致时以实现/基线为准，不按旧 HEAD 注释重写检测。

## 验证记录与日常维护

初次模块化时，独立审阅者只读核对实际模块、imports/exports、入口和前端实参，未发现重构阻断项。以下为该阶段的历史验证记录，测试仅使用合成数据或 mock，不访问真实订阅，不部署：
- 107 个原声明唯一保留，105 个逐字一致；44 个模块语法、相对 exports 可解析，无循环。
- 37 组授权后响应正文长度/SHA256、status、全部 headers 新旧一致。
- 60 次 API/认证/静态路由响应及每次 KV 变更对比一致。
- 最终 Workers 测试：6 个测试文件、90 个测试全部通过；Windows 临时目录清理有非致命 EBUSY 警告，退出码为 0。
- Wrangler dry-run 打包成功，未发布。前端、认证、既存格式/解码模块、依赖和部署设置未修改。

2026-11-27 最新配置同步补充了 [源策略与转换回归](<test/latest-config.spec.js>)。源配置与工厂逐字段深等，37 组响应独立推导后与实现逐字节核验：24 组正文变化、13 组不变，全部状态码与响应头不变。完整 Workers 测试及 Wrangler dry-run 均退出码 0；没有部署、操作生产 KV 或请求真实订阅。旧基线在本次修改前已有的两条域名规则差异及更新过程，详见 [测试说明](<test/fixtures/BASELINE.md>)、[响应基线](<test/fixtures/authorized-config-baseline.json>)、[回归测试](<test/config-baseline.spec.js>)。不要自动更新基线以使测试通过。

```bash
# 运行全部回归测试（Vitest + Docker 运行时集成测试）
npm run test:all
```

真实远端资源、客户端运行和生产 KV 未验证，离线结果不能宣称覆盖这些环境。日常修改检查模块归属/显式依赖、前端实参/响应/KV 顺序、自由引用/循环/协议边缘参数，两类逐 target 的顺序/序列化/headers、TUN/minimal、前缀关闭、快照失败回退和空缺集合。真实来源诊断、生产操作及部署单独授权。

本次一次性 AST 提取工具不作为常规生成器：标识符收集不是完整作用域分析，将来规则含反斜线/反引号/模板插值时不照搬裸模板替换。当前规则没有这些情况。保留行为不等于消除历史兼容或安全限制。
