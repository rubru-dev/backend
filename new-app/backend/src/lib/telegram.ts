import axios from "axios";
import { prisma } from "./prisma";
import { config } from "../config";

type TelegramConfig = {
  bot_token: string;
  api_url: string;
  default_chat_id: string;
};

export async function getTelegramConfig(): Promise<TelegramConfig> {
  const setting = await prisma.appSetting.findUnique({ where: { key: "telegram_config" } });
  const cfg = (setting?.value as Record<string, string> | null) ?? {};
  return {
    bot_token: cfg.bot_token || config.telegramBotToken,
    api_url: cfg.api_url || config.telegramApiUrl,
    default_chat_id: cfg.default_chat_id || "",
  };
}

function botUrl(apiUrl: string, token: string, method: string) {
  return `${apiUrl.replace(/\/+$/, "")}/bot${token}/${method}`;
}

export async function getTelegramMe() {
  const cfg = await getTelegramConfig();
  if (!cfg.bot_token) throw new Error("Bot token Telegram belum dikonfigurasi");
  const res = await axios.get(botUrl(cfg.api_url, cfg.bot_token, "getMe"), {
    timeout: 8000,
    validateStatus: () => true,
  });
  if (res.status >= 400 || res.data?.ok === false) {
    throw new Error(JSON.stringify(res.data ?? `HTTP ${res.status}`));
  }
  return res.data?.result;
}

export async function getTelegramUpdates() {
  const cfg = await getTelegramConfig();
  if (!cfg.bot_token) throw new Error("Bot token Telegram belum dikonfigurasi");
  const res = await axios.get(botUrl(cfg.api_url, cfg.bot_token, "getUpdates"), {
    timeout: 10000,
    validateStatus: () => true,
  });
  if (res.status >= 400 || res.data?.ok === false) {
    throw new Error(JSON.stringify(res.data ?? `HTTP ${res.status}`));
  }
  return res.data?.result ?? [];
}

export async function sendTelegram(chatId: string, message: string) {
  const cfg = await getTelegramConfig();
  if (!cfg.bot_token) throw new Error("Bot token Telegram belum dikonfigurasi");
  if (!chatId) throw new Error("chat_id Telegram belum diisi");

  const res = await axios.post(
    botUrl(cfg.api_url, cfg.bot_token, "sendMessage"),
    {
      chat_id: chatId,
      text: message,
      disable_web_page_preview: true,
    },
    {
      timeout: 8000,
      validateStatus: () => true,
    },
  );

  if (res.status >= 400 || res.data?.ok === false) {
    throw new Error(JSON.stringify(res.data ?? `HTTP ${res.status}`));
  }
  return res.data?.result;
}
