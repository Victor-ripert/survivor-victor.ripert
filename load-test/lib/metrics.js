import { check } from 'k6';
import { Trend } from 'k6/metrics';

/**
 * One `Trend` per route gives the end-of-run summary a separate median/p95
 * per route (`catalogue_duration`, `profile_detail_duration`,
 * `profile_videos_duration`) instead of only the blended `http_req_duration`
 * — exactly the per-route numbers the load-test report needs. Adding a
 * fourth route later means exporting one more `Trend` here and calling
 * `recordRequest` with it; nothing about the routes already wired changes.
 */
export function makeRouteTrend(name) {
  return new Trend(name, true);
}

/**
 * Records `res`'s duration against `trend` and asserts it returned
 * `expectedStatus`, tagging the check with `label` so a failure names the
 * route it happened on in the k6 summary. Returns whether the check passed,
 * so a caller can skip a request that depends on this one (no point fetching
 * a profile's videos if the profile fetch itself failed).
 */
export function recordRequest(trend, res, expectedStatus, label) {
  trend.add(res.timings.duration);
  return check(res, {
    [`${label}: status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
  });
}
