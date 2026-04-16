import { apiClient } from "./client";

export interface UserListItem {
  id: number;
  name: string;
  email: string;
  whatsapp_number: string | null;
  sub_role: string;
  roles: { id: number; name: string }[];
  created_at: string;
}

export interface Role {
  id: number;
  name: string;
  permission_count?: number;
  user_count?: number;
}

export interface PermissionItem {
  id: number;
  name: string;
  module: string;
  label: string;
}

export interface RoleWithPermissions {
  id: number;
  name: string;
  permissions: PermissionItem[];
}

export const adminApi = {
  listUsers: (params?: { page?: number; per_page?: number; search?: string }) =>
    apiClient.get<{ items: UserListItem[]; total: number; page: number; per_page: number }>("/admin/users", { params }).then((r) => r.data),
  createUser: (data: { name: string; email: string; password: string; whatsapp_number?: string; sub_role?: string; role_ids: number[] }) =>
    apiClient.post("/admin/users", data).then((r) => r.data),
  updateUser: (id: number, data: { name?: string; email?: string; whatsapp_number?: string; sub_role?: string; role_ids?: number[] }) =>
    apiClient.patch(`/admin/users/${id}`, data).then((r) => r.data),
  deleteUser: (id: number) => apiClient.delete(`/admin/users/${id}`).then((r) => r.data),
  resetPassword: (id: number, data?: { new_password?: string }) =>
    apiClient.post(`/admin/users/${id}/reset-password`, data ?? {}).then((r) => r.data),

  // Role CRUD
  listRoles: () => apiClient.get<Role[]>("/admin/roles").then((r) => r.data),
  createRole: (data: { name: string }) =>
    apiClient.post<Role>("/admin/roles", data).then((r) => r.data),
  updateRole: (id: number, data: { name: string }) =>
    apiClient.patch<Role>(`/admin/roles/${id}`, data).then((r) => r.data),
  deleteRole: (id: number) =>
    apiClient.delete(`/admin/roles/${id}`).then((r) => r.data),

  // Permission management
  getRolePermissions: (id: number) =>
    apiClient.get<RoleWithPermissions>(`/admin/roles/${id}/permissions`).then((r) => r.data),
  setRolePermissions: (id: number, permission_ids: number[]) =>
    apiClient.put(`/admin/roles/${id}/permissions`, { permission_ids }).then((r) => r.data),
  listPermissions: () =>
    apiClient.get<Record<string, PermissionItem[]>>("/admin/permissions").then((r) => r.data),

  // Fontee / WhatsApp settings
  getFonteeConfig: () =>
    apiClient.get<{ api_key: string; base_url: string; sender_number: string }>("/admin/settings/fontee").then((r) => r.data),
  saveFonteeConfig: (data: { api_key: string; base_url: string; sender_number: string }) =>
    apiClient.put("/admin/settings/fontee", data).then((r) => r.data),
  sendFonteeTest: (data: { target_number: string; message: string }) =>
    apiClient.post("/admin/fontee/send-test", data).then((r) => r.data),
  getReminderRules: () =>
    apiClient.get<{ rules: ReminderRule[]; roles: { id: number; name: string }[] }>("/admin/settings/reminder-rules").then((r) => r.data),
  updateReminderRule: (id: number, data: { days_before?: number; send_time?: string; is_active?: boolean; role_ids?: number[] }) =>
    apiClient.put(`/admin/settings/reminder-rules/${id}`, data).then((r) => r.data),
  testReminderRule: (id: number) =>
    apiClient.post(`/admin/settings/reminder-rules/${id}/test`).then((r) => r.data),
};

export interface ReminderRule {
  id: number;
  feature: string;
  label: string;
  days_before: number;
  send_time: string;
  is_active: boolean;
  role_ids: number[];
}
