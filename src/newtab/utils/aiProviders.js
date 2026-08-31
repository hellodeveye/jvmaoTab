import { formatCountdown } from "./timeText";
import {
  deepseekQuota,
  currencySymbol,
  DEEPSEEK_CONSOLE_URL,
} from "./deepseekBalance";
import { kimiQuota, KIMI_CONSOLE_URL } from "./kimiUsage";
import { factoryQuota, FACTORY_CONSOLE_URL } from "./factoryUsage";

/** 窗口用量到这个比例就该提醒了 */
const USAGE_ALERT_PERCENT = 90;

function percentPart(label, percent) {
  if (percent === null || percent === undefined) return null;
  return `${label} ${Math.round(percent)}%`;
}

/** 用量型卡片（Kimi / Factory）的主指标都是「滚动窗口已用百分比」，形态一致 */
function usageView(percent, countdown, parts) {
  const joined = parts.filter(Boolean).join(" · ");
  return {
    value: String(Math.round(percent)),
    suffix: "%",
    alert: percent >= USAGE_ALERT_PERCENT,
    // 倒计时与各周期用量分两行：合成一行会超出小卡宽度并在中途折行
    meta: [countdown, joined].filter(Boolean),
  };
}

/**
 * 服务商目录：端点、取数、以及「数据 → 卡片文案」的纯函数。
 * 新增一个服务商 = 写一个 normalize + 在这里加一条 + 在 widgets/ai 里给它一套外观。
 *
 * 卡片长什么样（材质、强调色、尺寸档）不在这里，在 widgets/ai/index.js——
 * 那是组件的事，这里只管数据。
 *
 * format 在每次渲染时调用而非缓存，倒计时才会随时间自己走字。
 */
export const AI_PROVIDERS = [
  {
    id: "deepseek",
    optionKey: "deepseekApiKey",
    title: "DeepSeek",
    label: "DeepSeek API Key",
    placeholder: "sk-xxxxxxxxxxxx",
    consoleUrl: DEEPSEEK_CONSOLE_URL,
    quota: deepseekQuota,
    summary: "账户总余额，赠金 + 充值",
    format: (data) => ({
      prefix: currencySymbol(data.currency),
      value: data.totalBalance.toFixed(2),
      alert: !data.isAvailable,
      meta: [],
    }),
    describe: (data) =>
      `当前余额 ${currencySymbol(data.currency)}${data.totalBalance.toFixed(2)}`,
    hint: "首屏显示账户总余额（赠金 + 充值）。",
  },
  {
    id: "kimi",
    optionKey: "kimiApiKey",
    title: "Kimi Code",
    label: "Kimi Code API Key",
    placeholder: "sk-kimi-xxxxxxxxxxxx",
    consoleUrl: KIMI_CONSOLE_URL,
    quota: kimiQuota,
    summary: "Coding Plan 滚动窗口用量与重置倒计时",
    format: (data) =>
      usageView(data.windowPercent ?? data.weeklyPercent, formatCountdown(data.windowReset), [
        percentPart("周", data.weeklyPercent),
      ]),
    describe: (data) =>
      `滚动窗口已用 ${Math.round(data.windowPercent ?? data.weeklyPercent ?? 0)}%`,
    hint: "要 Coding Plan 的 sk-kimi-* 密钥；platform.kimi.com 的 sk-* 是另一套，会验证失败。该用量接口官方未公开文档，字段变动可能导致显示异常。",
  },
  {
    id: "factory",
    optionKey: "factoryApiKey",
    title: "Factory",
    label: "Factory API Key",
    placeholder: "fk-xxxxxxxxxxxx",
    consoleUrl: FACTORY_CONSOLE_URL,
    quota: factoryQuota,
    summary: "5 小时 / 周 / 月 三档用量进度",
    format: (data) => ({
      ...usageView(data.fiveHourPercent ?? data.weeklyPercent, formatCountdown(data.fiveHourReset), []),
      bars: [
        { label: "5 小时", percent: data.fiveHourPercent },
        { label: "周", percent: data.weeklyPercent },
        { label: "月", percent: data.monthlyPercent },
      ].filter((bar) => bar.percent !== null && bar.percent !== undefined),
    }),
    describe: (data) =>
      `5 小时窗口已用 ${Math.round(data.fiveHourPercent ?? data.weeklyPercent ?? 0)}%`,
    hint: "在 app.factory.ai/settings/api-keys 创建 fk-* 密钥。显示的是 standard（付费模型）额度，不含 Droid Core。该接口官方未公开文档。",
  },
];

