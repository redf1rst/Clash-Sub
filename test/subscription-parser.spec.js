import { describe, expect, it } from 'vitest';
import { decodeSubscriptionContent } from '../src/subscription-parser.js';

const parseUri = (url) => {
	const match = url.match(/^([a-z0-9+.-]+):\/\/(.+)$/i);
	return match ? { name: decodeURIComponent(match[2]), type: match[1].toLowerCase(), server: 'node.example', port: 443 } : null;
};

const parserOptions = { parseProxyUrl: parseUri };

function encodeBase64(text) {
	return btoa(unescape(encodeURIComponent(text)));
}

describe('decodeSubscriptionContent', () => {
	it('parses Clash YAML and preserves nested protocol options', () => {
		const source = `proxies:\n  - name: "JP 东京 #1"\n    type: vless\n    server: edge.example\n    port: 443\n    uuid: abc\n    tls: true\n    reality-opts:\n      public-key: key\n      short-id: abcd\n    ws-opts:\n      path: /tunnel\n      headers:\n        Host: cdn.example\n`;
		const result = decodeSubscriptionContent(source, parserOptions);
		expect(result.format).toBe('clash-yaml');
		expect(result.proxies).toHaveLength(1);
		expect(result.proxies[0]['reality-opts']['public-key']).toBe('key');
		expect(result.proxies[0]['ws-opts'].headers.Host).toBe('cdn.example');
	});

	it('parses JSON proxy arrays and JSON Clash configurations', () => {
		const node = { name: 'US-01', type: 'ss', server: 'ss.example', port: 8443, password: 'p', cipher: 'chacha20-ietf-poly1305' };
		expect(decodeSubscriptionContent(JSON.stringify({ proxies: [node] }), parserOptions).proxies).toEqual([node]);
		expect(decodeSubscriptionContent(JSON.stringify([node]), parserOptions).proxies).toEqual([node]);
	});

	it('parses raw URI lines with CRLF, comments, and a UTF-8 BOM', () => {
		const result = decodeSubscriptionContent('\uFEFF# subscription\r\nvless://node%20one\r\nss://node-two', parserOptions);
		expect(result.format).toBe('uri-list');
		expect(result.proxies.map(({ name }) => name)).toEqual(['node one', 'node-two']);
	});

	it('normalizes case-insensitive URI schemes', () => {
		const result = decodeSubscriptionContent('VLESS://node-one', parserOptions);
		expect(result.proxies[0].type).toBe('vless');
	});

	it('decodes standard and URL-safe Base64 URI subscriptions', () => {
		const source = 'trojan://alpha\nhysteria2://beta';
		const encoded = encodeBase64(source).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
		const result = decodeSubscriptionContent(encoded, parserOptions);
		expect(result.format).toBe('base64-uri-list');
		expect(result.proxies.map(({ type }) => type)).toEqual(['trojan', 'hysteria2']);
	});

	it('ignores malformed entries but reports a clear diagnostic when nothing parses', () => {
		const result = decodeSubscriptionContent('<html>access denied</html>', parserOptions);
		expect(result.proxies).toEqual([]);
		expect(result.diagnostics.length).toBeGreaterThan(0);
	});

	it('rejects oversized content instead of partially parsing it', () => {
		expect(() => decodeSubscriptionContent('x'.repeat(100), { ...parserOptions, maxBytes: 10 }))
			.toThrow(/超过.*字节限制/);
	});
});
