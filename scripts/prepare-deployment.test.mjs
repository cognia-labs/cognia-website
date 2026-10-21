import assert from "node:assert/strict"
import { test } from "node:test"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { prepareDeployment } from "./prepare-deployment.mjs"

const config = (overrides = {}) => ({
  DEPLOY_ENVIRONMENT: "staging",
  GITHUB_REF: "refs/heads/codex/test",
  NEXT_PUBLIC_WEB_SITE_URL: "https://staging.example.org",
  NEXT_PUBLIC_DOCS_SITE_URL: "https://docs.example.org",
  CF_PAGES_PROJECT: "cognia-site",
  CLOUDFLARE_ACCOUNT_ID: "account",
  CLOUDFLARE_API_TOKEN: "private-token",
  ...overrides,
})

test("staging and production map to separate Pages branches", () => {
  assert.equal(prepareDeployment(config()).branch, "staging")
  assert.equal(
    prepareDeployment(config({ DEPLOY_ENVIRONMENT: "production", GITHUB_REF: "refs/heads/main" }))
      .branch,
    "main"
  )
})

test("production rejects any source except main, even in dry-run", () => {
  assert.throws(() => prepareDeployment(config({ DEPLOY_ENVIRONMENT: "production" })), /main/)
  assert.throws(() => prepareDeployment(config({ DEPLOY_ENVIRONMENT: "unknown" })), /environment/)
})

test("missing cloud configuration is reported by name without exposing credentials", () => {
  const plan = prepareDeployment(config({ CLOUDFLARE_ACCOUNT_ID: "", CF_PAGES_PROJECT: "" }))
  assert.equal(plan.ready, false)
  assert.deepEqual(plan.missing, ["CF_PAGES_PROJECT", "CLOUDFLARE_ACCOUNT_ID"])
  assert.doesNotMatch(JSON.stringify(plan), /private-token/)
})

test("invalid public origins fail validation before upload", () => {
  assert.throws(
    () => prepareDeployment(config({ NEXT_PUBLIC_WEB_SITE_URL: "http://localhost:3002" })),
    /HTTPS/
  )
  const plan = prepareDeployment(config({ NEXT_PUBLIC_DOCS_SITE_URL: "" }))
  assert.deepEqual(plan.missing, ["NEXT_PUBLIC_DOCS_SITE_URL"])
  assert.equal(plan.ready, false)
})

test("the CLI reports missing configuration in dry-run and blocks real publication", () => {
  const script = fileURLToPath(new URL("./prepare-deployment.mjs", import.meta.url))
  const env = {
    PATH: process.env.PATH,
    DEPLOY_ENVIRONMENT: "staging",
    GITHUB_REF: "refs/heads/main",
  }
  const dry = spawnSync(process.execPath, [script], {
    env: { ...env, DRY_RUN: "true" },
    encoding: "utf8",
  })
  assert.equal(dry.status, 0)
  assert.match(dry.stdout, /Configuration: incomplete/)
  assert.match(dry.stdout, /No assets were uploaded/)
  assert.match(dry.stdout, /CLOUDFLARE_API_TOKEN/)
  const live = spawnSync(process.execPath, [script], { env, encoding: "utf8" })
  assert.equal(live.status, 1)
})
