import { describe, expect, it } from 'vitest';
import latestConfig from './fixtures/latest-config.json';
import { buildGlobalOptions } from '../src/config/global-options.js';
import { buildProxyDNS, buildSubscriptionDNS } from '../src/config/dns.js';
import { buildProxyGroups } from '../src/config/proxy-groups.js';
import { buildSubscriptionGroups } from '../src/config/subscription-groups.js';
import { buildRuleProviders } from '../src/config/rule-providers.js';
import { buildRules } from '../src/config/rules.js';
import {
  toQuantumultXConfig,
  toSingBoxConfig,
  toSingBoxConfigWithStats,
  toStashConfig
} from '../src/client-formats.js';

const globalFields = ['ipv6', 'unified-delay', 'tcp-concurrent', 'find-process-mode', 'profile', 'sniffer'];
const expectedGlobalOptions = Object.fromEntries(globalFields.map(key => [key, latestConfig[key]]));

function mutateRecursively(value) {
  if (Array.isArray(value)) {
    for (const child of value) mutateRecursively(child);
    value.push('__mutated__');
  } else if (value && typeof value === 'object') {
    for (const child of Object.values(value)) mutateRecursively(child);
    value.__mutated__ = true;
  }
}

const factories = [
  ['global options', buildGlobalOptions, expectedGlobalOptions],
  ['proxy DNS', buildProxyDNS, latestConfig.dns],
  ['subscription DNS', buildSubscriptionDNS, latestConfig.dns],
  ['proxy groups', buildProxyGroups, latestConfig['proxy-groups']],
  ['subscription groups', buildSubscriptionGroups, latestConfig['proxy-groups']],
  ['rule providers', buildRuleProviders, latestConfig['rule-providers']],
  ['rules', buildRules, latestConfig.rules]
];

describe('latest configuration factories', () => {
  it.each(factories)('%s deeply matches the sanitized fixture and returns fresh nested data', (_label, factory, expected) => {
    const first = factory();
    expect(first).toEqual(expected);
    mutateRecursively(first);
    expect(factory()).toEqual(expected);
  });

  it('keeps rule/provider/DNS/group references complete and default policy names consistent', () => {
    const rules = buildRules();
    const providers = buildRuleProviders();
    const groups = buildSubscriptionGroups();
    const groupNames = new Set(groups.map(group => group.name));

    expect(Object.keys(providers)).toHaveLength(19);
    expect(groups).toHaveLength(23);
    expect(rules).toHaveLength(40);
    for (const rule of rules) {
      const match = rule.match(/^RULE-SET,([^,]+),/);
      if (match) expect(providers).toHaveProperty(match[1]);
      const parts = rule.split(',');
      const policy = parts.at(-1) === 'no-resolve' ? parts.at(-2) : parts.at(-1);
      if (policy !== 'DIRECT' && policy !== 'REJECT' && !rule.startsWith('MATCH,')) {
        expect(groupNames.has(policy)).toBe(true);
      }
    }

    const dns = buildProxyDNS();
    const dnsRefs = [
      ...dns['fake-ip-filter'].filter(value => value.startsWith('rule-set:')).map(value => value.slice(9)),
      ...Object.keys(dns['nameserver-policy']).filter(key => key.startsWith('rule-set:')).map(key => key.slice(9))
    ];
    for (const providerName of dnsRefs) expect(providers).toHaveProperty(providerName);

    expect(groups[0].name).toBe('🚀 默认代理');
    expect(groups[0].proxies).toEqual([
      '♻️ 自动选择', '🌐 全部节点',
      '♻️ 美国自动', '♻️ 日本自动', '♻️ 新加坡自动', '♻️ 台湾自动', '♻️ 香港自动', '♻️ 韩国自动',
      '🇺🇲 美国节点', '🇯🇵 日本节点', '🇸🇬 新加坡节点', '🇨🇳 台湾节点', '🇭🇰 香港节点', '🇰🇷 韩国节点',
      'DIRECT'
    ]);
    const manualNames = ['🇺🇲 美国节点', '🇯🇵 日本节点', '🇸🇬 新加坡节点', '🇨🇳 台湾节点', '🇭🇰 香港节点', '🇰🇷 韩国节点'];
    const automaticIndex = groups.findIndex(group => group.name === '♻️ 自动选择');
    expect(groups.slice(automaticIndex - manualNames.length, automaticIndex).map(group => group.name)).toEqual(manualNames);
    expect(automaticIndex).toBe(16);
    expect(groups.findIndex(group => group.name === 'Linux DO')).toBeLessThan(groups.findIndex(group => group.name === 'Netflix'));
    const group = name => groups.find(item => item.name === name);
    expect(group('♻️ 自动选择')).toMatchObject({
      type: 'url-test',
      url: 'https://www.gstatic.com/generate_204',
      interval: 300,
      tolerance: 80,
      lazy: true,
      'include-all-proxies': true
    });
    expect(group('♻️ 自动选择')['exclude-filter']).toContain('10x|6x');
    expect(group('Linux DO').proxies).toEqual(['🚀 默认代理', ...manualNames, '🌐 全部节点', 'DIRECT']);
    expect(group('微软服务').proxies.slice(-7)).toEqual([...manualNames, '🌐 全部节点']);
    expect(group('苹果服务').proxies.slice(-7)).toEqual([...manualNames, '🌐 全部节点']);
    expect(Object.values(providers).every(provider => provider.proxy === '♻️ 自动选择')).toBe(true);
    expect(buildRules('节点选择').at(-1)).toBe('MATCH,节点选择');
    expect(Object.values(buildRuleProviders('节点选择')).every(provider => provider.proxy === '♻️ 自动选择')).toBe(true);
    expect(providers['geolocation-!cn']).toMatchObject({
      type: 'http', behavior: 'domain', format: 'mrs',
      url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/geolocation-!cn.mrs',
      path: './ruleset/geolocation-!cn.mrs'
    });
  });

  it('preserves the fixture rule sequence, including domain-before-IP fallback order', () => {
    expect(buildRules()).toEqual(latestConfig.rules);
    expect(buildRules()).toHaveLength(40);
    const githubRules = buildRules().filter(rule => rule.includes('github'));
    expect(githubRules).toEqual([
      'DOMAIN-SUFFIX,github.com,🚀 默认代理',
      'DOMAIN-SUFFIX,githubusercontent.com,🚀 默认代理',
      'DOMAIN-SUFFIX,githubassets.com,🚀 默认代理',
      'DOMAIN-SUFFIX,githubapp.com,🚀 默认代理',
      'DOMAIN-SUFFIX,github.dev,🚀 默认代理',
      'DOMAIN-SUFFIX,github.io,🚀 默认代理',
      'DOMAIN-SUFFIX,github.blog,🚀 默认代理',
      'DOMAIN-SUFFIX,githubstatus.com,🚀 默认代理'
    ]);
    expect(buildRules().indexOf('DOMAIN-SUFFIX,github.com,🚀 默认代理'))
      .toBeLessThan(buildRules().indexOf('RULE-SET,cn_domain,DIRECT'));
    expect(buildRules().slice(0, 3)).toEqual([
      'RULE-SET,private_domain,DIRECT',
      'RULE-SET,private_ip,DIRECT,no-resolve',
      'DOMAIN-SUFFIX,yfjc.xyz,DIRECT'
    ]);
    expect(buildRules().at(-1)).toBe('MATCH,🚀 默认代理');
    expect(buildRules()).not.toContain('IP-CIDR6,::/0,DIRECT,no-resolve');
  });
});

