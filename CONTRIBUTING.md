# Contributing

Report website bugs and propose changes in [this repository](https://github.com/cognia-labs/cognia-website/issues). Product runtime bugs belong in [cognia-next](https://github.com/MaxQian888/cognia-next/issues).

1. Fork and clone the repository, select Node 26 (`nvm use`), and enable the packageManager-pinned pnpm (`corepack enable && corepack install`, or install `pnpm@11.18.0`).
2. Run `pnpm install --frozen-lockfile` and `pnpm dev`. No product checkout, GitHub token or deployment credentials are needed.
3. Work on a feature branch. Keep changes focused; add co-located tests for changed behavior and update both languages when editing copy.
4. Run `pnpm check`, `pnpm format:check`, then `pnpm exec playwright install chromium && pnpm test:e2e`.
5. Open a pull request with the problem, resulting behavior, actual validation results, and desktop/mobile screenshots for visual changes.

Use Conventional Commits. Preserve source provenance and the license. Generated evidence, icons, screenshots and films should be updated using their documented commands, with their inputs recorded. See [maintenance](docs/maintenance.md).

## 中文

官网问题和贡献在本仓库处理，产品运行时问题提交到 cognia-next。使用 Node 26 和 pnpm 11.18.0，在独立克隆中安装依赖即可开发。修改文案时同步英文和中文；修改行为时补充同目录测试。提交 PR 前运行上述检查，说明实际验证结果，视觉修改附桌面和移动端截图。不要提交密钥或构建产物。

Full-mode PR CI preserves the inherited 90% lines, branches, functions and statements thresholds for each changed authored file in `components/`, `hooks/` and `lib/` (vendored `components/ui/` excluded). Shared dependency/test/tooling changes select full mode; the `ci:full` PR label or the CI workflow's `full_validation` input also enables it. Ordinary local checks do not collect coverage. To explicitly run this check locally, set `COVERAGE_BASE_SHA` to a full Git base SHA and `COVERAGE_FULL=true`, then run `pnpm coverage:changed`.
