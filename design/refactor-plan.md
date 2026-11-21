# ClashSub 重构设计与执行计划

## 目标

保留既有集合管理、节点协议解析、认证与自定义 Mihomo 规则语义；将订阅集合由“输出远程 proxy-provider 引用”改为 Worker 拉取并解析来源、内联输出 `proxies`，让客户端直接获得代理清单，并在客户端每次更新配置时重新拉取原订阅。补足常见 Clash YAML/JSON、Base64 节点列表与原始 URI 列表识别，并重新设计管理 UI。

## 现状与边界

- Cloudflare Worker 单入口 `src/index.js`（约 7.4k 行）、KV 持久化、静态单页 `public/index.html`、原生 Vitest Workers 测试。
- 集合 API 及 `/clash/proxies/{id}`、`/clash/submerge/{id}` 是现有接口契约；保留路由、认证白名单、请求参数、集合对象字段和下载响应头。
- 两类配置的 DNS、策略组名称、个人规则及顺序、规则提供者、节点排序、订阅命名前缀视为兼容契约，不做无关清理。
- 新订阅解析使用成熟 YAML parser；输入限长 3 MiB、YAML alias 数限制 50、单来源代理不超过 2,000、合并代理不超过 5,000。支持 Clash 配置对象、JSON/YAML、Base64/URL-safe Base64、URI 行；未识别格式提供诊断，单条失效不阻断其他订阅。
- 订阅获取仅允许 HTTP/HTTPS，拒绝明确的 loopback/private/reserved IP、凭证嵌入式 URL，最多跟随 4 次重定向并逐跳校验目标。DNS 名解析后的 IP 不做 pinning，依赖 Cloudflare 的出站网络约束。
- 新配置仍沿用原规则/组模板，去除远程 `proxy-providers`，改用 `proxies` 数组；`include-all` 策略组继续工作。保留同名订阅前缀设置；前缀关闭时对全局重名节点采用稳定后缀去重。
- 前端保留原 API 交互及主要 DOM/函数契约。SaltUI 是 Compose Multiplatform 原生 UI 工具包而不是浏览器 HTML/CSS 组件库；Cloudflare 静态页采用其平台感知、克制反馈与组件层级思路，避免引入不兼容运行时。

## 组件与职责

1. `src/subscription-parser.js`：纯解析层，返回 `{ format, proxies, diagnostics }`；去 BOM、解码 Base64、YAML/JSON 解析、提取代理对象/URI；不处理网络、KV 或配置规则。
2. `src/index.js`：保留现有 URI/JSON 节点规范化器、API 和配置生成；统一订阅 fetch + 解析校验；新增可复用的限长响应读取、每个源的 fallback 缓存、名字前缀/去重及错误诊断。
3. `public/index.html`、`public/auth.html`：统一暖白/松绿设计体系，更新响应式布局、动效与可访问性；完整保留集合/节点/订阅 CRUD、批量操作、地区选择、活跃检测、导入/复制与登录流程。
4. `test/index.spec.js` 及解析器单测：固定 API/auth/输出规则；覆盖输入格式矩阵、转换刷新、来源失败 fallback、唯一名称、前缀开关、YAML 安全和无效输入。

## 数据流

1. 用户新增订阅：现有 Worker 获取一次有限大小响应，解析元信息与代理内容，只有至少一个有效代理的来源进入集合；保留当前 `{ subscriptions, subscriptionNames, enablePrefix }`。
2. 客户端请求集合配置：按订阅 URL 并发、限量拉取；对每个订阅解析各格式并应用名称前缀和稳定唯一化；成功快照按 collection 单独写入 KV，失败时优先复用该 URL 最近成功的快照。
3. 配置生成：将有效代理放入顶层 `proxies`，继续使用原 DNS、策略组、规则提供者和 `rules`；不输出远程代理 Provider。响应维持 YAML 下载类型、文件名与更新间隔。
4. 管理端显示每条来源解析节点数/刷新错误（若不会改变已有 API 结构则以兼容字段附加；如兼容性风险过大，诊断只在配置拉取响应日志中体现）。

## 风险与验证

- Cloudflare Worker CPU/墙钟、KV 单值限制及源站等待：设置来源并发/超时/正文限制，缓存最新成功结果，诊断部分失败。
- 不同 URI 转换器覆盖字段范围不同：订阅中的已解析 YAML 节点优先保留原字段；URI 使用项目原有协议解析函数。
- YAML 输入不可信：关闭/限制 alias，限制字节和代理数量，拒绝空代理列表；输出端采用可靠序列化器或严格往返测试。
- 扁平代理要求名称全局唯一；保持默认前缀，关闭时仅对重名后缀化。
- 使用原 Vitest Workers 环境运行新旧测试；抽取并检查关键 DNS/group/rule 字段，针对响应配置用 YAML parser 再解析；检查代理 provider 已移除、`proxies` 完整且路由/auth兼容。

## 实施顺序

1. 已完成：查看架构、API/KV、协议解析和规则模板、UI 用户流程及测试基线（当前 17 项通过）。
2. 编写格式解析测试并实现独立、有限制的订阅解析器。
3. 修改订阅新增校验与配置输出，实现节点扁平化、客户端更新时刷新及 KV 失败回退；修复混合格式导入参数错误和配置序列化边缘情况。
4. 更新管理端与认证页样式，修复脚本执行时序、事件依赖和动态文本注入方式。
5. 已完成验证：`npm test -- --run`：30 项通过；`npm run deploy -- --dry-run` 构建成功；Worker 与静态页内联 JS 解析通过；管理页由 Chrome 代理 UI 烟测覆盖 375px/1150px 操作。真实 Mihomo/FlClash 客户端导入与真实 Cloudflare Worker/KV/订阅源端到端环境尚未验证。
