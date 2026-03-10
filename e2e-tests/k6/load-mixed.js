/**
 * load-mixed.js — 40 VU Concurrent (Paling Realistis)
 * Simulasi hari kerja normal — campuran semua role akses sistem bersamaan.
 * Threshold: p95 < 1000ms, p99 < 3000ms, error rate < 1%
 *
 * Jalankan: k6 run e2e-tests/k6/load-mixed.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";
import { login, authHeaders } from "./shared/auth.js";
import { USERS } from "./shared/config.js";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000/api/v1";

export const options = {
  stages: [
    { duration: "30s", target: 40 }, // ramp up
    { duration: "3m",  target: 40 }, // steady load
    { duration: "20s", target: 0  }, // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<1000", "p(99)<3000"],
    http_req_failed:   ["rate<0.01"],
  },
};

const errorRate = new Rate("errors");
const mixedDuration = new Trend("mixed_duration");

export function setup() {
  return {
    tokens: {
      bd:         login(USERS.bd.email,         USERS.bd.password),
      sales:      login(USERS.sales.email,      USERS.sales.password),
      finance:    login(USERS.finance.email,    USERS.finance.password),
      content:    login(USERS.content.email,    USERS.content.password),
      desain:     login(USERS.desain.email,     USERS.desain.password),
      superAdmin: login(USERS.superAdmin.email, USERS.superAdmin.password),
    },
  };
}

export default function (data) {
  const { tokens } = data;
  const role = __VU % 6;

  let token, url;
  const rand = Math.random();

  switch (role) {
    case 0: // BD: GET leads + sesekali buat lead
      token = tokens.bd;
      if (rand < 0.8) {
        url = `${BASE_URL}/bd/leads?page=${Math.floor(rand * 10) + 1}&limit=20`;
      } else {
        // Write: buat lead kemudian hapus
        const nama = `MIXED_VU${__VU}_${__ITER}`;
        const createRes = http.post(
          `${BASE_URL}/bd/leads`,
          JSON.stringify({ nama: nama, nomor_telepon: "08100000000", jenis: "Rumah", alamat: "Jakarta", status: "Low", sumber_leads: "Manual" }),
          authHeaders(token)
        );
        if (createRes.status === 201) {
          const id = JSON.parse(createRes.body).id;
          http.del(`${BASE_URL}/bd/leads/${id}`, null, authHeaders(token));
        }
        errorRate.add(createRes.status !== 201);
        sleep(Math.random() * 2 + 0.5);
        return;
      }
      break;

    case 1: // Sales: GET kanban
      token = tokens.sales;
      url = `${BASE_URL}/sales-admin/kanban?bulan=3&tahun=2026`;
      break;

    case 2: // Finance: GET invoice + reimburse
      token = tokens.finance;
      url = rand < 0.6
        ? `${BASE_URL}/finance/invoices`
        : `${BASE_URL}/finance/reimburse`;
      break;

    case 3: // Content: GET laporan harian
      token = tokens.content;
      url = `${BASE_URL}/laporan-harian?modul=content&limit=20`;
      break;

    case 4: // Desain: GET laporan harian desain
      token = tokens.desain;
      url = `${BASE_URL}/laporan-harian?modul=desain&limit=20`;
      break;

    case 5: // SuperAdmin: random semua endpoint
      token = tokens.superAdmin;
      const ENDPOINTS = [
        `${BASE_URL}/bd/leads`,
        `${BASE_URL}/finance/invoices`,
        `${BASE_URL}/laporan-harian`,
        `${BASE_URL}/bd/kanban/columns`,
        `${BASE_URL}/sipil/projeks`,
        `${BASE_URL}/admin/users`,
      ];
      url = ENDPOINTS[Math.floor(rand * ENDPOINTS.length)];
      break;
  }

  const res = http.get(url, authHeaders(token));
  mixedDuration.add(res.timings.duration);

  const ok = check(res, {
    "status 200":        (r) => r.status === 200,
    "body tidak kosong": (r) => r.body && r.body.length > 2,
    "duration < 3000ms": (r) => r.timings.duration < 3000,
  });

  errorRate.add(!ok);
  sleep(Math.random() * 2 + 0.5);
}
