import { defineProvider } from "./aiProviderCore";

/* Kimi Code（Coding Plan）用量接口。官方未公开文档，端点与字段来自实测：
   GET https://api.kimi.com/coding/v1/usages，Bearer 用 Coding Plan 的 sk-kimi-* 密钥
   （platform.kimi.com 的 sk-* 是另一套，会 401）。实测不校验 User-Agent，
   所以浏览器里发得出去——fetch 改不了 UA。
   响应中 limit 已归一化成 100，used 即百分比，且都是字符串。 */
export const KIMI_CONSOLE_URL = "https://www.kimi.com/code";

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
  };
}

export const kimiQuota = defineProvider({
  cacheKey: "aiBalance:kimi",
  url: "https://api.kimi.com/coding/v1/usages",
  normalize,
});
