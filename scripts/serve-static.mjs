#!/usr/bin/env node
/** Serve the production static export, including clean URLs, redirects and video ranges. */
import { createReadStream, existsSync, statSync } from "node:fs"
import { createServer } from "node:http"
import { dirname, extname, join, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".vtt": "text/vtt; charset=utf-8",
}
export function createStaticServer(directory) {
  const root = resolve(directory)
  return createServer((request, response) => {
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, { Allow: "GET, HEAD" })
      response.end()
      return
    }
    let url, pathname
    try {
      url = new URL(request.url, "http://localhost")
      pathname = decodeURIComponent(url.pathname)
    } catch {
      response.writeHead(400)
      response.end()
      return
    }
    const relative = pathname.replace(/^\/+/, "")
    const path = resolve(root, relative || "index.html")
    if (!path.startsWith(root + sep) || pathname.includes("\0")) {
      response.writeHead(403)
      response.end()
      return
    }
    if (pathname === "/en" || pathname.startsWith("/en/")) {
      response.writeHead(301, {
        Location: "/" + url.pathname.slice(3).replace(/^\/+/, "") + url.search,
      })
      response.end()
      return
    }
    let file = [path, path + ".html", join(path, "index.html")].find(
      (candidate) => existsSync(candidate) && statSync(candidate).isFile()
    )
    const status = file ? 200 : 404
    file ??= join(root, "404.html")
    if (!existsSync(file)) {
      response.writeHead(404)
      response.end("Not found")
      return
    }
    const size = statSync(file).size
    const headers = {
      "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control":
        status === 200 && (pathname.startsWith("/_next/static/") || pathname.startsWith("/video/"))
          ? "public, max-age=31536000, immutable"
          : "public, max-age=0, must-revalidate",
      "Accept-Ranges": "bytes",
    }
    let start = 0,
      end = size - 1,
      code = status
    if (request.headers.range && status === 200) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range)
      if (!range || (!range[1] && !range[2])) {
        response.writeHead(416, { "Content-Range": `bytes */${size}` })
        response.end()
        return
      }
      start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]))
      end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start > end ||
        start >= size
      ) {
        response.writeHead(416, { "Content-Range": `bytes */${size}` })
        response.end()
        return
      }
      code = 206
      headers["Content-Range"] = `bytes ${start}-${end}/${size}`
    }
    headers["Content-Length"] = code === 206 ? end - start + 1 : size
    response.writeHead(code, headers)
    if (request.method === "HEAD" || size === 0) response.end()
    else
      createReadStream(file, { start, end })
        .on("error", () => response.destroy())
        .pipe(response)
  })
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const args = process.argv.slice(2)
  const port = Number(process.env.PORT || (args[0] === "--port" ? args[1] : 3002))
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT must be between 1 and 65535")
  const root = join(dirname(fileURLToPath(import.meta.url)), "../out")
  if (!existsSync(join(root, "index.html")))
    throw new Error("Missing out/index.html; run pnpm build first")
  createStaticServer(root).listen(port, "0.0.0.0", () =>
    console.log(`[preview] http://localhost:${port}`)
  )
}
