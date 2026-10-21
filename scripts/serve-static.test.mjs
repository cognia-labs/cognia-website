import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { createStaticServer } from "./serve-static.mjs"

test("an exported site serves clean URLs, redirects, 404s, headers, HEAD and video ranges", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "website-server-"))
  mkdirSync(join(root, "zh"))
  mkdirSync(join(root, "video"))
  for (const [path, body] of Object.entries({
    "index.html": "home",
    "zh/tasks.html": "tasks",
    "404.html": "missing",
    "video/film.mp4": "0123456789",
  }))
    writeFileSync(join(root, path), body)
  const server = createStaticServer(root)
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve))
    rmSync(root, { recursive: true })
  })
  const base = `http://127.0.0.1:${server.address().port}`
  assert.equal(await (await fetch(base)).text(), "home")
  assert.equal(await (await fetch(`${base}/zh/tasks`)).text(), "tasks")
  const redirect = await fetch(`${base}/en/tasks?q=one`, { redirect: "manual" })
  assert.equal(redirect.status, 301)
  assert.equal(redirect.headers.get("location"), "/tasks?q=one")
  const doubleSlash = await fetch(`${base}/en//attacker.example`, { redirect: "manual" })
  assert.equal(doubleSlash.headers.get("location"), "/attacker.example")
  assert.equal((await fetch(`${base}/not-a-page`)).status, 404)
  assert.equal((await fetch(`${base}/%ZZ`)).status, 400)
  assert.equal((await fetch(`${base}/..%2Fsecret`)).status, 403)
  assert.equal((await fetch(base, { method: "POST" })).status, 405)
  const head = await fetch(`${base}/video/film.mp4`, { method: "HEAD" })
  assert.equal(head.headers.get("content-length"), "10")
  assert.equal(await head.text(), "")
  const video = await fetch(`${base}/video/film.mp4`, { headers: { Range: "bytes=2-5" } })
  assert.equal(video.status, 206)
  assert.equal(video.headers.get("content-range"), "bytes 2-5/10")
  assert.equal(await video.text(), "2345")
  assert.match(video.headers.get("cache-control"), /immutable/)
  assert.equal(
    await (await fetch(`${base}/video/film.mp4`, { headers: { Range: "bytes=-2" } })).text(),
    "89"
  )
  assert.equal(
    (await fetch(`${base}/video/film.mp4`, { headers: { Range: "bytes=12-20" } })).status,
    416
  )
})
