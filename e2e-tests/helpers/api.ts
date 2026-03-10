import axios, { AxiosInstance } from "axios";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8000/api/v1";

export function createApi(tokenKey: string): AxiosInstance {
  const tokens: Record<string, string> = (global as any).__TOKENS__ ?? {};
  const token = tokens[tokenKey];

  return axios.create({
    baseURL: BASE_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    validateStatus: () => true, // jangan throw untuk 4xx/5xx
  });
}

export function createApiNoAuth(): AxiosInstance {
  return axios.create({
    baseURL: BASE_URL,
    validateStatus: () => true,
  });
}

export async function timedRequest<T>(
  fn: () => Promise<T>,
  maxMs: number,
  label: string
): Promise<T> {
  const start = Date.now();
  const result = await fn();
  const elapsed = Date.now() - start;
  console.log(`⚡ ${label}: ${elapsed}ms`);
  if (elapsed > maxMs) {
    throw new Error(`⏱️ ${label} took ${elapsed}ms (threshold: ${maxMs}ms)`);
  }
  return result;
}
