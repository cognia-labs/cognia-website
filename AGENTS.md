# Cognia website

This standalone repository owns the Cognia marketing website. Product runtime code and documentation are maintained in [cognia-next](https://github.com/MaxQian888/cognia-next).

- Use Node 26 and the packageManager-pinned pnpm. Install from this root with `pnpm install --frozen-lockfile`.
- Preserve the Next.js static export (`out/`); read the installed Next.js guides before changing framework behavior. No runtime Next server, parent config, workspace dependency, or sibling checkout may be required by install/dev/test/build/deploy.
- Keep `@web/*` imports local. English and Chinese content live in `content/en.ts` and `content/zh.ts` and share `content/types.ts`.
- Co-locate meaningful tests for source changes. Use Jest/RTL for TypeScript, Node's runner for scripts, and Playwright for browser flows. Do not run coverage unless requested.
- `content/generated/product-source.json` records product revision, working-tree status and source hashes. Product-facing assertions must use this versioned snapshot. Refresh intentionally via `pnpm product:export --source-root /path/to/cognia-next`; never introduce automatic checkout/network reads into normal builds.
- `pnpm check`, `pnpm format:check`, and `pnpm test:e2e` are the relevant acceptance checks. `pnpm start` serves the real static export.
- Preserve the AGPL license and extraction provenance in `NOTICE`. Never commit secrets or generated build outputs.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
