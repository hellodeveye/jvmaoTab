import Storage from "~/utils/storage";

export const DEEPSEEK_BALANCE_URL = "https://api.deepseek.com/user/balance";
export const DEEPSEEK_CONSOLE_URL = "https://platform.deepseek.com/usage";

/** 新标签页生命周期只有几秒，超时后直接落到缓存值，不重试 */
const TIMEOUT_MS = 8000;
/** 缓存有效期：期内打开新标签页直接读缓存，不发请求 */
export const CACHE_TTL_MS = 15 * 60 * 1000;
/** 缓存写在 db.cache 表，该表已在 exportSnapshot 的 skipTables 中，不会外流 */
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

/**
 * 直接请求余额接口。成功返回归一化数据，失败抛出带 type 的错误。
 * type: unauthorized | timeout | http | network
 */
export async function fetchDeepseekBalance(apiKey) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(DEEPSEEK_BALANCE_URL, {
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

  return normalize(await response.json());
}

async function readCache() {
  try {
    const row = await Storage.get(CACHE_KEY);
    return row?.value || null;
  } catch (err) {
    console.error("读取余额缓存失败:", err);
    return null;
  }
}

async function writeCache(payload) {
  try {
    await Storage.set(CACHE_KEY, { value: payload });
  } catch (err) {
    console.error("写入余额缓存失败:", err);
  }
}

export function clearDeepseekBalanceCache() {
  return Storage.remove(CACHE_KEY).catch(() => {});
}

/**
 * 组件读取余额的唯一入口。
 * 返回 { data, updatedAt, error }：
 * - 缓存未过期且非强制刷新时不发请求；
 * - 请求失败但有缓存时，返回旧数据 + error，由组件呈现「陈旧」；
 * - 401 无论有没有缓存都要冒泡，因为那是必须动手修的状态。
 */
export async function getDeepseekBalance(apiKey, { force = false } = {}) {
  const cached = await readCache();
  const fresh =
    cached?.updatedAt && Date.now() - cached.updatedAt < CACHE_TTL_MS;

  if (!force && fresh) {
    return { data: cached.data, updatedAt: cached.updatedAt, error: null };
  }

  try {
    const data = await fetchDeepseekBalance(apiKey);
    const updatedAt = Date.now();
    await writeCache({ data, updatedAt });
    return { data, updatedAt, error: null };
  } catch (err) {
    const error = { type: err?.type || "network", message: err?.message || "请求失败" };
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
