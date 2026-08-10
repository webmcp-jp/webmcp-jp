#!/usr/bin/env node
/**
 * Zero-dependency static server for the contact-form sample.
 * Usage: npm start
 * Opens http://127.0.0.1:4173/examples/contact-form/
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function safeJoin(base, requestPath) {
  const decoded = decodeURIComponent((requestPath || "/").split("?")[0]);
  // path.join ignores previous segments if a later segment is absolute.
  // Strip leading separators so the request always stays under base.
  const relative = path
    .normalize(decoded)
    .replace(/^(\.\.(\/|\\|$))+/, "")
    .replace(/^[/\\]+/, "");
  const candidate = path.resolve(base, relative || ".");
  const rootWithSep = base.endsWith(path.sep) ? base : base + path.sep;
  if (candidate !== base && !candidate.startsWith(rootWithSep)) return null;
  return candidate;
}

const server = http.createServer((req, res) => {
  const urlPath = req.url === "/" ? "/examples/contact-form/" : req.url || "/";
  let filePath = safeJoin(root, urlPath);
  if (!filePath) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad request");
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const ext = path.extname(filePath);
  const type = TYPES[ext] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": type,
    "Cache-Control": "no-store",
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, host, () => {
  const url = `http://${host}:${port}/examples/contact-form/`;
  console.log(`webmcp-jp sample server`);
  console.log(`  ${url}`);
  console.log(`  root: ${root}`);
  console.log(`  stop: Ctrl+C`);
});
