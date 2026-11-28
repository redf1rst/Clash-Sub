// Synthetic inputs copied from Lead's pre-modularization capture, not current output.
export const proxies = [
  { name: 'JP测试01-IPv4', type: 'vless', server: 'jp.example', port: 443, uuid: 'fixture-vless', tls: true, network: 'ws', 'ws-opts': { path: '/test', headers: { Host: 'jp.example' } } },
  { name: 'US测试01-IPv4', type: 'ss', server: 'us.example', port: 8443, cipher: 'aes-128-gcm', password: 'fixture-password', udp: true },
  { name: 'HK测试01-IPv6', type: 'trojan', server: '2001:db8::10', port: 443, password: 'fixture-trojan', sni: 'hk.example', udp: true },
  { name: 'TW测试01-IPv4', type: 'vmess', server: 'tw.example', port: 443, uuid: 'fixture-vmess', alterId: 0, cipher: 'auto', tls: true }
];
export const feedUrls = ['https://feed-a.example/sub', 'https://feed-b.example/sub'];
export const feeds = new Map([
  [feedUrls[0], JSON.stringify({ proxies: [{ ...proxies[0], name: 'Same' }, { ...proxies[1], name: 'Same' }] })],
  [feedUrls[1], `trojan://fixture-trojan@hk.example:443?sni=hk.example#Same\nvless://fixture-vless@jp.example:443?encryption=none&security=tls#JP\n`]
]);
export function makeEnv(prefix = true) {
  const values = new Map([
    ['proxy_collections', JSON.stringify([{ id: 'proxy_fixture', name: '测试配置 Demo', proxies, createdAt: 123 }])],
    ['sub_collections', JSON.stringify([{ id: 'sub_fixture', name: '测试配置 Demo', subscriptions: feedUrls, subscriptionNames: ['Japan [1GiB/10GiB]', 'Hong Kong'], enablePrefix: prefix, createdAt: 123 }])]
  ]);
  return {
    ACCESS_TOKEN_ENABLED: 'false',
    CLASH_KV: {
      async get(key) { return values.get(key) ?? null; },
      async put(key, value) { values.set(key, value); },
      async delete(key) { values.delete(key); }
    }
  };
}
export const variants = [
  ['', 'default'], ['?target=clash', 'clash'], ['?target=stash', 'stash'], ['?target=shadowrocket', 'shadowrocket'],
  ['?target=singbox', 'singbox'], ['?target=sing-box&tun=1', 'singbox-tun'],
  ['?target=singbox&profile=minimal', 'singbox-minimal'], ['?target=qx', 'qx-servers'],
  ['?target=qx&part=rules', 'qx-rules'], ['?target=quantumult-x&part=invalid', 'qx-alias-default-part'],
  ['?target=unknown&part=rules&tun=true', 'unknown-target-fallback']
];
export const collectionId = kind => kind === 'proxies' ? 'proxy_fixture' : 'sub_fixture';
export const configUrl = (kind, query = '', id = collectionId(kind)) => `https://clashsub.example/clash/${kind}/${id}${query}`;
export function mockFeeds(fetchMock, fail = false) {
  for (const [url, text] of feeds) {
    fetchMock.get(new URL(url).origin).intercept({ path: '/sub' }).reply(fail ? 503 : 200, fail ? 'unavailable' : text, { headers: { 'Content-Type': 'text/plain' } });
  }
}

export function expectAuthorizedRules(expect, config, defaultProxy) {
  expect(config.ipv6).toBe(true);
  expect(config.dns.ipv6).toBe(true);
  expect(config.dns.nameserver).toEqual(['https://8.8.8.8/dns-query', 'https://1.1.1.1/dns-query']);
  expect(config.rules).not.toContain('IP-CIDR6,::/0,DIRECT,no-resolve');
  expect(config.rules.some(rule => rule.startsWith('IP-CIDR6,::/0,'))).toBe(false);
  // This configuration update replaces the old rule lists with the supplied YAML.
  // Private CIDRs now come from private_ip; cn_ip remains a resolving fallback.
  expect(config.rules).toHaveLength(40);
  expect(config.rules.slice(0, 2)).toEqual(['RULE-SET,private_domain,DIRECT', 'RULE-SET,private_ip,DIRECT,no-resolve']);
  const firstResolvingIp = config.rules.indexOf('RULE-SET,cn_ip,DIRECT');
  expect(firstResolvingIp).toBe(config.rules.length - 2);
  for (const rule of ['RULE-SET,cn_domain,DIRECT', 'DOMAIN-SUFFIX,cn,DIRECT', ...['leaflow.net', 'cloudflare.com', 'cdn.jsdmirror.com', 'cdn.jsdelivr.net'].map(domain => `DOMAIN-SUFFIX,${domain},${defaultProxy}`)]) {
    const index = config.rules.indexOf(rule);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(firstResolvingIp);
  }
  for (const domain of ['github.com', 'githubusercontent.com', 'githubassets.com', 'githubapp.com', 'github.dev', 'github.io', 'github.blog', 'githubstatus.com']) {
     const rule = `DOMAIN-SUFFIX,${domain},${defaultProxy}`;
     const index = config.rules.indexOf(rule);
     expect(index).toBeGreaterThanOrEqual(0);
     expect(index).toBeLessThan(firstResolvingIp);
   }
   expect(config.rules).toContain('IP-CIDR,17.0.0.0/8,苹果服务,no-resolve');
  expect(config.rules).toContain('RULE-SET,advertising_ads,REJECT');
  for (const [provider, policy] of [['ai', 'AI服务'], ['netflix_domain', 'Netflix'], ['tiktok_domain', 'TikTok'], ['spotify_domain', 'Spotify'], ['paypal_domain', 'PayPal']]) {
    expect(config.rules).toContain(`RULE-SET,${provider},${policy}`);
  }
  for (const obsolete of ['CNcidr', 'China', 'ChinaMedia']) {
    expect(config.rules.some(rule => rule.startsWith(`RULE-SET,${obsolete},`))).toBe(false);
  }
  expect(config.rules.at(-1)).toBe(`MATCH,${defaultProxy}`);
}
