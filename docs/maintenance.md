# Evidence, media and provenance

## Product snapshot contract

`pnpm product:export --source-root /absolute/path/to/cognia-next` is an explicit cross-repository operation. It reads the selected product clone, not a default sibling directory, and exports inventory, changesets with Git addition dates, adapter names, and seven source excerpts used by existing contract assertions. It rejects incomplete/non-product trees rather than emitting misleading zeros.

`content/generated/product-source.json` records schema version 1, source repository, HEAD commit, ISO capture time, working-tree dirty status, and SHA-256 hashes for each excerpt. Excerpts retain the product license. A dirty snapshot identifies its baseline and hashes but is not reproducible from that commit alone; review the original working-tree changes when refreshing. Prefer a clean product clone for routine refreshes. The initial extraction deliberately retained the product checkout's current facts and marks its dirty state honestly.

Tests still assert the CLI resume command, browser shortcut, workflow depth limit, plugin permissions and capture selectors. They now compare with this versioned snapshot. They cannot establish compatibility with a newer unexported product revision. Refresh the snapshot and run tests before recapturing new product media; the capture tools also wait for the actual selectors on the live product.

`pnpm evidence:update` reads that local snapshot and refreshes GitHub stars, contributors and releases using bounded requests. It retains previous values and records source errors if a fetch fails. `WEB_EVIDENCE_OFFLINE=1 pnpm evidence:update` explicitly keeps prior network facts. It never scans the website as if it were the product. Normal install/dev/test/build never runs this command or fetches GitHub.

The manual **Refresh product evidence** workflow checks out the product repository into an explicit temporary directory, exports/refreshes evidence, and pushes a review branch. Its job summary links to the comparison page, where a maintainer can review the diff and open a pull request. It does not require permission for Actions to create or approve PRs; the organization currently keeps that permission disabled. It needs no product dependencies or product build and never deploys automatically.

Run it on `main` to create an update branch, or set `verify_only=true` to validate without creating or pushing one. Verification may run from a feature ref. Both modes run script/unit/type/build checks and retain `product-source.json` and `evidence.json` in a `refreshed-evidence-<run-id>` artifact for 14 days. The summary requires a clean product revision, checks that both files refer to it, and reports whether network values were refreshed or retained. Review partial-network results before accepting an update.

```sh
gh workflow run refresh-evidence.yml --ref main -f verify_only=true
# Create a reviewable snapshot update after checking verification results:
gh workflow run refresh-evidence.yml --ref main -f verify_only=false
```

The GitHub `GITHUB_TOKEN` provided to the job is sufficient while the product repository remains public. No cross-repository PAT or product build is required. Product source access must be reconfigured if that repository becomes private. Workflow completion can be routed to Feishu through the [notification workflow](notifications.md).

## Website assets

The README visuals live in `assets/readme/`, separate from shipped website assets. `hero.svg` reuses the website palette and `components/brand-mark.tsx` geometry. The English and Chinese homepage PNGs were captured from the standalone production export at revision `34aafce184cf39694c4886c3b8fe3e14290edd65` on 2026-10-21, at 1440 × 1000. Their embedded application footage uses demo data. To refresh them, build the website, run the desktop homepage cases in `e2e/website.spec.ts`, inspect `desktop-en.png` / `desktop-zh.png` in the Playwright output, and copy the approved captures to `website-en.png` / `website-zh.png` in that directory. Keep commands and operational instructions in Markdown, outside the SVG.

- `pnpm cjk-words`: generates the Chinese typography word list from local copy. Runs before dev/build.
- `pnpm agent-icons`: regenerates local icon data from the installed `@lobehub/icons-static-svg` package; provenance is recorded in the generated manifest.
- `node scripts/capture-og.mjs --base-url http://localhost:3002`: captures website OG cards from a running website origin.
- `pnpm capture --base-url http://localhost:4173`: captures a deliberately staged live Cognia product, not this website. Product installation/startup is external and only needed for this optional authoring task. Review the script's flags; never capture personal sessions.
- `pnpm record`: optional product footage capture with Playwright, a running staged product, and ffmpeg.
- `pnpm render`: optional HyperFrames/ffmpeg rendering from existing recordings. The composition CLI version is pinned in `scripts/render-video.mjs` and `video/package.json`. Existing published films remain usable without these tools. See `video/STORYBOARD.md` and the scripts for inputs and budgets.

The static export includes committed captures/films and local fonts, so ordinary builds require no image, video, font-host or product-runtime network access. New media should preserve manifest provenance, captions, reduced-motion behavior, content hashes, caching policy and file-size budgets.

## Extraction record

The website's Git history was extracted with `git subtree split --prefix=web` from product commit `0d138eefc6f1d3535ffd57db71a898e540e3686f` on 2026-10-21. The extracted tip is `dcb5b8dbc700033b4d71c62436333a47aac35cb3`. The current uncommitted website package/Next config changes were included; product source was otherwise retained in its original checkout until the cleanup change is reviewed.

The standalone package owns its lockfile, TypeScript, Jest, ESLint, formatting, static preview, CI and deploy configuration. Product-source excerpts are data, not imported runtime modules or hidden workspace dependencies.

## 中文

官网的日常安装、开发、测试、构建不需要主仓库或 GitHub API。产品事实和用于测试的源码摘录是带版本、时间、脏工作区标记和哈希的快照。只有主动运行导出或刷新工作流时，才读取显式指定的产品克隆和 GitHub API。更新后先审查生成文件，再运行全部检查；快照只证明对应版本，不能代表尚未同步的产品新版本。截图和录像也只在主动制作素材时需要运行中的产品。
