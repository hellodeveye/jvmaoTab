import {
  requestJson,
  loadWithCache,
  clearProviderCache,
} from "./aiProviderCore";

/* Factory（droid）额度接口。官方文档没有，端点从 droid CLI 的 /limits 命令反出来，
   实测 fk-* API key 走 Authorization: Bearer 可用（X-Api-Key 头会 401）。
   响应里三个滚动窗口各给 usedPercent 与 windowEnd。 */
export const FACTORY_LIMITS_URL = "https://app.factory.ai/api/billing/limits";
export const FACTORY_CONSOLE_URL = "https://app.factory.ai/settings/usage";

const CACHE_KEY = "aiBalance:factory";

function toPercent(window) {
  const percent = Number(window?.usedPercent);
  return Number.isFinite(percent) ? percent : null;
}

function normalize(raw) {
  // 响应里还有一份 limits.core（Droid Core 的额度）。这里只取 standard：
  // 那是付费模型的额度，也是 CLI 自己判断「耗尽」时用的那一份。
  const standard = raw?.limits?.standard;
  const fiveHourPercent = toPercent(standard?.fiveHour);
  const weeklyPercent = toPercent(standard?.weekly);
  const monthlyPercent = toPercent(standard?.monthly);

  if (
    fiveHourPercent === null &&
    weeklyPercent === null &&
    monthlyPercent === null
  ) {
    throw new Error("额度数据为空");
  }

  return {
    fiveHourPercent,
    fiveHourReset: standard?.fiveHour?.windowEnd || null,
    weeklyPercent,
    monthlyPercent,
  };
}

export async function fetchFactoryUsage(apiKey) {
  return normalize(await requestJson(FACTORY_LIMITS_URL, apiKey));
}

export function clearFactoryUsageCache() {
  return clearProviderCache(CACHE_KEY);
}

export function getFactoryUsage(apiKey, options) {
  return loadWithCache(CACHE_KEY, () => fetchFactoryUsage(apiKey), options);
}
