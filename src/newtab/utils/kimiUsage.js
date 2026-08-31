import { requestJson, loadWithCache, clearProviderCache } from "./aiProviderCore";

/* Kimi Code（Coding Plan）用量接口。官方未公开文档，端点与字段来自实测：
   GET https://api.kimi.com/coding/v1/usages，Bearer 用 Coding Plan 的 sk-kimi-* 密钥
   （platform.kimi.com 的 sk-* 是另一套，会 401）。实测不校验 User-Agent，
   所以浏览器里发得出去——fetch 改不了 UA。
   响应中 limit 已归一化成 100，used 即百分比，且都是字符串。 */
export const KIMI_USAGE_URL = "https://api.kimi.com/coding/v1/usages";
export const KIMI_CONSOLE_URL = "https://www.kimi.com/code";

const CACHE_KEY = "aiBalance:kimi";

function toPercent(quota) {
  const limit = Number(quota?.limit);
  const used = Number(quota?.used);
  if (!Number.isFinite(limit) || limit <= 0 || !Number.isFinite(used)) {
    return null;
  }
  return (used / limit) * 100;
}

function normalize(raw) {
  // limits[0] 是滚动窗口（实测 300 分钟 = 5 小时），usage 是周额度
  const windowQuota = Array.isArray(raw?.limits) ? raw.limits[0]?.detail : null;
  const windowPercent = toPercent(windowQuota);
  const weeklyPercent = toPercent(raw?.usage);

  if (windowPercent === null && weeklyPercent === null) {
    throw new Error("额度数据为空");
  }

  return {
    windowPercent,
    windowReset: windowQuota?.resetTime || null,
    weeklyPercent,
    weeklyReset: raw?.usage?.resetTime || null,
  };
}

/** 剩余时间：接口给的是绝对时间戳，展示成倒计时才对得上「还能不能继续写」 */
export function formatCountdown(isoTime) {
  if (!isoTime) return null;
  const target = Date.parse(isoTime);
  if (!Number.isFinite(target)) return null;

  const minutes = Math.floor((target - Date.now()) / 60000);
  if (minutes <= 0) return "即将重置";

  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days} 天 ${hours} 小时后重置`;
  if (hours > 0) return `${hours} 小时 ${minutes % 60} 分后重置`;
  return `${minutes} 分后重置`;
}

export async function fetchKimiUsage(apiKey) {
  return normalize(await requestJson(KIMI_USAGE_URL, apiKey));
}

export function clearKimiUsageCache() {
  return clearProviderCache(CACHE_KEY);
}

export function getKimiUsage(apiKey, options) {
  return loadWithCache(CACHE_KEY, () => fetchKimiUsage(apiKey), options);
}
