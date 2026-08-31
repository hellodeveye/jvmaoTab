import { requestJson, loadWithCache, clearProviderCache } from "./aiProviderCore";

export const DEEPSEEK_BALANCE_URL = "https://api.deepseek.com/user/balance";
export const DEEPSEEK_CONSOLE_URL = "https://platform.deepseek.com/usage";

const CACHE_KEY = "aiBalance:deepseek";

const CURRENCY_SYMBOL = {
  CNY: "¥",
  USD: "$",
};

export function currencySymbol(currency) {
  return CURRENCY_SYMBOL[currency] || "";
}

/** 把接口原始响应收敛成组件真正要用的三个字段 */
function normalize(raw) {
  const info = Array.isArray(raw?.balance_infos) ? raw.balance_infos[0] : null;
  if (!info) {
    throw new Error("余额数据为空");
  }
  const totalBalance = Number(info.total_balance);
  return {
    currency: info.currency || "CNY",
    totalBalance: Number.isFinite(totalBalance) ? totalBalance : 0,
    isAvailable: raw.is_available !== false,
  };
}

export async function fetchDeepseekBalance(apiKey) {
  return normalize(await requestJson(DEEPSEEK_BALANCE_URL, apiKey));
}

export function clearDeepseekBalanceCache() {
  return clearProviderCache(CACHE_KEY);
}

export function getDeepseekBalance(apiKey, options) {
  return loadWithCache(CACHE_KEY, () => fetchDeepseekBalance(apiKey), options);
}
