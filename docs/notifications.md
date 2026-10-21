# Workflow notifications

The independent **Feishu Notifications** workflow observes completed **CI**, **Deploy website** and **Refresh product evidence** runs. It executes only the website repository's default-branch code. Pull-request content is treated as untrusted data; it is not checked out or evaluated by the notifier. Source CI and deployment conclusions are preserved if notification delivery fails.

## Configuration

Configure these at **repository level**, because notifications run outside deployment environments:

| Kind     | Name                    | Value                                                    |
| -------- | ----------------------- | -------------------------------------------------------- |
| Variable | `FEISHU_ENABLED`        | `true` to enable external delivery; disabled when absent |
| Variable | `FEISHU_MODE`           | `changes` (default), `failures`, or `all`                |
| Variable | `FEISHU_DAILY_DIGEST`   | `true` to enable the daily digest; disabled when absent  |
| Secret   | `FEISHU_WEBHOOK_URL`    | Feishu/Lark custom-bot webhook URL                       |
| Secret   | `FEISHU_SIGNING_SECRET` | The same bot's signing secret                            |

Both secrets are required as a pair. Optionally use `FEISHU_CI_WEBHOOK_URL` + `FEISHU_CI_SIGNING_SECRET` for CI and `FEISHU_OPS_WEBHOOK_URL` + `FEISHU_OPS_SIGNING_SECRET` for deployment/evidence updates. A route override must supply both values; otherwise the default pair is used. Webhook URLs are secrets and never belong in a public variable or committed file.

The daily digest runs at 01:17 UTC (09:17 Asia/Shanghai) and summarizes the previous UTC calendar day. Schedule delivery requires both `FEISHU_ENABLED=true` and `FEISHU_DAILY_DIGEST=true`. The workflow must be present on `main` for scheduled and `workflow_run` triggers to activate.

In `changes` mode, failures, recoveries and completed publications/snapshot updates are actionable. Routine successful CI is quiet. Repeated failures are suppressed only when an accepted delivery receipt exists. Staging and production, and configuration dry-runs and uploads, have separate recovery scopes. A successful deployment configuration check is `not-deployed`, not a publication success.

## Preview before enabling delivery

From Actions, run **Feishu Notifications** with `dry_run=true` (the default) and a completed source `run_id`. No webhook credentials are required. Omit `run_id` to preview the daily digest. The run uploads a Card JSON 2.0 payload, a local HTML approximation and redacted diagnostics; it never POSTs to Feishu or creates a delivery claim.

```sh
gh workflow run feishu-notify.yml --ref main -f run_id=COMPLETED_RUN_ID -f dry_run=true
```

For reviewing a migration branch before the notifier exists on `main`, the **CI** workflow offers the same secret-free preparation path:

```sh
gh workflow run ci.yml --ref YOUR_BRANCH -f notification_run_id=COMPLETED_RUN_ID
```

Its `feishu-dry-run-preview` artifact contains `preview.json`, `preview.html` and `diagnostic.json`. The CI preview job never has webhook secrets or a delivery step. Browser HTML previews approximate layout; actual Feishu rendering requires a configured destination.

Cards show real source conclusions, failed steps, commit/PR links and current-attempt artifact links. Test counts come from the source run's JUnit and Playwright JSON artifacts; missing reports are marked unavailable. No metrics are inferred from missing evidence, and notification cards do not assert public endpoint health.

## Delivery receipts and retries

Before an external POST, a durable claim artifact is persisted. An accepted response creates an accepted receipt, suppressing repeated delivery of that source run/attempt/destination. Claims and receipts are retained for 90 days; if repository retention settings shorten them below the required replay window, delivery fails closed. Previews and diagnostics are retained for 14 days. Keep receipts if deduplication matters.

Rate-limit responses may retry up to three attempts with bounded waits. A timeout, lost acknowledgement, malformed acknowledgement or server error can mean the card already reached the group, so it is recorded as `delivery-unknown` and never automatically retried. Check the destination group before manually selecting `resend_unknown=true`. Re-run with the same source run ID; do not blindly resend uncertain deliveries.

## 中文

飞书通知已独立接入 CI、官网发布和产品证据刷新三个工作流，只执行默认分支代码，不执行 PR 源码。通知失败不会改写原工作流结果。仓库级设置 `FEISHU_ENABLED=true`，并配置同一机器人的 `FEISHU_WEBHOOK_URL` 和 `FEISHU_SIGNING_SECRET`，即可启用签名发送；CI、运维可用上表的成对 Secret 单独分流。

默认 `changes` 模式只通知失败、恢复和完成的发布/快照更新，普通 CI 成功不打扰。部署 dry-run 不会上报为发布成功。日报需额外设置 `FEISHU_DAILY_DIGEST=true`，北京时间每天 09:17 汇总前一个 UTC 自然日。定时和自动通知在工作流合入 `main` 后生效。

先用 `dry_run=true` 生成卡片 JSON、HTML 预览和脱敏诊断，不需要飞书密钥，也不会发送。迁移分支可用 CI 的 `notification_run_id` 参数走相同预览路径。实际样式与送达需在配置目标群后验收。发送前保存 claim，成功后保存回执；网络结果不确定时不自动重发，应先核对群消息再使用 `resend_unknown=true`。

## Sources

- [GitHub: workflow_run events and security considerations](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run)
- [GitHub: artifact retention](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts)
- Adapted notifier provenance is recorded in [NOTICE](../NOTICE).
