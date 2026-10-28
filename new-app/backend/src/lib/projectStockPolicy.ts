export const PB_DRAFT = "Draft";
export const PB_PARTIALLY_RECEIVED = "Sebagian Diterima";
export const PB_COMPLETE = "Selesai";

export function pbCountsTowardQuota(status: string) {
  return status !== "Ditolak" && status !== PB_DRAFT;
}

export function remainingQuantity(ordered: number, received: number) {
  return Math.max(0, ordered - received);
}

export function receiptStatus(items: Array<{ ordered: number; received: number }>) {
  if (items.length > 0 && items.every((item) => remainingQuantity(item.ordered, item.received) === 0)) {
    return PB_COMPLETE;
  }
  return PB_PARTIALLY_RECEIVED;
}

export function canReceiveFromPBStatus(status: string) {
  return status === "Diproses PR" || status === PB_PARTIALLY_RECEIVED;
}
