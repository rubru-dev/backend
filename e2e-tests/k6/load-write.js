/**
 * load-write.js — 20 VU Concurrent (Write Operations)
 * Simulasi user create/update data bersamaan. Test race condition.
 * Threshold: p95 < 1000ms, error rate < 2%
 *
 * Jalankan: k6 run e2e-tests/k6/load-write.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";
import { login, authHeaders } from "./shared/auth.js";
import { USERS } from "./shared/config.js";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000/api/v1";

export const options = {
  stages: [
    { duration: "20s", target: 20 },
    { duration: "60s", target: 20 },
    { duration: "10s", target: 0  },
  ],
  thresholds: {
    http_req_duration: ["p(95)<1000"],
    http_req_failed:   ["rate<0.02"],
  },
};

const errorRate = new Rate("errors");
const writeDuration = new Trend("write_duration");

export function setup() {
  const token = login(USERS.superAdmin.email, USERS.superAdmin.password);
  return { token };
}

export default function (data) {
  const headers = authHeaders(data.token);
  // Unique name per VU+iteration untuk hindari collision
  const nama = `LOAD_TEST_VU${__VU}_ITER${__ITER}`;
  let allOk = true;

  // 1. POST /bd/leads → 201
  const createRes = http.post(
    `${BASE_URL}/bd/leads`,
    JSON.stringify({
      nama:          nama,
      nomor_telepon: "08100000000",
      jenis:         "Rumah",
      alamat:        "Jakarta",
      status:        "Low",
      sumber_leads:  "Manual",
    }),
    headers
  );
  writeDuration.add(createRes.timings.duration);
  const createOk = check(createRes, {
    "POST leads → 201": (r) => r.status === 201,
  });
  allOk = allOk && createOk;

  if (!createOk) {
    errorRate.add(1);
    sleep(0.5);
    return;
  }

  let leadId;
  try { leadId = JSON.parse(createRes.body).id; } catch { leadId = null; }
  if (!leadId) { errorRate.add(1); return; }

  // 2. PATCH /bd/leads/:id status → 200
  const patchRes = http.patch(
    `${BASE_URL}/bd/leads/${leadId}`,
    JSON.stringify({ status: "Hot" }),
    headers
  );
  writeDuration.add(patchRes.timings.duration);
  allOk = check(patchRes, { "PATCH leads → 200": (r) => r.status === 200 }) && allOk;

  // 3. POST /laporan-harian → 201
  const laporanRes = http.post(
    `${BASE_URL}/laporan-harian`,
    JSON.stringify({
      modul:          "bd",
      tanggal_mulai:  "2026-03-01",
      tanggal_selesai:"2026-03-01",
      kegiatan:       `${nama}_KEGIATAN`,
      kendala:        null,
    }),
    headers
  );
  writeDuration.add(laporanRes.timings.duration);
  allOk = check(laporanRes, { "POST laporan → 201": (r) => r.status === 201 }) && allOk;

  let laporanId;
  try { laporanId = JSON.parse(laporanRes.body).id; } catch { laporanId = null; }

  // 4. DELETE /laporan-harian/:id → 200
  if (laporanId) {
    const delLaporanRes = http.del(`${BASE_URL}/laporan-harian/${laporanId}`, null, headers);
    writeDuration.add(delLaporanRes.timings.duration);
    allOk = check(delLaporanRes, { "DELETE laporan → 200": (r) => r.status === 200 }) && allOk;
  }

  // 5. DELETE /bd/leads/:id → 200
  const delRes = http.del(`${BASE_URL}/bd/leads/${leadId}`, null, headers);
  writeDuration.add(delRes.timings.duration);
  allOk = check(delRes, { "DELETE leads → 200": (r) => r.status === 200 }) && allOk;

  errorRate.add(!allOk);
  sleep(Math.random() * 0.5 + 0.3);
}
