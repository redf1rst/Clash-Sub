import { beforeEach, describe, expect, it } from 'vitest';
import { fetchMock } from 'cloudflare:test';
import { parse as parseYaml } from 'yaml';
import worker from '../src/index.js';
import baseline from './fixtures/authorized-config-baseline.json';
import { collectionId, configUrl, expectAuthorizedRules, makeEnv, mockFeeds, variants } from './fixtures/authorized-config.js';

// Fixed bodies derive from the sanitized source YAML and pre-update synthetic nodes.
// Status/headers and errors retain the prior baseline; see fixtures/BASELINE.md.
// Never regenerate this fixture from current output to hide a regression.
async function responseFingerprint(response) {
  const body = await response.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', body);
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers),
    bytes: body.byteLength,
    sha256: Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
  };
}
async function assertBaseline(label, url, env) {
  const response = await worker.fetch(new Request(url), env, {});
  expect(await responseFingerprint(response), label).toEqual(baseline[label]);
}

const formatCases = ['proxies', 'submerge'].flatMap(kind => variants.map(([query, label]) => [kind, query, `${kind}/${label}`, true]));
formatCases.push(...variants.slice(0, 8).map(([query, label]) => ['submerge', query, `submerge/no-prefix/${label}`, false]));

describe('authorized source configuration response baselines', () => {
  beforeEach(() => {
    fetchMock.activate();
    fetchMock.disableNetConnect();
  });

  it('keeps the fixed baseline matrix complete', () => {
    expect(Object.keys(baseline)).toHaveLength(37);
    expect(new Set(formatCases.map(([, , label]) => label)).size).toBe(30);
  });

  it.each(formatCases)('%s %s matches reviewed body bytes, SHA256, status and all headers (%s)', async (kind, query, label, prefix) => {
    if (kind === 'submerge') mockFeeds(fetchMock);
    await assertBaseline(label, configUrl(kind, query), makeEnv(prefix));
    fetchMock.assertNoPendingInterceptors();
  });

  it('checks updated cached bodies and unchanged failure responses', async () => {
    const env = makeEnv();
    mockFeeds(fetchMock);
    await assertBaseline('submerge/cache/refresh', configUrl('submerge'), env);
    mockFeeds(fetchMock, true);
    await assertBaseline('submerge/cache/fallback', configUrl('submerge'), env);
    mockFeeds(fetchMock, true);
    await assertBaseline('submerge/cache/uncached-failure', configUrl('submerge'), makeEnv());
    fetchMock.assertNoPendingInterceptors();
  });

  it.each(['proxies', 'submerge'])('%s keeps missing and empty collection errors unchanged', async kind => {
    await assertBaseline(`${kind}/missing`, configUrl(kind, '', 'missing'), makeEnv());
    const env = makeEnv();
    await env.CLASH_KV.put(kind === 'proxies' ? 'proxy_collections' : 'sub_collections', JSON.stringify([{
      id: collectionId(kind), name: 'Empty', proxies: [], subscriptions: [], subscriptionNames: []
    }]));
    await assertBaseline(`${kind}/empty`, configUrl(kind), env);
  });

  it.each(['proxies', 'submerge'])('%s explicitly preserves the authorized rule changes', async kind => {
    if (kind === 'submerge') mockFeeds(fetchMock);
    const response = await worker.fetch(new Request(configUrl(kind)), makeEnv(), {});
    expectAuthorizedRules(expect, parseYaml(await response.text()), '🚀 默认代理');
    fetchMock.assertNoPendingInterceptors();
  });

  it.each(['proxies', 'submerge'])('%s returns fresh config objects after cross-target rendering', async kind => {
    const env = makeEnv();
    if (kind === 'submerge') mockFeeds(fetchMock);
    await assertBaseline(`${kind}/stash`, configUrl(kind, '?target=stash'), env);
    if (kind === 'submerge') mockFeeds(fetchMock);
    await assertBaseline(`${kind}/default`, configUrl(kind), env);
    if (kind === 'submerge') mockFeeds(fetchMock);
    await assertBaseline(`${kind}/singbox`, configUrl(kind, '?target=singbox'), env);
    if (kind === 'submerge') mockFeeds(fetchMock);
    await assertBaseline(`${kind}/default`, configUrl(kind), env);
    fetchMock.assertNoPendingInterceptors();
  });
});
