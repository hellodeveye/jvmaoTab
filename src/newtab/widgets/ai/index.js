import { AI_PROVIDERS } from "~/utils/aiProviders";
import QuotaWidget from "./QuotaWidget";

/**
 * AI 额度组件：服务商目录里每一条就是一个组件定义，
 * 新增服务商只改 utils/aiProviders.js，组件库这边自动跟上。
 */
export const AI_WIDGETS = AI_PROVIDERS.map((provider) => ({
  id: provider.id,
  title: provider.title,
  summary: provider.summary,
  group: "AI 额度",
  size: provider.size,
  tint: provider.tint,
  accent: provider.accent,
  scheme: provider.scheme,
  Component: QuotaWidget,
  // 没有密钥就取不到数，卡片只会是一张空壳，所以拦在添加这一步
  available: (item) =>
    item?.[provider.optionKey]
      ? { ok: true }
      : { ok: false, reason: "需先填写 API Key", goto: "ai" },
  /** 组件自己的私有数据，只有它的 Component 认识 */
  provider,
}));
