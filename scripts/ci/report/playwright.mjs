#!/usr/bin/env node
/**
 * Summarize failures, retries and durations from one Playwright JSON artifact.
 * These are single-run observations; no cross-run performance trend is inferred.
 */

/**
 * Flatten the nested suite tree into one test record per spec/test. Pure.
 *
 * @param {object} report parsed JSON reporter output
 * @returns {Array<{ file: string, title: string, project: string, status: string, firstAttemptStatus: string, attempts: number, duration: number, error: string }>}
 */
export function flattenTests(report) {
  const out = []

  const visitSuite = (suite, trail) => {
    const path = suite.title ? [...trail, suite.title] : trail
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const results = test.results ?? []
        const last = results[results.length - 1]
        out.push({
          file: spec.file ?? suite.file ?? "",
          title: [...path, spec.title].filter(Boolean).join(" › "),
          project: test.projectName ?? test.projectId ?? "",
          status: test.status ?? last?.status ?? "unknown",
          firstAttemptStatus: results[0]?.status ?? "unknown",
          attempts: results.length,
          duration: results.reduce((n, r) => n + (r.duration ?? 0), 0),
          error: last?.error?.message ?? "",
        })
      }
    }
    for (const child of suite.suites ?? []) visitSuite(child, path)
  }

  for (const suite of report?.suites ?? []) visitSuite(suite, [])
  return out
}

/**
 * A test is flaky when it needed more than one attempt but ended up green.
 * Pure.
 *
 * Playwright's own `status: "flaky"` is trusted when present; the attempt
 * analysis is the fallback for reporter versions that omit it.
 */
export function isFlaky(test) {
  if (test.status === "flaky") return true
  return test.attempts > 1 && (test.status === "expected" || test.status === "passed")
}

/** Pure. */
export function isFailure(test) {
  return test.status === "unexpected" || test.status === "failed" || test.status === "timedOut"
}

/**
 * Summarize a merged Playwright report. Pure.
 *
 * @param {object} report
 * @param {{ slowest?: number }} [options]
 */
/**
 * The three health metrics over an arbitrary set of tests. Pure.
 *
 * Shared by `summarizePlaywright` (whole run) and `diffPlaywright` (the slice
 * two runs have in common) so a trend is never computed a second, subtly
 * different way from the headline it sits under.
 */
function metricsFor(tests) {
  const percentage = (count) =>
    tests.length === 0 ? null : Number(((count / tests.length) * 100).toFixed(2))
  const durations = tests.map((test) => test.duration).sort((a, b) => a - b)
  return {
    firstPassRate: percentage(tests.filter((test) => test.firstAttemptStatus === "passed").length),
    flakyRate: percentage(tests.filter(isFlaky).length),
    p95Duration:
      durations.length === 0 ? 0 : durations[Math.max(0, Math.ceil(durations.length * 0.95) - 1)],
  }
}

export function summarizePlaywright(report, options = {}) {
  const slowestCount = options.slowest ?? 10
  const tests = flattenTests(report)
  return {
    total: tests.length,
    failed: tests.filter(isFailure),
    flaky: tests.filter(isFlaky),
    skipped: tests.filter((t) => t.status === "skipped").length,
    ...metricsFor(tests),
    slowest: [...tests].sort((a, b) => b.duration - a.duration).slice(0, slowestCount),
    /** Per-test detail, so a trend can be restricted to the shared slice. */
    tests,
  }
}
