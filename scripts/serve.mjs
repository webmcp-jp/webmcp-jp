#!/usr/bin/env node
/**
 * Zero-dependency static server for the contact-form sample.
 * Usage: npm start
 * Opens http://127.0.0.1:4173/
 *
 * Serves files under examples/contact-form/ and the packaged SDK under /sdk/.
 * Does not expose the repository root, .git, or other paths.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const publicRoot = path.resolve(repoRoot, "examples", "contact-form");
const oneLineRoot = path.resolve(repoRoot, "examples", "one-line-sdk");
const sdkRoot = path.resolve(repoRoot, "src");
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

/**
 * Decode a request URL path. Returns null when percent-encoding is malformed.
 * @param {string | undefined} requestPath
 * @returns {string | null}
 */
export function decodeRequestPath(requestPath) {
  try {
    return decodeURIComponent((requestPath || "/").split("?")[0]);
  } catch {
    return null;
  }
}

/**
 * Reject path traversal, absolute segments, and any dotfile / dotdir segment.
 * @param {string} decodedPath
 * @returns {boolean}
 */
export function isUnsafeRequestPath(decodedPath) {
  if (!decodedPath.startsWith("/")) return true;
  // Reject null bytes and Windows drive / absolute absolute-ish forms.
  if (decodedPath.includes("\0")) return true;

  const segments = decodedPath.split(/[/\\]+/).filter(Boolean);
  for (const segment of segments) {
    if (segment === "." || segment === "..") return true;
    if (segment.startsWith(".")) return true;
  }
  return false;
}

/**
 * Map a decoded URL path onto a file under publicRoot.
 * `/` and `/examples/contact-form[/...]` map into the sample directory.
 * Returns null when the request is outside the allowlist.
 * @param {string} publicBase
 * @param {string} decodedPath
 * @returns {string | null}
 */
export function resolvePublicFile(publicBase, decodedPath) {
  if (isUnsafeRequestPath(decodedPath)) return null;

  let relative = decodedPath;
  if (relative === "/") {
    relative = "/index.html";
  } else if (
    relative === "/examples/contact-form" ||
    relative === "/examples/contact-form/"
  ) {
    relative = "/index.html";
  } else if (relative.startsWith("/examples/contact-form/")) {
    relative = relative.slice("/examples/contact-form".length);
  } else {
    // Only the sample tree is public. Keep the legacy sample URL working
    // by mapping `/examples/contact-form/*`, and map bare `/` + sample files.
    // Direct sample file paths (e.g. /app.js, /styles.css) are allowed.
    // Everything else (repo root, docs, results, package.json, .git) is denied.
    // relative stays as-is under publicBase.
  }

  // After mapping, still refuse any remaining parent / hidden segments.
  if (isUnsafeRequestPath(relative.startsWith("/") ? relative : `/${relative}`)) {
    return null;
  }

  const stripped = relative.replace(/^[/\\]+/, "");
  const candidate = path.resolve(publicBase, stripped || "index.html");
  const rootWithSep = publicBase.endsWith(path.sep)
    ? publicBase
    : publicBase + path.sep;
  if (candidate !== publicBase && !candidate.startsWith(rootWithSep)) {
    return null;
  }
  return candidate;
}

/**
 * Handle one HTTP request against the sample public root.
 * Exported for regression tests.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {string} [publicBase]
 */
export function handleRequest(req, res, publicBase = publicRoot) {
  const method = req.method || "GET";
  if (method !== "GET" && method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method not allowed");
    return;
  }

  const decoded = decodeRequestPath(req.url);
  if (decoded === null) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad request");
    return;
  }

  const isSdkRequest =
    decoded === "/sdk" ||
    decoded === "/sdk/" ||
    decoded.startsWith("/sdk/") ||
    decoded.startsWith("/src/") ||
    decoded.startsWith("/examples/src/");
  const isOneLineRequest =
    decoded === "/examples/one-line-sdk" ||
    decoded === "/examples/one-line-sdk/" ||
    decoded.startsWith("/examples/one-line-sdk/");
  const selectedRoot = isSdkRequest ? sdkRoot : isOneLineRequest ? oneLineRoot : publicBase;
  const selectedPath = isSdkRequest
    ? decoded === "/sdk" || decoded === "/sdk/"
      ? "/index.js"
      : decoded.startsWith("/examples/src/")
        ? decoded.slice("/examples/src".length)
        : decoded.startsWith("/src/")
          ? decoded.slice("/src".length)
          : decoded.slice("/sdk".length)
    : isOneLineRequest
      ? decoded === "/examples/one-line-sdk" || decoded === "/examples/one-line-sdk/"
        ? "/index.html"
        : decoded.slice("/examples/one-line-sdk".length)
    : decoded;
  let filePath = resolvePublicFile(selectedRoot, selectedPath);
  if (!filePath) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
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

  // Final guard: never leave the public root even if FS layout changes.
  const rootWithSep = selectedRoot.endsWith(path.sep)
    ? selectedRoot
    : selectedRoot + path.sep;
  if (filePath !== selectedRoot && !filePath.startsWith(rootWithSep)) {
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
  if (method === "HEAD") {
    res.end();
    return;
  }
  fs.createReadStream(filePath).pipe(res);
}

export function createServer(publicBase = publicRoot) {
  return http.createServer((req, res) => handleRequest(req, res, publicBase));
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  if (!fs.existsSync(publicRoot) || !fs.statSync(publicRoot).isDirectory()) {
    console.error(`public root missing: ${publicRoot}`);
    process.exit(1);
  }

  const server = createServer(publicRoot);
  server.listen(port, host, () => {
    console.log(`webmcp-jp sample server`);
    console.log(`  http://${host}:${port}/`);
    console.log(`  sample: http://${host}:${port}/examples/contact-form/`);
    console.log(`  public root: ${publicRoot}`);
    console.log(`  stop: Ctrl+C`);
  });
}
