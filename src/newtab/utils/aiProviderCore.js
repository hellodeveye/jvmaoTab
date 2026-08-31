import Storage from "~/utils/storage";

/** 新标签页生命周期只有几秒，超时后直接落到缓存值，不重试 */
const TIMEOUT_MS = 8000;
/** 缓存有效期：期内打开新标签页直接读缓存，不发请求 */
export const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * 带超时的 JSON GET。失败时抛出带 type 的错误：
 * unauthorized | timeout | http | network
 */
export async function requestJson(url, apiKey) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
  } catch (err) {
    const error = new Error(
      err?.name === "AbortError" ? "请求超时" : "网络请求失败"
    );
    error.type = err?.name === "AbortError" ? "timeout" : "network";
    throw error;
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401 || response.status === 403) {
    const error = new Error("密钥失效");
    error.type = "unauthorized";
    throw error;
  }

  if (!response.ok) {
    const error = new Error(`接口返回 ${response.status}`);
    error.type = "http";
    throw error;
  }

  return response.json();
}

/* 缓存写在 db.cache 表，该表已在 exportSnapshot 的 skipTables 中，不会外流 */
async function readCache(cacheKey) {
  try {
    const row = await Storage.get(cacheKey);
    return row?.value || null;
  } catch (err) {
    console.error("读取额度缓存失败:", err);
    return null;
  }
}

export function clearProviderCache(cacheKey) {
  return Storage.remove(cacheKey).catch(() => {});
}

/**
 * 组件读取额度的统一入口，返回 { data, updatedAt, error }：
 * - 缓存未过期且非强制刷新时不发请求；
 * - 请求失败但有缓存时，返回旧数据 + error，由组件呈现「陈旧」；
 * - 401 无论有没有缓存都要冒泡，因为那是必须动手修的状态。
 */
export async function loadWithCache(cacheKey, fetcher, { force = false } = {}) {
  const cached = await readCache(cacheKey);
  const fresh =
    cached?.updatedAt && Date.now() - cached.updatedAt < CACHE_TTL_MS;

  if (!force && fresh) {
    return { data: cached.data, updatedAt: cached.updatedAt, error: null };
  }

  try {
    const data = await fetcher();
    const updatedAt = Date.now();
    try {
      await Storage.set(cacheKey, { value: { data, updatedAt } });
    } catch (err) {
      console.error("写入额度缓存失败:", err);
    }
    return { data, updatedAt, error: null };
  } catch (err) {
    const error = {
      type: err?.type || "network",
      message: err?.message || "请求失败",
    };
    if (error.type === "unauthorized") {
      return { data: null, updatedAt: null, error };
    }
    return {
      data: cached?.data || null,
      updatedAt: cached?.updatedAt || null,
      error,
    };
  }
}
