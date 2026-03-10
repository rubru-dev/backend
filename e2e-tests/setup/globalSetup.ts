import axios from "axios";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8000/api/v1";
const PASSWORD = "password123";

const USERS = [
  { key: "superAdmin", email: "admin@test.com" },
  { key: "bd",        email: "bd@test.com" },
  { key: "finance",   email: "finance@test.com" },
  { key: "sales",     email: "sales@test.com" },
  { key: "content",   email: "content@test.com" },
  { key: "desain",    email: "desain@test.com" },
  { key: "pic",       email: "pic@test.com" },
];

export default async function globalSetup() {
  console.log("\n🔐 Global Setup: Login semua user test...");

  const tokens: Record<string, string> = {};
  const refreshTokens: Record<string, string> = {};

  for (const u of USERS) {
    try {
      const res = await axios.post(
        `${BASE_URL}/auth/login`,
        { email: u.email, password: PASSWORD },
        { validateStatus: () => true }
      );

      if (res.status !== 200) {
        throw new Error(
          `Login gagal untuk ${u.email}: HTTP ${res.status} — ${JSON.stringify(res.data)}\n` +
          "Server belum jalan atau seed belum dijalankan."
        );
      }

      tokens[u.key] = res.data.access_token;
      refreshTokens[u.key] = res.data.refresh_token;
      console.log(`  ✓ ${u.key} (${u.email})`);
    } catch (err: any) {
      if (err.message.includes("Server belum jalan")) throw err;
      throw new Error(
        `Tidak bisa connect ke ${BASE_URL}/auth/login — Server belum jalan atau seed belum dijalankan.\n` +
        err.message
      );
    }
  }

  (global as any).__TOKENS__ = tokens;
  (global as any).__REFRESH_TOKENS__ = refreshTokens;
  (global as any).__BASE_URL__ = BASE_URL;

  console.log("✅ Semua user berhasil login\n");
}