const sampleProxy = (name, type = 'ss') => ({
  name,
  type,
  server: 'node.example',
  port: 443,
  cipher: 'aes-128-gcm',
  password: 'synthetic-only'
});

function syntheticConfig(overrides = {}) {
  return {
    dns: buildProxyDNS(),
    proxies: [sampleProxy('HK edge')],
    'proxy-groups': buildSubscriptionGroups(),
    'rule-providers': buildRuleProviders(),
    rules: buildRules(),
    ...overrides
  };
}

describe('client format regression boundaries', () => {
  it('maps lowercase advertising_ads to the category-ads-all alias in Stash and sing-box', () => {
    const input = syntheticConfig();
    const stash = toStashConfig(input);
    expect(stash['rule-providers'].advertising_ads.url).toMatch(/geosite\/category-ads-all\.yaml$/);

    const singbox = toSingBoxConfig('fixture', input);
    const ads = singbox.route.rule_set.find(item => item.tag === 'advertising_ads');
    expect(ads.url).toMatch(/geosite\/category-ads-all\.srs$/);
    expect(singbox.route.rules).toContainEqual({ rule_set: ['advertising_ads'], action: 'reject' });
  });

  it('removes dangling Stash fake-IP provider references while retaining private_domain', () => {
    const stash = toStashConfig(syntheticConfig());
    const fakeIpRules = stash.dns['fake-ip-filter'].filter(value => value.startsWith('rule-set:'));
    expect(fakeIpRules).toContain('rule-set:private_domain');
    expect(fakeIpRules).not.toContain('rule-set:fakeip_filter');
    expect(fakeIpRules).not.toContain('rule-set:stun_domain');
    expect(stash['rule-providers']).toHaveProperty('private_domain');
    expect(stash['rule-providers']).not.toHaveProperty('fakeip_filter');
    expect(stash['rule-providers']).not.toHaveProperty('stun_domain');
  });

  it('does not add globals or mutate shared input while converting formats', () => {
    const input = syntheticConfig();
    const before = structuredClone(input);
    const globalKeys = new Set(Reflect.ownKeys(globalThis));

    toStashConfig(input);
    toSingBoxConfig('fixture', input);
    toQuantumultXConfig('fixture', input, { part: 'rules' });

    expect(input).toEqual(before);
    expect(Reflect.ownKeys(globalThis).filter(key => !globalKeys.has(key))).toEqual([]);
  });

  it('matches region filters case-insensitively with word boundaries and excludes 10x/6x names', () => {
    const cases = [
      ['♻️ 香港自动', ['HK-01', 'node-hk', 'Hong Kong'], ['xHKy', '10x HK', '6X Hong Kong']],
      ['♻️ 台湾自动', ['TW-01', 'Taiwan'], ['xTWy', '10x Taiwan', '6x TW']],
      ['♻️ 日本自动', ['JP-01', 'Japan'], ['xJPy', '10x Japan', '6X JP']],
      ['♻️ 新加坡自动', ['SG-01', 'Singapore'], ['xSGy', '10x Singapore', '6x SG']],
      ['♻️ 韩国自动', ['KR-01', 'Korea'], ['xKRy', '10x Korea', '6X KR']],
      ['♻️ 美国自动', ['US-01', 'United States', 'America'], ['xUSy', '10x America', '6x US']]
    ];
    const names = [...new Set(cases.flatMap(([, yes, no]) => [...yes, ...no]))];
    names.push('剩余流量：99 GB');
    const config = syntheticConfig({ proxies: names.map(name => sampleProxy(name)) });
    const out = toSingBoxConfig('regions', config);

    for (const [groupName, yes, no] of cases) {
      const group = out.outbounds.find(item => item.tag === groupName);
      expect(group, groupName).toBeDefined();
      for (const name of yes) expect(group.outbounds, `${groupName} should include ${name}`).toContain(name);
      for (const name of no) expect(group.outbounds, `${groupName} should exclude ${name}`).not.toContain(name);
      expect(group.outbounds).not.toContain('剩余流量：99 GB');
    }
  });

  it('drops empty automatic groups and unknown protocols without dangling references', () => {
    const config = syntheticConfig({
      proxies: [sampleProxy('unsupported node', 'proto-not-supported')],
      'proxy-groups': [
        { name: 'Main', type: 'select', proxies: ['Empty auto'] },
        { name: 'Empty auto', type: 'url-test', filter: '^no-match$' }
      ],
      rules: []
    });
    const result = toSingBoxConfigWithStats('empty', config);
    expect(result.skipped).toContain('unsupported node');
    expect(result.config.outbounds.some(item => item.tag === 'Empty auto')).toBe(false);
    expect(result.config.outbounds.some(item => item.tag === 'Main')).toBe(false);
    expect(result.config.route.final).toBe('DIRECT');
  });

  it('supports minimal diagnostics with optional TUN and reports unsupported proxies', () => {
    const config = syntheticConfig({ proxies: [sampleProxy('not supported', 'unknown-proto')] });
    const plain = toSingBoxConfigWithStats('minimal', config, { profile: 'minimal' });
    expect(plain.config.outbounds).toEqual([{ type: 'direct', tag: 'DIRECT' }]);
    expect(plain.config.inbounds).toBeUndefined();
    expect(plain.skipped).toEqual(['not supported']);

    config.proxies = [sampleProxy('minimal SS node')];
    const tun = toSingBoxConfigWithStats('minimal tun', config, { profile: 'minimal', tun: true });
    expect(tun.config.inbounds).toEqual([expect.objectContaining({ type: 'tun', tag: 'tun-in', auto_route: true })]);
    expect(tun.config.outbounds[0]).toEqual(expect.objectContaining({ type: 'selector', default: 'minimal SS node' }));
    expect(tun.config.route.final).toBe('🚀 默认代理');
  });

  it('keeps Quantumult X RULE-SET degradation limited to its supported inline rule subset', () => {
    const config = syntheticConfig({
      proxies: [sampleProxy('qx compatible')],
      'proxy-groups': [{ name: '🚀 默认代理', type: 'select', proxies: ['DIRECT'] }],
      rules: [
        'RULE-SET,advertising_ads,REJECT',
        'RULE-SET,private_domain,DIRECT',
        'DOMAIN-SUFFIX,example.com,DIRECT',
        'IP-CIDR,192.0.2.0/24,DIRECT,no-resolve',
        'GEOIP,CN,DIRECT',
        'PROCESS-NAME,app.exe,DIRECT',
        'MATCH,🚀 默认代理'
      ]
    });
    const result = toQuantumultXConfig('qx', config, { part: 'rules' });
    expect(result.text).toContain('host-suffix, example.com, direct');
    expect(result.text).toContain('ip-cidr, 192.0.2.0/24, direct, no-resolve');
    expect(result.text).toContain('geoip, cn, direct');
    expect(result.text).toContain('final, 默认代理');
    expect(result.text).not.toContain('advertising_ads');
    expect(result.text).not.toContain('private_domain');
    expect(result.text).not.toContain('PROCESS-NAME');
    expect(result.ruleCount).toBe(4);
  });
});
