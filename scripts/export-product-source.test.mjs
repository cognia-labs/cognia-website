import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import test from "node:test"
import { exportProductSource, SOURCE_FILES } from "./export-product-source.mjs"
const snapshot = JSON.parse(
  readFileSync(new URL("../content/generated/product-source.json", import.meta.url), "utf8")
)
test("product source contracts carry a revision and verifiable hashes", () => {
  assert.equal(snapshot.schemaVersion, 1)
  assert.match(snapshot.provenance.commit, /^[a-f0-9]{40}$/)
  assert.equal(snapshot.inventory.connectors, snapshot.connectorAdapters.length)
  assert.deepEqual(Object.keys(snapshot.sourceFiles), SOURCE_FILES)
  for (const path of SOURCE_FILES)
    assert.equal(
      createHash("sha256").update(snapshot.sourceFiles[path]).digest("hex"),
      snapshot.provenance.sourceSha256[path]
    )
})
test("exporting a website checkout fails rather than overwriting product facts with zeros", () => {
  assert.throws(() => exportProductSource(fileURLToPath(new URL("..", import.meta.url))), /ENOENT/)
})
