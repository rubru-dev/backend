import dotenv from "dotenv";
import path from "path";
dotenv.config();

export const config = {
  appName: process.env.APP_NAME ?? "StockOpname API",
  debug: process.env.DEBUG === "true",
  secretKey: process.env.SECRET_KEY ?? "dev-secret-key-change-in-production",
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtAlgorithm: process.env.JWT_ALGORITHM ?? "HS256",
  accessTokenExpireMinutes: parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES ?? "480"),
  refreshTokenExpireDays: parseInt(process.env.REFRESH_TOKEN_EXPIRE_DAYS ?? "30"),
  corsOrigins: process.env.CORS_ORIGINS?.split(",").map((s) => s.trim()) ?? ["http://localhost:3000"],
  corsAllowAll: process.env.CORS_ALLOW_ALL === "true",
  storagePath: process.env.STORAGE_PATH ?? path.resolve(__dirname, "../storage"),
  fonnteToken: process.env.FONNTE_TOKEN ?? "",
  fonnteApiUrl: process.env.FONNTE_API_URL ?? "https://api.fonnte.com/send",
  metaAdsAccessToken: process.env.META_ADS_ACCESS_TOKEN ?? "",
  metaAdsAdAccountId: process.env.META_ADS_AD_ACCOUNT_ID ?? "",
  metaAdsApiVersion: process.env.META_ADS_API_VERSION ?? "v21.0",
  appUrl: process.env.APP_URL ?? "http://localhost:8000",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:3001",
  port: parseInt(process.env.PORT ?? "8000"),
  mediamtxApiUrl: process.env.MEDIAMTX_API_URL ?? "http://localhost:9997",
  mediamtxHlsBaseUrl: process.env.MEDIAMTX_HLS_BASE_URL ?? "http://localhost:8888",
};
