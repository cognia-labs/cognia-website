#!/usr/bin/env node
/** Exercise the actual Pages redirect engine, not just the template generator. */
import { readFileSync } from "node:fs"
import { canonicalOrigin } from "./build-hosting.mjs"
const origin = canonicalOrigin(readFileSync(new URL("../out/index.html", import.meta.url), "utf8"))
const base = "http://127.0.0.1:8788"
const expected = new URL(origin)
expected.protocol = "https:"
const redirectOrigin = expected.origin
for (let attempt = 0; ; attempt++) {
  try {
    const response = await fetch(base)
    if (response.ok) break
  } catch {
    /* Wait for the local worker to bind. */
  }
  if (attempt >= 29) throw new Error("Pages preview did not start")
  await new Promise((resolve) => setTimeout(resolve, 1000))
}
for (const route of [
  "/en",
  "/en/product",
  "/en//attacker.example",
  "/en///attacker.example",
  "/en/%2F%2Fattacker.example",
]) {
  const response = await fetch(base + route, { redirect: "manual" })
  const location = response.headers.get("location")
  if (response.status !== 301 || !location || new URL(location, base).origin !== redirectOrigin)
    throw new Error(`Unsafe or missing Pages redirect: ${route}: ${response.status} ${location}`)
}
for (const [route, status] of [
  ["/zh/product", 200],
  ["/missing-page", 404],
]) {
  const response = await fetch(base + route)
  if (response.status !== status)
    throw new Error(`Unexpected Pages status: ${route}: ${response.status}`)
}
console.log("[pages] canonical redirects, slash-injection regressions, locale route and 404 passed")
