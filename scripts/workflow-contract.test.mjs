import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { parse } from "yaml"

const workflow = (file) =>
  parse(readFileSync(new URL(`../.github/workflows/${file}`, import.meta.url), "utf8"))

test("deployment exposes staging/production and executes environment preflight before publishing", () => {
  const deploy = workflow("deploy.yml")
  assert.deepEqual(deploy.on.workflow_dispatch.inputs.environment.options, [
    "staging",
    "production",
  ])
  assert.equal(deploy.on.workflow_dispatch.inputs.environment.default, "staging")
  assert.equal(deploy.on.workflow_dispatch.inputs.dry_run.default, false)
  assert.equal(deploy.jobs.deploy.environment, "${{ inputs.environment }}")
  assert.match(deploy.concurrency.group, /inputs.environment/)
  const steps = deploy.jobs.deploy.steps
  const prepare = steps.findIndex((step) => step.run === "node scripts/prepare-deployment.mjs")
  const publish = steps.findIndex((step) => step.name === "Publish static export to Pages")
  assert.ok(prepare >= 0 && publish > prepare)
  assert.equal(steps[publish].if, "inputs.dry_run != true")
  assert.match(steps[publish].run, /--branch "\$PAGES_BRANCH"/)
  assert.equal(steps[publish].env.PAGES_BRANCH, "${{ steps.prepare.outputs.pages_branch }}")
  assert.match(deploy["run-name"], /inputs.environment/)
  assert.match(deploy["run-name"], /inputs.dry_run/)
})

test("evidence verification preserves reviewed write boundaries and exports an auditable artifact", () => {
  const refresh = workflow("refresh-evidence.yml")
  assert.equal(refresh.on.workflow_dispatch.inputs.verify_only.default, false)
  const steps = refresh.jobs.refresh.steps
  const product = steps.find((step) => step.name === "Read the product from an explicit checkout")
  assert.equal(product.with.repository, "MaxQian888/cognia-next")
  assert.equal(product.with.ref, "dev")
  assert.equal(product.with["persist-credentials"], false)
  const update = steps.find((step) => step.name === "Create a reviewable snapshot update")
  assert.equal(update.if, "inputs.verify_only != true")
  assert.match(refresh.jobs.refresh.if, /refs\/heads\/main/)
  assert.match(refresh.jobs.refresh.if, /inputs.verify_only/)
  assert.ok(
    steps.some(
      (step) =>
        step.uses?.startsWith("actions/upload-artifact@") &&
        /refreshed-evidence/.test(step.with.name)
    )
  )

  test("CI emits the JUnit and Playwright artifacts consumed by Feishu without collecting coverage", () => {
    const ci = workflow("ci.yml")
    assert.equal(ci.jobs.website.env.WEBSITE_CI_REPORTS, "true")
    assert.equal(ci.jobs.website.env.JEST_JUNIT_OUTPUT_NAME, "junit-shard-1.xml")
    for (const name of ["jest-shard-1", "playwright-json"])
      assert.ok(ci.jobs.website.steps.some((step) => step.with?.name === name))
    const job = ci.jobs["notification-preview"]
    const prepare = job.steps.find((step) => step.run?.endsWith("notify.mjs prepare"))
    assert.equal(prepare.env.DRY_RUN, "true")
    assert.doesNotMatch(JSON.stringify(job), /secrets\./)
    assert.ok(!job.steps.some((step) => /notify.mjs deliver/.test(step.run ?? "")))
  })
  assert.ok(steps.some((step) => /pnpm build/.test(step.run ?? "")))
})
