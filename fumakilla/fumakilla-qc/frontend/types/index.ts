export type Status = "PENDING" | "PASS" | "FAIL" | "ON_HOLD" | "OPEN" | "IN_PROGRESS" | "CLOSED" | string;

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  roles?: string[];
  permissions?: string[];
}

export interface PageResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}
