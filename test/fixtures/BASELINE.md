# Authorized collection response baseline

[authorized-config-baseline.json](<authorized-config-baseline.json>) is a byte-identical copy of Lead's 37-response capture from the authorized, **still-monolithic** Worker. The capture completed before module extraction; tests compare current responses against these fixed values, never generate expectations from current output.

Captured JSON SHA256: `064b26a74f60dc36a03b035d462c728216b64f04380db6a3617e98d244b28dc0`.

[authorized-config.js](<authorized-config.js>) preserves the exact synthetic inputs used in that capture. [config-baseline.spec.js](<../config-baseline.spec.js>) runs the requests with memory KV and Cloudflare fetchMock, with real networking disabled. It checks complete response-body SHA256 and byte length, HTTP status and every response header.

Coverage: both collection types, Clash/default/unknown fallback, Stash, Shadowrocket, sing-box (normal/TUN/minimal), Quantumult X servers/rules/alias, prefix disabled, successful source refresh/cache fallback/uncached failure, missing and empty collections. Additional checks enforce authorized rule ordering and no-resolve changes and exercise cross-target requests against the same KV to catch mutable configuration reuse.

Do not overwrite this baseline after refactoring to make failing tests pass. Any future intentionally authorized behavior change requires independent review of expected differences.
