import cron from "node-cron";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Auto-refresh Meta token setiap 45 hari
// Meta long-lived token berlaku 60 hari — refresh di hari ke-45 agar tidak pernah expired
const REFRESH_AFTER_DAYS = 45;

async function refreshMetaTokens() {
  const accounts = await prisma.adPlatformAccount.findMany({
    where: { platform: "Meta", is_active: true },
  });

  for (const account of accounts) {
    if (!account.app_id || !account.app_secret || !account.access_token) continue;

    const lastRefresh = account.token_refreshed_at ?? account.created_at;
    const daysSince = (Date.now() - new Date(lastRefresh).getTime()) / (1000 * 60 * 60 * 24);

    if (daysSince < REFRESH_AFTER_DAYS) continue;

    try {
      const url = new URL("https://graph.facebook.com/oauth/access_token");
      url.searchParams.set("grant_type", "fb_exchange_token");
      url.searchParams.set("client_id", account.app_id);
      url.searchParams.set("client_secret", account.app_secret);
      url.searchParams.set("fb_exchange_token", account.access_token);

      const resp = await fetch(url.toString());
      const data = await resp.json() as { access_token?: string; error?: { message: string } };

      if (data.error || !data.access_token) {
        console.error(`[MetaAutoRefresh] Gagal refresh token akun "${account.account_name}": ${data.error?.message ?? "no token"}`);
        continue;
      }

      await prisma.adPlatformAccount.update({
        where: { id: account.id },
        data: { access_token: data.access_token, token_refreshed_at: new Date() },
      });

      console.log(`[MetaAutoRefresh] ✓ Token akun "${account.account_name}" berhasil di-refresh otomatis`);
    } catch (err) {
      console.error(`[MetaAutoRefresh] Error akun "${account.account_name}":`, err);
    }
  }
}

export function startMetaAutoRefresh() {
  // Jalankan sekali saat server start (untuk handle case token sudah lama tapi baru deploy)
  refreshMetaTokens().catch(console.error);

  // Cron: setiap hari jam 03:00 pagi
  cron.schedule("0 3 * * *", () => {
    console.log("[MetaAutoRefresh] Cek token Meta...");
    refreshMetaTokens().catch(console.error);
  });

  console.log("✓ Meta auto-refresh token scheduler aktif (cek harian jam 03:00)");
}
