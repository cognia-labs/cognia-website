import assert from "node:assert/strict"
import test from "node:test"
import { checkDeployment } from "./check-deployment.mjs"
test("deployment requires explicit public HTTPS origins", () => {
  const env = {
    NEXT_PUBLIC_WEB_SITE_URL: "https://cognia.example",
    NEXT_PUBLIC_DOCS_SITE_URL: "https://docs.cognia.example",
  }
  assert.doesNotThrow(() => checkDeployment(env))
  for (const value of [
    undefined,
    "bad",
    "http://localhost:3002",
    "https://localhost",
    "https://site.example/path",
    "https://user:password@site.example",
    "https://site.example/?a=b",
  ])
    assert.throws(
      () => checkDeployment({ ...env, NEXT_PUBLIC_WEB_SITE_URL: value }),
      /NEXT_PUBLIC_WEB_SITE_URL/
    )
  assert.throws(
    () => checkDeployment({ ...env, NEXT_PUBLIC_DOCS_SITE_URL: undefined }),
    /NEXT_PUBLIC_DOCS_SITE_URL/
  )
})
