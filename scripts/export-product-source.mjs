#!/usr/bin/env node
/** Explicit product-to-website export. Never runs during install, dev, test, or build. */
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { collectInventory, INVENTORY_KEYS } from "./build-inventory.mjs"
import { parseChangeset } from "./build-evidence.mjs"

export const SOURCE_FILES = [
  "components/chat/chat-view.tsx",
  "components/artifacts/artifact-workspace-dock.tsx",
  "components/chat/conversation-jump-pill.tsx",
  "cli/src/cli/args.ts",
  "browser-extension/wxt.config.ts",
  "lib/workflow/nodes/shared/executor-support.ts",
  "plugins/web-tools/plugin.json",
]

export function exportProductSource(root) {
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim()
  const commit = git("rev-parse", "HEAD")
  // Reject a website checkout or incomplete source tree instead of publishing zeros.
  const sourceFiles = Object.fromEntries(
    SOURCE_FILES.map((path) => [path, readFileSync(join(root, path), "utf8")])
  )
  const inventory = collectInventory(root)
  for (const key of INVENTORY_KEYS) {
    if (!Number.isInteger(inventory[key]) || inventory[key] <= 0)
      throw new Error(`Missing product inventory: ${key}`)
  }
  const dates = new Map()
  let date = null
  for (const line of git(
    "log",
    "--diff-filter=A",
    "--format=DATE:%aI",
    "--name-only",
    "--",
    ".changeset"
  ).split("\n")) {
    if (line.startsWith("DATE:")) date = line.slice(5)
    else if (line.startsWith(".changeset/") && !dates.has(line)) dates.set(line, date)
  }
  const changesets = readdirSync(join(root, ".changeset"))
    .sort()
    .filter((name) => name.endsWith(".md") && name.toLowerCase() !== "readme.md")
    .flatMap((name) => {
      const parsed = parseChangeset(
        name.replace(/\.md$/, ""),
        readFileSync(join(root, ".changeset", name), "utf8")
      )
      return parsed ? [{ ...parsed, date: dates.get(`.changeset/${name}`) ?? null }] : []
    })
  const connectorAdapters = readdirSync(join(root, "lib/connectors/adapters"), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .sort()
  return {
    schemaVersion: 1,
    provenance: {
      repository: "https://github.com/MaxQian888/cognia-next",
      commit,
      capturedAt: new Date().toISOString(),
      workingTreeDirty: git("status", "--porcelain").length > 0,
      sourceSha256: Object.fromEntries(
        Object.entries(sourceFiles).map(([path, source]) => [
          path,
          createHash("sha256").update(source).digest("hex"),
        ])
      ),
    },
    inventory,
    changesets,
    connectorAdapters,
    sourceFiles,
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const args = process.argv.slice(2)
  if (args.length !== 2 || args[0] !== "--source-root")
    throw new Error("Usage: pnpm product:export --source-root /path/to/cognia-next")
  const snapshot = exportProductSource(resolve(args[1]))
  const output = join(
    dirname(fileURLToPath(import.meta.url)),
    "../content/generated/product-source.json"
  )
  mkdirSync(dirname(output), { recursive: true })
  writeFileSync(output, `${JSON.stringify(snapshot, null, 2)}\n`)
  console.log(
    `[product-source] ${snapshot.provenance.commit}: ${snapshot.connectorAdapters.length} adapters, ${snapshot.changesets.length} changesets${snapshot.provenance.workingTreeDirty ? " (working tree includes local edits; source hashes recorded)" : ""}`
  )
}
