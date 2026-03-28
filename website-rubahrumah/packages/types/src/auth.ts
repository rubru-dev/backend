import type { AdminRole } from "./common";

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: AdminRole;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: AdminUser;
}

export interface AdminUserFormData {
  name: string;
  email: string;
  password?: string;
  role: AdminRole;
  is_active?: boolean;
}
