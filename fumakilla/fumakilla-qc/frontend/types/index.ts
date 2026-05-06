export type Role = "ADMIN" | "QC_MANAGER" | "QC_OFFICER";
export type Status = "PENDING" | "PASS" | "FAIL" | "ON_HOLD" | "OPEN" | "IN_PROGRESS" | "CLOSED" | string;

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface PageResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}
