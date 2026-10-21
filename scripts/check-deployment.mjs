#!/usr/bin/env node
/** Reject deployment metadata that would publish localhost canonical or documentation links. */
export function checkDeployment(env) {
  for (const key of ["NEXT_PUBLIC_WEB_SITE_URL", "NEXT_PUBLIC_DOCS_SITE_URL"]) {
    let url
    try {
      url = new URL(env[key])
    } catch {
      throw new Error(`${key} must be an absolute HTTPS URL`)
    }
    if (
      url.protocol !== "https:" ||
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      throw new Error(
        `${key} must be a public HTTPS origin without credentials, path, query, or fragment`
      )
  }
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  checkDeployment(process.env)
  console.log("[deploy] public site and docs origins validated")
}
