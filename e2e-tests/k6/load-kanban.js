/**
 * load-kanban.js — 30 VU Concurrent
 * Simulasi team BD, Sales Admin, Telemarketing buka kanban board bersamaan.
 * Threshold: p95 < 600ms, error rate < 1%
 *
 * Jalankan: k6 run e2e-tests/k6/load-kanban.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";
import { login, authHeaders } from "./shared/auth.js";
import { USERS } from "./shared/config.js";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000/api/v1";

export const options = {
  stages: [
    { duration: "20s", target: 30 }, // ramp up
    { duration: "90s", target: 30 }, // steady load
    { duration: "10s", target: 0  }, // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<600"],
    http_req_failed:   ["rate<0.01"],
  },
};

const errorRate = new Rate("errors");
const kanbanDuration = new Trend("kanban_duration");

export function setup() {
  const tokenBd    = login(USERS.bd.email, USERS.bd.password);
  const tokenAdmin = login(USERS.superAdmin.email, USERS.superAdmin.password);
  return { tokenBd, tokenAdmin };
}

export default function (data) {
  const BULAN = 3;
  const TAHUN = 2026;
  const rand = Math.random();

  let token, url;
  if (rand < 0.33) {
    token = data.tokenBd;
    url = `${BASE_URL}/bd/kanban/columns`;
  } else if (rand < 0.66) {
    token = data.tokenAdmin;
    url = `${BASE_URL}/sales-admin/kanban?bulan=${BULAN}&tahun=${TAHUN}`;
  } else {
    token = data.tokenAdmin;
    url = `${BASE_URL}/telemarketing/kanban?bulan=${BULAN}&tahun=${TAHUN}`;
  }

  const res = http.get(url, authHeaders(token));
  kanbanDuration.add(res.timings.duration);

  const ok = check(res, {
    "status 200":        (r) => r.status === 200,
    "body tidak kosong": (r) => r.body && r.body.length > 0,
    "duration < 1500ms": (r) => r.timings.duration < 1500,
  });

  errorRate.add(!ok);
  sleep(Math.random() * 1 + 0.5);
}
