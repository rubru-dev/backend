/**
 * load-leads.js — 50 VU Concurrent
 * Simulasi 50 BD/Sales staff akses leads bersamaan dengan berbagai filter.
 * Threshold: p95 < 500ms, p99 < 1000ms, error rate < 1%
 *
 * Jalankan: k6 run e2e-tests/k6/load-leads.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";
import { login, authHeaders } from "./shared/auth.js";
import { USERS } from "./shared/config.js";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000/api/v1";

export const options = {
  stages: [
    { duration: "30s", target: 50 }, // ramp up
    { duration: "2m",  target: 50 }, // steady load
    { duration: "15s", target: 0  }, // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"],
    http_req_failed:   ["rate<0.01"],
  },
};

const errorRate = new Rate("errors");
const leadsDuration = new Trend("leads_duration");

export function setup() {
  const token = login(USERS.bd.email, USERS.bd.password);
  return { token };
}

export default function (data) {
  const { token } = data;
  const headers = authHeaders(token);

  const rand = Math.random();
  let url;

  if (rand < 0.40) {
    const page = Math.floor(Math.random() * 50) + 1;
    url = `${BASE_URL}/bd/leads?page=${page}&limit=20`;
  } else if (rand < 0.60) {
    const statuses = ["Hot", "Medium", "Low"];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    url = `${BASE_URL}/bd/leads?status=${status}&page=1`;
  } else if (rand < 0.80) {
    const bulan = Math.floor(Math.random() * 12) + 1;
    url = `${BASE_URL}/bd/leads?bulan=${bulan}&tahun=2025&page=1`;
  } else if (rand < 0.90) {
    const num = String(Math.floor(Math.random() * 10000) + 1).padStart(5, "0");
    url = `${BASE_URL}/bd/leads?search=SEED_LEAD_${num}&page=1`;
  } else {
    url = `${BASE_URL}/bd/leads?status=Hot&bulan=3&tahun=2026`;
  }

  const res = http.get(url, headers);
  leadsDuration.add(res.timings.duration);

  const ok = check(res, {
    "status 200":        (r) => r.status === 200,
    "has items array":   (r) => {
      try { return Array.isArray(JSON.parse(r.body).items); } catch { return false; }
    },
    "duration < 1000ms": (r) => r.timings.duration < 1000,
  });

  errorRate.add(!ok);
  sleep(Math.random() * 1.5 + 0.5);
}
