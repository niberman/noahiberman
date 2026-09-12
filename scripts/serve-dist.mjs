#!/usr/bin/env node
/**
 * Static server for dist/ with Vercel-like resolution so local QA matches
 * production: exact file, then <path>/index.html, then the SPA fallback.
 * Supports Range for video. Local tooling only.
 */
import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), "dist");
const port = Number(process.env.PORT || 4919);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".xml": "application/xml",
  ".txt": "text/plain",
  ".woff2": "font/woff2",
  ".csv": "text/csv",
};

http
  .createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = path.normalize(path.join(root, url));
    if (!file.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!existsSync(file)) {
      const withIndex = path.join(root, url, "index.html");
      file = existsSync(withIndex) ? withIndex : path.join(root, "index.html");
    }
    const type = TYPES[path.extname(file)] || "application/octet-stream";
    const size = statSync(file).size;
    const range = req.headers.range?.match(/bytes=(\d+)-(\d*)/);
    if (range) {
      const start = Number(range[1]);
      const end = range[2] ? Number(range[2]) : size - 1;
      res.writeHead(206, {
        "Content-Type": type,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
      });
      createReadStream(file, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { "Content-Type": type, "Content-Length": size, "Accept-Ranges": "bytes" });
      createReadStream(file).pipe(res);
    }
  })
  .listen(port, () => console.log(`serve-dist on http://localhost:${port}`));
