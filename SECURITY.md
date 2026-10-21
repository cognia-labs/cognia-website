# Security policy

Security fixes target the current `main` branch of this website repository. Product runtime security reports belong to [Cognia's security policy](https://github.com/MaxQian888/cognia-next/security/policy).

Please [report a vulnerability privately](https://github.com/cognia-labs/cognia-website/security/advisories/new). Do not publish exploit details, credentials or personal information in public issues. Include the affected revision, reproduction steps, impact, and a minimal safe example. If private reporting is unavailable, contact [@MaxQian888](https://github.com/MaxQian888) to arrange a private channel; do not post the sensitive report publicly.

The website exports static files. Deployment credentials belong in GitHub environment/repository secrets. All `NEXT_PUBLIC_*` values are published in the browser bundle and must contain no secrets. Dependency updates and snapshots should be reviewed before deployment.

## 中文

本仓库安全修复面向当前 main 分支。请通过上方私密漏洞报告入口提交，不要在公开 Issue 中披露漏洞细节、个人信息或密钥。产品运行时漏洞请遵循 Cognia 主仓库安全政策。

## Tracked development dependency advisory

As of 2026-10-21, [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) reports no patched `sprintf-js` release. This repository receives `sprintf-js@1.0.3` through the development-only Jest → Istanbul → js-yaml → argparse dependency chain. The alert remains open for an upstream fix; it has not been dismissed. The production container copies only the static export and the built-in-Node static server, without this test toolchain.

The standalone lockfile also enforces patched `sharp >=0.35.5` and `undici >=7.29.1` within their compatible release lines. Re-check advisories when updating the toolchain; these version pins do not constitute a blanket security guarantee.
