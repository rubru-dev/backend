/**
 * Thin wrappers around TanStack Query's useMutation
 * with sensible defaults for toast notifications.
 */
import {
  useMutation as useQueryMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import apiClient from "@/lib/api/client";

type HttpMethod = "post" | "put" | "patch" | "delete";

interface ApiMutationOptions<TData, TVariables> {
  method?: HttpMethod;
  url: string | ((variables: TVariables) => string);
  invalidateKeys?: string[];
  successMessage?: string;
  errorMessage?: string;
  mutationOptions?: Omit<UseMutationOptions<TData, Error, TVariables>, "mutationFn">;
}

export function useApiMutation<TData = unknown, TVariables = unknown>({
  method = "post",
  url,
  invalidateKeys = [],
  successMessage,
  errorMessage,
  mutationOptions,
}: ApiMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();

  return useQueryMutation<TData, Error, TVariables>({
    mutationFn: async (variables) => {
      const resolvedUrl = typeof url === "function" ? url(variables) : url;
      const { data } = await apiClient[method]<TData>(resolvedUrl, variables);
      return data;
    },
    onSuccess: (...args) => {
      if (successMessage) toast.success(successMessage);
      invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      (mutationOptions?.onSuccess as ((...a: unknown[]) => void) | undefined)?.(...args);
    },
    onError: (...args) => {
      const error = args[0];
      const msg =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        errorMessage ??
        "Terjadi kesalahan. Coba lagi.";
      toast.error(msg);
      (mutationOptions?.onError as ((...a: unknown[]) => void) | undefined)?.(...args);
    },
    ...mutationOptions,
  });
}
