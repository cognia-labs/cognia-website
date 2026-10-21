import assert from "node:assert/strict"
import test from "node:test"
import { canonicalOrigin, pagesRedirects } from "./build-hosting.mjs"
test("hosting metadata uses the built canonical origin, regardless of link attribute order", () => {
  assert.equal(
    canonicalOrigin('<link rel="canonical" href="https://website.example/">'),
    "https://website.example"
  )
  assert.equal(
    canonicalOrigin('<link href="http://localhost:3002" data-test="one" rel="canonical"/>'),
    "http://localhost:3002"
  )
})
test("missing or malformed canonicals fail rather than generating an unsafe deployment", () => {
  assert.throws(() => canonicalOrigin("<html></html>"), /Missing canonical/)
  assert.throws(
    () => canonicalOrigin('<link rel="canonical" href="javascript:alert(1)">'),
    /Invalid canonical/
  )
  assert.throws(() => pagesRedirects("https://website.example/path"), /Expected an HTTP/)
})
test("English wildcard destinations stay on the canonical host for arbitrary slash prefixes", () => {
  const rules = pagesRedirects("https://website.example")
  assert.match(rules, /^\/en https:\/\/website\.example\/ 301$/m)
  const target = rules
    .split("\n")
    .find((line) => line.startsWith("/en/* "))
    .split(" ")[1]
  for (const suffix of [
    "product",
    "/attacker.example",
    "//attacker.example",
    "%2F%2Fattacker.example",
    "@attacker.example",
  ])
    assert.equal(new URL(target.replace(":splat", suffix)).origin, "https://website.example")
})

test("HTTP development emits HTTPS targets accepted by Pages without unsafe relative wildcards", () => {
  const rules = pagesRedirects("http://localhost:3002")
  assert.match(rules, /^\/en https:\/\/localhost:3002\/ 301$/m)
  const target = rules
    .split("\n")
    .find((line) => line.startsWith("/en/* "))
    .split(" ")[1]
  for (const suffix of [
    "product",
    "/attacker.example",
    "//attacker.example",
    "%2F%2Fattacker.example",
  ])
    assert.equal(new URL(target.replace(":splat", suffix)).origin, "https://localhost:3002")
})
