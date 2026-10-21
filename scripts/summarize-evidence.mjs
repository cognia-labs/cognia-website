import { appendFileSync, readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"
import { resolve } from "node:path"

export function summarizeEvidence(snapshot, evidence) {
  const source = snapshot.provenance
  if (!/^[a-f0-9]{40}$/.test(source?.commit ?? "") || source.workingTreeDirty !== false)
    throw new Error("Evidence refresh must use a clean product revision")
  if (evidence.productSource?.commit !== source.commit)
    throw new Error("Evidence and source snapshot revisions do not match")
  return `## Refreshed product evidence\n\nProduct revision: ${source.commit}\n\nCaptured: ${source.capturedAt}\n\nSource checkout: clean\n\nNetwork source errors: ${evidence.errors.length}\n\n${evidence.errors.length ? "Some network values were retained from the previous snapshot; inspect the evidence artifact before accepting the update." : "All requested network sources refreshed successfully."}\n\nVerification only: ${process.env.VERIFY_ONLY === "true" ? "yes" : "no"}. This workflow does not deploy the website.\n`
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const json = (name) =>
    JSON.parse(readFileSync(new URL(`../content/generated/${name}.json`, import.meta.url), "utf8"))
  const report = summarizeEvidence(json("product-source"), json("evidence"))
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report)
  console.log(report)
}
