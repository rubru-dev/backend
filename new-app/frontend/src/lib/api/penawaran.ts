import { apiClient } from "@/lib/api/client";

export type PenawaranType = "desain" | "rkr" | "golden" | "filter-air";
export type PenawaranKind = "offer" | "discount";

type PenawaranRecord<T> = {
  id: string;
  type: PenawaranType;
  kind: PenawaranKind;
  data: T;
  created_at: string;
  updated_at: string;
};

export const penawaranApi = {
  list: <T>(type: PenawaranType, kind: PenawaranKind = "offer") =>
    apiClient
      .get<{ items: Array<PenawaranRecord<T>> }>(`/penawaran/${type}/offers`, { params: { kind } })
      .then((r) => r.data.items.map((item) => item.data)),
  save: <T extends { id?: string }>(type: PenawaranType, kind: PenawaranKind, data: T) =>
    apiClient.post<PenawaranRecord<T>>(`/penawaran/${type}/offers`, { kind, data }).then((r) => r.data.data),
  remove: (id: string) => apiClient.delete(`/penawaran/offers/${id}`).then((r) => r.data),
};
