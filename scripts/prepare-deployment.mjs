#!/usr/bin/env node
import { appendFileSync } from "node:fs"
import { pathToFileURL } from "node:url"
import { resolve } from "node:path"
import { checkDeployment } from "./check-deployment.mjs"

const REQUIRED = [
  "NEXT_PUBLIC_WEB_SITE_URL",
  "NEXT_PUBLIC_DOCS_SITE_URL",
  "CF_PAGES_PROJECT",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
]

export function prepareDeployment(env) {
  const environment = env.DEPLOY_ENVIRONMENT
  if (!["staging", "production"].includes(environment))
    throw new Error("Unsupported deployment environment")
  if (environment === "production" && env.GITHUB_REF !== "refs/heads/main")
    throw new Error("Production deployments must use main")
  const missing = REQUIRED.filter((key) => !env[key]?.trim())
  if (!missing.some((key) => key.startsWith("NEXT_PUBLIC_"))) checkDeployment(env)
  return {
    environment,
    branch: environment === "production" ? "main" : "staging",
    ready: !missing.length,
    missing,
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const plan = prepareDeployment(process.env)
    const dryRun = process.env.DRY_RUN === "true"
    if (process.env.GITHUB_OUTPUT)
      appendFileSync(
        process.env.GITHUB_OUTPUT,
        `pages_branch=${plan.branch}\nready=${plan.ready}\n`
      )
    const report = `## Website deployment configuration\n\nEnvironment: ${plan.environment}\n\nPages branch: ${plan.branch}\n\nConfiguration: ${plan.ready ? "ready" : "incomplete"}\n\nMissing: ${plan.missing.join(", ") || "none"}\n\n${dryRun ? "Dry-run only. No assets were uploaded." : "Publishing requires all configuration above."}\n`
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report)
    console.log(report)
    if (!plan.ready && !dryRun) process.exitCode = 1
  } catch (error) {
    console.error(`[deploy] ${error.message}`)
    process.exitCode = 1
  }
}
