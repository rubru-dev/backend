import http from "k6/http";
import { BASE_URL } from "./config.js";

/**
 * Login dan return token.
 * Dipanggil di setup() setiap script — token di-share ke semua VU via data passing.
 */
export function login(email, password) {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" } }
  );
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: ${res.status} ${res.body}`);
  }
  return JSON.parse(res.body).access_token;
}

export function authHeaders(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
}
