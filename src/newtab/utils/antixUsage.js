import { defineProvider } from "./aiProviderCore";

/* Antix（antigma.ai）额度接口。官方文档没有公开用量查询 API，
   端点从 portal（portal.antigma.ai）前端的 api chunk 反出来并实测确认：
   鉴权不是 Bearer，而是登录后的 antix_session cookie（形如 sess-<uuid>），
   sk-antix-* 虚拟密钥只用于代理推理端点，查不了用量。 */
export const ANTIX_CONSOLE_URL = "https://portal.antigma.ai/usage";

/** 把 /api/portal/me 的原始响应收敛成组件真正要用的字段 */
function normalize(raw) {
  const balance = Number(raw?.credit_balance_usd);
  if (!Number.isFinite(balance)) {
    throw new Error("余额数据为空");
  }
  return {
    currency: "USD",
    totalBalance: balance,
    // 余额 <= 0 视为不可用：接口本身没有 is_available 一类字段
    isAvailable: balance > 0,
  };
}

export const antixQuota = defineProvider({
  cacheKey: "aiBalance:antix",
  url: "https://portal.antigma.ai/api/portal/me",
  normalize,
  headers: { Cookie: "antix_session=" },
});
