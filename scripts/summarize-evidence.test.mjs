import assert from "node:assert/strict"
import { test } from "node:test"
import { summarizeEvidence } from "./summarize-evidence.mjs"

const snapshot = {
  provenance: {
    commit: "a".repeat(40),
    workingTreeDirty: false,
    capturedAt: "2026-10-21T00:00:00Z",
  },
}
test("refresh summaries distinguish complete refreshes from retained network facts", () => {
  const evidence = { productSource: snapshot.provenance, errors: [] }
  assert.match(summarizeEvidence(snapshot, evidence), /All requested network sources refreshed/)
  assert.match(
    summarizeEvidence(snapshot, { ...evidence, errors: ["private upstream error"] }),
    /retained from the previous snapshot/
  )
  assert.doesNotMatch(
    summarizeEvidence(snapshot, { ...evidence, errors: ["private upstream error"] }),
    /private upstream error/
  )
})
test("refresh refuses dirty source or mismatched revisions", () => {
  assert.throws(
    () => summarizeEvidence({ provenance: { ...snapshot.provenance, workingTreeDirty: true } }, {}),
    /clean/
  )
  assert.throws(
    () => summarizeEvidence(snapshot, { productSource: { commit: "b".repeat(40) } }),
    /do not match/
  )
})
