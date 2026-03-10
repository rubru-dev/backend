/**
 * Auth API — thin wrappers over apiClient for auth endpoints.
 */
import apiClient from "./client";
import type { User } from "@/types";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface AccessTokenResponse {
  access_token: string;
  token_type: string;
}

export async function login(payload: LoginPayload): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/auth/login", payload);
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>("/auth/me");
  return data;
}

export async function updateProfile(payload: { name?: string; whatsapp_number?: string }): Promise<User> {
  const { data } = await apiClient.patch<User>("/auth/me", payload);
  return data;
}

export async function changePassword(payload: {
  current_password: string;
  new_password: string;
  confirm_password: string;
}): Promise<{ message: string }> {
  // confirm_password is only for frontend validation; strip it before sending to backend
  const { confirm_password: _, ...body } = payload;
  const { data } = await apiClient.patch<{ message: string }>("/auth/me/password", body);
  return data;
}

export async function refreshToken(token: string): Promise<AccessTokenResponse> {
  const { data } = await apiClient.post<AccessTokenResponse>("/auth/refresh", {
    refresh_token: token,
  });
  return data;
}
