import assert from "node:assert/strict"
import { test } from "node:test"
import { normalizeRun, decide, sameScope, selectDestination, stateKey } from "./policy.mjs"

const run = (overrides = {}) => ({
  id: 42,
  run_attempt: 1,
  workflow_id: 7,
  name: "CI/CD Pipeline",
  path: ".github/workflows/ci.yml",
  head_branch: "dev",
  head_sha: "a".repeat(40),
  head_repository: { full_name: "owner/repo" },
  repository: { full_name: "owner/repo" },
  event: "push",
  status: "completed",
  conclusion: "failure",
  html_url: "https://github.com/owner/repo/actions/runs/42",
  run_started_at: "2026-10-03T01:00:00Z",
  updated_at: "2026-10-03T01:03:00Z",
  ...overrides,
})

test("source failure survives an empty job list and reporting success", () => {
  const result = normalizeRun(run(), [])
  assert.equal(result.status, "failure")
  assert.equal(result.route, "ci")
  assert.equal(decide(result).send, true)
})

test("green deployment with every target skipped is not a deployment success", () => {
  const result = normalizeRun(
    run({ path: ".github/workflows/deploy.yml", conclusion: "success" }),
    [
      { name: "Gate (production)", conclusion: "success" },
      { name: "Pages — website", conclusion: "skipped" },
    ]
  )
  assert.equal(result.status, "not-deployed")
  assert.equal(decide(result).send, false)
})

test("recovery is reported and repeated failures need accepted evidence", () => {
  const failed = normalizeRun(run(), [])
  const success = normalizeRun(run({ conclusion: "success" }), [])
  assert.equal(decide(success, { previous: failed }).reason, "recovered")
  assert.equal(decide(failed, { previous: failed }).send, true)
  assert.equal(decide(failed, { previous: failed, previousAccepted: true }).send, false)
  assert.equal(decide(success, { previous: failed, mode: "failures" }).send, false)
})

test("fork branches do not share recovery state", () => {
  assert.equal(sameScope(run(), run({ head_repository: { full_name: "fork/repo" } })), false)
  assert.equal(sameScope(run(), run({ event: "pull_request" })), false)
})

test("staging and production, dry-run and upload do not share recovery state", () => {
  const deployment = run({
    path: ".github/workflows/deploy.yml",
    display_title: "Deploy website / staging / publish",
  })
  assert.equal(
    sameScope(deployment, {
      ...deployment,
      display_title: "Deploy website / production / publish",
    }),
    false
  )
  assert.equal(
    sameScope(deployment, { ...deployment, display_title: "Deploy website / staging / dry-run" }),
    false
  )
})

test("a deployment dry-run is not reported as a successful upload", () => {
  const result = normalizeRun(
    run({ path: ".github/workflows/deploy.yml", conclusion: "success" }),
    [
      {
        name: "Pages — website (staging)",
        conclusion: "success",
        steps: [{ name: "Publish static export to Pages", conclusion: "skipped" }],
      },
    ]
  )
  assert.equal(result.status, "not-deployed")
  assert.equal(decide(result).send, false)
})

test("route credentials are an atomic pair and missing overrides use the default pair", () => {
  assert.deepEqual(
    selectDestination("ci", { FEISHU_WEBHOOK_URL: "default", FEISHU_SIGNING_SECRET: "s" }),
    { url: "default", secret: "s" }
  )
  assert.throws(
    () =>
      selectDestination("ci", { FEISHU_CI_WEBHOOK_URL: "override", FEISHU_SIGNING_SECRET: "s" }),
    /pair/
  )
})

test("reruns and destination changes have distinct stable delivery keys", () => {
  const source = normalizeRun(run(), [])
  const key = stateKey(source, "https://example.com/secret")
  assert.match(key, /^feishu-v1-[a-f0-9]{32}$/)
  assert.notEqual(
    key,
    stateKey(normalizeRun(run({ run_attempt: 2 }), []), "https://example.com/secret")
  )
  assert.notEqual(key, stateKey(source, "https://example.com/other"))
})

test("app-bot delivery binds receipts to the app and recipient without credentials", () => {
  const env = {
    FEISHU_TRANSPORT: "app",
    FEISHU_APP_ID: "cli_test",
    FEISHU_APP_SECRET: "private-app-secret",
    FEISHU_RECEIVE_ID_TYPE: "open_id",
    FEISHU_RECEIVE_ID: "ou_owner",
  }
  const destination = selectDestination("ci", env)
  assert.equal(destination.kind, "app")
  assert.equal(destination.appId, env.FEISHU_APP_ID)
  assert.equal(destination.receiveId, "ou_owner")
  assert.ok(!destination.identity.includes(env.FEISHU_APP_SECRET))
  assert.equal(
    destination.identity,
    selectDestination("ci", { ...env, FEISHU_APP_SECRET: "rotated" }).identity
  )
  assert.notEqual(
    destination.identity,
    selectDestination("ci", { ...env, FEISHU_RECEIVE_ID: "ou_other" }).identity
  )
  assert.throws(() => selectDestination("ci", { ...env, FEISHU_APP_SECRET: "" }), /app/)
  assert.throws(() => selectDestination("ci", { ...env, FEISHU_RECEIVE_ID_TYPE: "other" }), /app/)
})
