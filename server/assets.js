import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { extname, normalize, resolve, sep } from 'node:path';

const MIME_TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.htm': 'text/html; charset=utf-8',
	'.js': 'application/javascript; charset=utf-8',
	'.mjs': 'application/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.ico': 'image/x-icon',
	'.txt': 'text/plain; charset=utf-8',
	'.xml': 'application/xml; charset=utf-8',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2'
};

function getMimeType(filePath) {
	return MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function isPathInsideRoot(rootDir, targetPath) {
	return targetPath === rootDir || targetPath.startsWith(rootDir + sep);
}

async function isRegularFile(filePath) {
	try {
		const info = await stat(filePath);
		return info.isFile();
	} catch {
		return false;
	}
}

async function resolveAssetFile(rootDir, pathname) {
	let decodedPath;
	try {
		decodedPath = decodeURIComponent(pathname);
	} catch {
		return null;
	}

	if (decodedPath.includes('\0')) {
		return null;
	}

	const relativePath = decodedPath.replace(/^\/+/, '');
	const normalizedRel = normalize(relativePath);
	const candidates = [];

	if (!relativePath || decodedPath.endsWith('/')) {
		candidates.push(resolve(rootDir, normalizedRel, 'index.html'));
	} else {
		const exact = resolve(rootDir, normalizedRel);
		candidates.push(exact);
		if (!extname(exact)) {
			candidates.push(`${exact}.html`);
			candidates.push(resolve(exact, 'index.html'));
		}
	}

	for (const candidate of candidates) {
		if (!isPathInsideRoot(rootDir, candidate)) continue;
		if (await isRegularFile(candidate)) {
			return candidate;
		}
	}

	return null;
}

/**
 * Static file handler with clean URL resolution (e.g. / -> /index.html, /auth -> /auth.html).
 */
export function createStaticAssets(publicDir) {
	const rootDir = resolve(publicDir);

	return {
		async fetch(request) {
			if (request.method !== 'GET' && request.method !== 'HEAD') {
				return new Response('Method Not Allowed', { status: 405 });
			}

			const url = new URL(request.url);
			const filePath = await resolveAssetFile(rootDir, url.pathname);
			if (!filePath) {
				return new Response('Not Found', { status: 404 });
			}

			const data = await readFile(filePath);
			const etag = `"${createHash('sha1').update(data).digest('hex')}"`;
			const headers = new Headers({
				'Content-Type': getMimeType(filePath),
				'Content-Length': String(data.byteLength),
				'ETag': etag,
				'Cache-Control': extname(filePath).toLowerCase() === '.html' ? 'no-cache' : 'public, max-age=3600'
			});

			if (request.headers.get('if-none-match') === etag) {
				return new Response(null, { status: 304, headers });
			}

			return new Response(request.method === 'HEAD' ? null : data, {
				status: 200,
				headers
			});
		}
	};
}
