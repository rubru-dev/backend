/**
 * load-sipil.js — 20 VU Concurrent
 * Simulasi project manager + lapangan akses data proyek dan stock opname.
 * Threshold: p95 < 800ms, p99 < 2000ms, error rate < 1%
 *
 * Jalankan: k6 run e2e-tests/k6/load-sipil.js
 * Dengan custom ID: k6 run -e SEED_PROYEK_ID=123 e2e-tests/k6/load-sipil.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";
import { login, authHeaders } from "./shared/auth.js";
import { USERS } from "./shared/config.js";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000/api/v1";

export const options = {
  stages: [
    { duration: "20s", target: 20 }, // ramp up
    { duration: "2m",  target: 20 }, // steady load
    { duration: "10s", target: 0  }, // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<800", "p(99)<2000"],
    http_req_failed:   ["rate<0.01"],
  },
};

const errorRate = new Rate("errors");
const sipilDuration = new Trend("sipil_logs_duration");

export function setup() {
  const token = login(USERS.superAdmin.email, USERS.superAdmin.password);
  const headers = authHeaders(token);

  // Auto-detect seed proyek atau gunakan env var
  let proyekId = __ENV.SEED_PROYEK_ID || null;
  if (!proyekId) {
    const res = http.get(`${BASE_URL}/sipil/projeks?search=SEED_SIPIL_PROYEK_LOAD_TEST`, headers);
    if (res.status === 200) {
      const body = JSON.parse(res.body);
      if (body.items && body.items.length > 0) {
        proyekId = String(body.items[0].id);
        console.log(`  ✓ Seed proyek ditemukan: ID=${proyekId}`);
      }
    }
  }
  if (!proyekId) {
    console.warn("⚠️  Seed proyek tidak ditemukan — load-sipil akan skip GET logs");
  }
  return { token, proyekId };
}

export default function (data) {
  const { token, proyekId } = data;
  const headers = authHeaders(token);
  const rand = Math.random();

  let url;
  if (rand < 0.50 && proyekId) {
    url = `${BASE_URL}/sipil/projeks/${proyekId}/stock-opname/logs?limit=100`;
  } else if (rand < 0.80) {
    url = `${BASE_URL}/sipil/projeks`;
  } else if (proyekId) {
    url = `${BASE_URL}/sipil/projeks/${proyekId}`;
  } else {
    url = `${BASE_URL}/sipil/projeks`;
  }

  const res = http.get(url, headers);
  sipilDuration.add(res.timings.duration);

  const ok = check(res, {
    "status 200":        (r) => r.status === 200,
    "body valid JSON":   (r) => { try { JSON.parse(r.body); return true; } catch { return false; } },
    "duration < 2000ms": (r) => r.timings.duration < 2000,
  });

  errorRate.add(!ok);
  sleep(Math.random() * 0.5 + 0.2);
}
