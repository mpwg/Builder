import { file, serve } from 'bun';
import { resolve, sep } from 'node:path';

const root = resolve('dist');
serve({
  hostname: '127.0.0.1',
  port: 4173,
  async fetch(request) {
    const pathname = new URL(request.url).pathname;
    if (!pathname.startsWith('/post/')) return new Response(null, { status: 404 });
    const path = resolve(root, pathname.slice('/post/'.length) || 'index.html');
    if (!path.startsWith(root + sep)) return new Response(null, { status: 404 });
    const asset = file(path);
    return await asset.exists() ? new Response(asset) : new Response(null, { status: 404 });
  },
});
