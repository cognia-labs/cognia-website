# Cognia website

[![CI](https://github.com/cognia-labs/cognia-website/actions/workflows/ci.yml/badge.svg)](https://github.com/cognia-labs/cognia-website/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)

The bilingual Cognia product website, maintained and released independently by [Cognia Labs](https://github.com/cognia-labs). Next.js 16, React 19, TypeScript and Tailwind CSS 4 produce a static export in `out/`.

This repository owns the marketing site. The application, services, SDKs and documentation remain in [cognia-next](https://github.com/MaxQian888/cognia-next). Website history and original contributor attribution were retained; see [NOTICE](NOTICE).

## Quick start

Requirements: Node 26 and pnpm 11.18.0 (pinned by `packageManager`). With a Node installation that includes Corepack, run `corepack enable && corepack install`; otherwise install that pnpm version directly.

```sh
git clone https://github.com/cognia-labs/cognia-website.git
cd cognia-website
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:3002](http://localhost:3002). English uses unprefixed routes; Chinese uses `/zh`. You do not need a sibling Cognia checkout, a GitHub token or deployment secrets. Development and builds read committed product evidence and media.

```sh
pnpm lint
pnpm typecheck
pnpm test:scripts
pnpm test
pnpm build
pnpm start
# One-time browser setup, then production-browser checks:
pnpm exec playwright install chromium
pnpm test:e2e
```

`pnpm start` / `pnpm preview` serves `out/` at port 3002, including clean URLs, `/en` redirects, 404s and video range requests. Use `PORT=8080 pnpm start` to change the port. Rebuild after changing source or public environment values. `next start` does not serve this static-export application.

## Configuration and deployment

Copy `.env.example` to `.env.local` only if you need overrides. Public origins are embedded during build:

| Variable                    | Development default     | Deployment value                       |
| --------------------------- | ----------------------- | -------------------------------------- |
| `NEXT_PUBLIC_WEB_SITE_URL`  | `http://localhost:3002` | Your public HTTPS website origin       |
| `NEXT_PUBLIC_DOCS_SITE_URL` | `http://localhost:3001` | Your public HTTPS documentation origin |
| `CF_PAGES_URL`              | Unset                   | Optional Pages preview-origin fallback |

`pnpm deploy:check` rejects missing, localhost or malformed production origins. Never store secrets in `NEXT_PUBLIC_*` variables. For deployments use shell/CI environment values; `.env.local` is read by Next.js but not by the standalone deployment validator.

Deploy only the `out/` directory to a static host, or build the included container. The manual GitHub Actions workflow publishes to Cloudflare Pages after repository variables and a scoped API token are configured. See [deployment instructions](docs/deployment.md), including the configuration table and container smoke check. No production domain or cloud credentials are assumed by this repository.

## Repository map

| Path                             | Responsibility                                                        |
| -------------------------------- | --------------------------------------------------------------------- |
| `app/`                           | Static routes, layout, metadata and styles                            |
| `components/`, `hooks/`, `lib/`  | Website UI and behavior with co-located tests                         |
| `content/en.ts`, `content/zh.ts` | Typed English and Chinese copy                                        |
| `content/generated/`             | Versioned product evidence, source contracts and asset manifests      |
| `public/`                        | Fonts, icons, social cards, product captures, video and Pages headers |
| `scripts/`                       | Evidence refresh, asset generation and static preview tooling         |
| `video/`                         | Optional product-film composition project                             |
| `e2e/`                           | Standalone browser acceptance checks against the production export    |
| `.github/`                       | CI, deployment, evidence refresh and contribution templates           |

`pnpm check` runs lint, typecheck, both test suites and build. `pnpm format:check` checks formatting. CI also runs production browser checks and builds/smoke-tests the deployment container.

## Product evidence and media

Normal builds never fetch GitHub or traverse another repository. `content/generated/evidence.json` contains the release/repository/changelog snapshot; `product-source.json` records the product revision, capture time, working-tree state and SHA-256 hashes for the source-contract excerpts used by tests. Existing evidence labels and fallback behavior are retained. Website assertions are checked against that pinned product revision, not an implicit live checkout.

To deliberately refresh product facts, use a separate product clone, then review and commit the generated diff:

```sh
pnpm product:export --source-root /absolute/path/to/cognia-next
pnpm evidence:update
pnpm check
```

`evidence:update` makes bounded GitHub API requests; optional `GITHUB_TOKEN`/`GH_TOKEN` raises the rate limit. On failure it retains prior network values and records errors. The manual refresh workflow creates a reviewable update branch; it does not publish changes automatically. See [maintenance and provenance](docs/maintenance.md) for snapshots, screenshots, icons and optional film rendering.

## Contributing and license

Read [CONTRIBUTING](CONTRIBUTING.md), [Code of Conduct](CODE_OF_CONDUCT.md), [Security](SECURITY.md) and [Support](SUPPORT.md). The inherited [AGPL license](LICENSE) and third-party rights remain applicable.

## 中文说明

这是 Cognia 官网的独立仓库，可独立安装、开发、测试、构建和部署。产品应用、服务、SDK 和 Fumadocs 文档仍在 [cognia-next](https://github.com/MaxQian888/cognia-next)。原官网的 Git 历史和贡献署名已保留。

使用 Node 26、pnpm 11.18.0，克隆后运行 `pnpm install --frozen-lockfile` 和 `pnpm dev`，访问 `http://localhost:3002`。英文路由不带语言前缀，中文为 `/zh`。运行 `pnpm build && pnpm start` 可预览真正的静态部署产物；构建不依赖主仓库或 GitHub 网络请求。

部署前明确配置官网与文档的 HTTPS 地址，再运行 `pnpm deploy:check`。静态产物是 `out/`；Cloudflare Pages、GitHub Actions 与 Docker 的完整步骤见[部署说明](docs/deployment.md)。本仓库不预设已经存在的生产域名或部署凭据。产品信息通过可追溯的版本快照维护，只有主动刷新时才需要读取单独的产品克隆；详见[维护说明](docs/maintenance.md)。

Full-mode PR CI preserves the inherited 90% lines, branches, functions and statements thresholds for each changed authored file in `components/`, `hooks/` and `lib/` (vendored `components/ui/` excluded). Shared dependency/test/tooling changes select full mode; the `ci:full` PR label or the CI workflow's `full_validation` input also enables it. Ordinary local checks do not collect coverage. To explicitly run this check locally, set `COVERAGE_BASE_SHA` to a full Git base SHA and `COVERAGE_FULL=true`, then run `pnpm coverage:changed`.

Pages redirects are generated by `postbuild` from the canonical origin in `out/index.html`, including `.env.local` or Pages preview values already resolved by Next.js. Pages targets always use a fixed HTTPS origin; in development that host-specific file promotes the built canonical origin to HTTPS. Doubled or encoded slashes cannot redirect to another host. Use `pnpm start` for local HTTP routing, or build with your public HTTPS origin before using the Pages-specific preview. Serve the complete output of `pnpm build`, including `out/_redirects`; do not copy an older redirects file over it. `pnpm preview:pages` runs the actual Pages runtime at port 8788; `node scripts/check-pages-preview.mjs` checks its routes and redirect safety while it is running.
