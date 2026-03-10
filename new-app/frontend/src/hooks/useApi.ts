/**
 * useApi — SWR-style hooks built on top of TanStack Query.
 *
 * Why react-query instead of SWR:
 *  - already in package.json
 *  - supports mutations, optimistic updates, and infinite queries
 *  - same DX as SWR (staleTime, revalidation, cache key)
 *
 * Usage:
 *   const { data, isLoading, error } = useApi<Lead[]>("/bd/leads");
 *   const { data } = useApi<Lead>(`/bd/leads/${id}`, { enabled: !!id });
 */
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import type { PaginatedResponse } from "@/types";

// ── Generic GET hook ───────────────────────────────────────────────────────────
export function useApi<T>(
  url: string | null,
  options?: Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">
) {
  return useQuery<T, Error>({
    queryKey: [url],
    queryFn: async () => {
      if (!url) throw new Error("No URL provided");
      const { data } = await apiClient.get<T>(url);
      return data;
    },
    enabled: !!url,
    ...options,
  });
}

// ── Paginated list hook ────────────────────────────────────────────────────────
export function usePaginatedApi<T>(
  url: string | null,
  params?: Record<string, string | number | boolean | undefined>,
  options?: Omit<UseQueryOptions<PaginatedResponse<T>, Error>, "queryKey" | "queryFn">
) {
  return useQuery<PaginatedResponse<T>, Error>({
    queryKey: [url, params],
    queryFn: async () => {
      if (!url) throw new Error("No URL provided");
      const { data } = await apiClient.get<PaginatedResponse<T>>(url, { params });
      return data;
    },
    enabled: !!url,
    ...options,
  });
}
