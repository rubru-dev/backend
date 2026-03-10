/**
 * stress-test.js — Ramp Up Cari Breaking Point
 * Ramp up sampai 200 VU untuk cari di berapa VU sistem mulai degradasi.
 * Threshold longgar — kita observe, bukan strict pass/fail.
 *
 * Jalankan: k6 run e2e-tests/k6/stress-test.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";
import { login, authHeaders } from "./shared/auth.js";
import { USERS } from "./shared/config.js";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000/api/v1";

export const options = {
  stages: [
    { duration: "30s", target: 50  }, // 0→50
    { duration: "30s", target: 50  }, // hold 50
    { duration: "30s", target: 100 }, // 50→100
    { duration: "30s", target: 100 }, // hold 100
    { duration: "30s", target: 150 }, // 100→150
    { duration: "30s", target: 150 }, // hold 150
    { duration: "30s", target: 200 }, // 150→200
    { duration: "60s", target: 200 }, // hold 200
    { duration: "30s", target: 0   }, // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<5000"],
    http_req_failed:   ["rate<0.10"],  // alert kalau >10% error
  },
};

const errorRate = new Rate("errors");

export function setup() {
  const token = login(USERS.bd.email, USERS.bd.password);
  return { token };
}

export default function (data) {
  const res = http.get(`${BASE_URL}/bd/leads?page=1&limit=20`, authHeaders(data.token));

  const ok = check(res, {
    "status 200": (r) => r.status === 200,
    "tidak 500":  (r) => r.status !== 500,
  });

  errorRate.add(!ok);
  sleep(Math.random() * 1 + 0.5);
}
