import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { pipeline } from 'node:stream';
import { createGzip } from 'node:zlib';

const root = path.resolve(import.meta.dirname, 'dist');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.mp3': 'audio/mpeg',
};

const compressible = new Set(['.html', '.js', '.css', '.svg']);

export function createSimulatorServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const decodedPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      const file = path.resolve(root, '.' + decodedPath);

      if (!file.startsWith(root + path.sep)) {
        res.writeHead(403);
        res.end();
        return;
      }

      const info = await stat(file);
      if (!info.isFile()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const ext = path.extname(file);
      const contentType = types[ext] || 'application/octet-stream';
      const etag = `W/"${info.size}-${Math.floor(info.mtimeMs)}"`;
      const isImmutableAsset = ext === '.glb' || ext === '.mp3' || ext === '.png' || ext === '.svg';
      const cacheControl = isImmutableAsset ? 'public, max-age=3600, must-revalidate' : 'no-cache';

      if (req.headers['if-none-match'] === etag) {
        res.writeHead(304, { ETag: etag, 'Cache-Control': cacheControl });
        res.end();
        return;
      }

      const rangeHeader = req.headers.range;
      if (rangeHeader && /^bytes=\d*-\d*$/.test(rangeHeader)) {
        const [startStr, endStr] = rangeHeader.replace('bytes=', '').split('-');
        let start = startStr ? parseInt(startStr, 10) : 0;
        let end = endStr ? parseInt(endStr, 10) : info.size - 1;
        if (!startStr && endStr) {
          start = Math.max(0, info.size - parseInt(endStr, 10));
          end = info.size - 1;
        }
        if (start >= info.size || end >= info.size || start > end) {
          res.writeHead(416, { 'Content-Range': `bytes */${info.size}` });
          res.end();
          return;
        }
        res.writeHead(206, {
          'Content-Type': contentType,
          'Content-Range': `bytes ${start}-${end}/${info.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': end - start + 1,
          ETag: etag,
          'Cache-Control': cacheControl,
        });
        if (req.method === 'HEAD') {
          res.end();
          return;
        }
        pipeline(createReadStream(file, { start, end }), res, () => {});
        return;
      }

      const acceptEncoding = req.headers['accept-encoding'] || '';
      const useGzip = compressible.has(ext) && acceptEncoding.includes('gzip');

      const headers = {
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        ETag: etag,
        'Cache-Control': cacheControl,
      };

      if (useGzip) {
        headers['Content-Encoding'] = 'gzip';
        headers['Vary'] = 'Accept-Encoding';
      } else {
        headers['Content-Length'] = info.size;
      }

      res.writeHead(200, headers);
      if (req.method === 'HEAD') {
        res.end();
        return;
      }

      const stream = createReadStream(file);
      if (useGzip) {
        pipeline(stream, createGzip(), res, () => {});
      } else {
        pipeline(stream, res, () => {});
      }
    } catch {
      if (!res.headersSent) {
        res.writeHead(404);
        res.end('Not found');
      }
    }
  });
}

if (import.meta.main || process.argv[1] === import.meta.filename) {
  const server = createSimulatorServer();
  server.listen(4173, '0.0.0.0', () => {
    console.log('Lift Studio: http://localhost:4173');
    if (process.argv.includes('--open')) {
      const command =
        process.platform === 'win32' ? 'cmd.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
      const args =
        process.platform === 'win32'
          ? ['/c', 'start', '', 'http://localhost:4173']
          : ['http://localhost:4173'];
      const child = spawn(command, args, { detached: true, stdio: 'ignore' });
      child.on('error', () => {});
      child.unref();
    }
  });
  server.on('error', (error) => {
    console.error(
      error.code === 'EADDRINUSE'
        ? 'Port 4173 is in use. Close the existing simulator, or open http://localhost:4173.'
        : error.message
    );
    process.exitCode = 1;
  });
}
