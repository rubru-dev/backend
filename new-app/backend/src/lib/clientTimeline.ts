export const CLIENT_TIMELINE_BUFFER_DAYS = 10;

export function clientTargetDate(date: Date | null) {
  if (!date) return null;
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + CLIENT_TIMELINE_BUFFER_DAYS);
  return result;
}
