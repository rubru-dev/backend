/**
 * load-finance.js — 25 VU Concurrent
 * Finance team buka invoice list, reimburse, tukang absen bersamaan.
 * Threshold: p95 < 500ms, error rate < 1%
 *
 * Jalankan: k6 run e2e-tests/k6/load-finance.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";
import { login, authHeaders } from "./shared/auth.js";
import { USERS } from "./shared/config.js";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000/api/v1";

export const options = {
  stages: [
    { duration: "20s", target: 25 },
    { duration: "90s", target: 25 },
    { duration: "10s", target: 0  },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed:   ["rate<0.01"],
  },
};

const errorRate = new Rate("errors");
const financeDuration = new Trend("finance_duration");

export function setup() {
  const token = login(USERS.finance.email, USERS.finance.password);
  return { token };
}

export default function (data) {
  const headers = authHeaders(data.token);
  const rand = Math.random();
  let url;

  if (rand < 0.40) {
    url = `${BASE_URL}/finance/invoices`;
  } else if (rand < 0.70) {
    url = `${BASE_URL}/finance/reimburse`;
  } else if (rand < 0.90) {
    url = `${BASE_URL}/finance/adm-projek`;
  } else {
    url = `${BASE_URL}/finance/leads-dropdown`;
  }

  const res = http.get(url, headers);
  financeDuration.add(res.timings.duration);

  const ok = check(res, {
    "status 200":        (r) => r.status === 200,
    "body tidak kosong": (r) => r.body && r.body.length > 2,
    "duration < 1500ms": (r) => r.timings.duration < 1500,
  });

  errorRate.add(!ok);
  sleep(Math.random() * 1.5 + 0.5);
}
