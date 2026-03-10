import { createApi, createApiNoAuth } from "../helpers/api";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8000/api/v1";

describe("Auth — /auth/*", () => {
  let refreshToken: string;

  test("POST /auth/login — valid credentials → 200 + tokens + permissions[]", async () => {
    const api = createApiNoAuth();
    const res = await api.post("/auth/login", {
      email: "admin@test.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.data.access_token).toBeTruthy();
    expect(res.data.refresh_token).toBeTruthy();
    expect(Array.isArray(res.data.user.permissions)).toBe(true);
    expect(res.data.user.id).toBeDefined();
    expect(res.data.user.email).toBe("admin@test.com");

    refreshToken = res.data.refresh_token;
  });

  test("POST /auth/login — password salah → 401", async () => {
    const api = createApiNoAuth();
    const res = await api.post("/auth/login", {
      email: "admin@test.com",
      password: "wrongpassword",
    });
    expect(res.status).toBe(401);
  });

  test("POST /auth/login — email tidak ada → 401", async () => {
    const api = createApiNoAuth();
    const res = await api.post("/auth/login", {
      email: "notexist@test.com",
      password: "password123",
    });
    expect(res.status).toBe(401);
  });

  test("GET /auth/me — tanpa token → 401", async () => {
    const api = createApiNoAuth();
    const res = await api.get("/auth/me");
    expect(res.status).toBe(401);
  });

  test("GET /auth/me — token invalid → 401", async () => {
    const api = createApiNoAuth();
    const res = await api.get("/auth/me", {
      headers: { Authorization: "Bearer invalid.token.here" },
    });
    expect(res.status).toBe(401);
  });

  test("GET /auth/me — token valid → 200 + id + email", async () => {
    const api = createApi("superAdmin");
    const res = await api.get("/auth/me");
    expect(res.status).toBe(200);
    expect(res.data.id).toBeDefined();
    expect(res.data.email).toBe("admin@test.com");
    expect(Array.isArray(res.data.permissions)).toBe(true);
  });

  test("POST /auth/refresh — valid refresh_token → 200 + access_token baru", async () => {
    // Login dulu untuk dapat refresh_token
    const api = createApiNoAuth();
    const loginRes = await api.post("/auth/login", {
      email: "admin@test.com",
      password: "password123",
    });
    expect(loginRes.status).toBe(200);

    const res = await api.post("/auth/refresh", {
      refresh_token: loginRes.data.refresh_token,
    });
    expect(res.status).toBe(200);
    expect(res.data.access_token).toBeTruthy();
  });

  test("PATCH /auth/me — update nama → 200", async () => {
    const api = createApi("superAdmin");
    const res = await api.patch("/auth/me", { name: "Admin Updated" });
    expect(res.status).toBe(200);

    // Kembalikan nama asli
    await api.patch("/auth/me", { name: "Admin Test" });
  });

  test("BigInt test — JSON.stringify(res.data) tidak throw", async () => {
    const api = createApi("superAdmin");
    const res = await api.get("/auth/me");
    expect(() => JSON.stringify(res.data)).not.toThrow();
    // id harus bisa di-parse (string atau number, bukan BigInt native)
    const parsed = JSON.parse(JSON.stringify(res.data));
    expect(parsed.id).toBeDefined();
  });
});
