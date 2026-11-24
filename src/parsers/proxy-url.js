import { parseAnyTLS } from './anytls.js';
import { parseHttp, parseSocks5 } from './http-socks.js';
import { parseHysteria, parseHysteria2 } from './hysteria.js';
import { parseMieru } from './mieru.js';
import { parseShadowsocks, parseShadowsocksR } from './shadowsocks.js';
import { parseSnell } from './snell.js';
import { parseSSH } from './ssh.js';
import { parseTrojan } from './trojan.js';
import { parseTuic } from './tuic.js';
import { parseVless } from './vless.js';
import { parseVmess } from './vmess.js';
import { parseWireGuard } from './wireguard.js';

// 解析代理URL
function parseProxyUrl(url) {
	try {
		// 支持vmess, vless, ss, ssr, hysteria, hysteria2, trojan, tuic, socks5, http等协议
		if (url.startsWith('vmess://')) {
			return parseVmess(url);
		} else if (url.startsWith('vless://')) {
			return parseVless(url);
		} else if (url.startsWith('ss://')) {
			return parseShadowsocks(url);
		} else if (url.startsWith('ssr://')) {
			return parseShadowsocksR(url);
		} else if (url.startsWith('hysteria://')) {
			return parseHysteria(url);
		} else if (url.startsWith('hysteria2://') || url.startsWith('hy2://')) {
			return parseHysteria2(url);
		} else if (url.startsWith('trojan://')) {
			return parseTrojan(url);
		} else if (url.startsWith('tuic://')) {
			return parseTuic(url);
		} else if (url.startsWith('socks5://')) {
			return parseSocks5(url);
		} else if (url.startsWith('http://') || url.startsWith('https://')) {
			return parseHttp(url);
		} else if (url.startsWith('snell://')) {
			return parseSnell(url);
		} else if (url.startsWith('wg://') || url.startsWith('wireguard://')) {
			return parseWireGuard(url);
		} else if (url.startsWith('mieru://')) {
			return parseMieru(url);
		} else if (url.startsWith('anytls://')) {
			return parseAnyTLS(url);
		} else if (url.startsWith('ssh://')) {
			return parseSSH(url);
		}
		return null;
	} catch (error) {
		return null;
	}
}

export { parseProxyUrl };
