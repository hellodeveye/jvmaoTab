import { formatCountdown } from "./timeText";
import { stackDefaultPositions } from "./aiWidgetSizes";
import {
  deepseekQuota,
  currencySymbol,
  DEEPSEEK_CONSOLE_URL,
} from "./deepseekBalance";
import { kimiQuota, KIMI_CONSOLE_URL } from "./kimiUsage";
import { factoryQuota, FACTORY_CONSOLE_URL } from "./factoryUsage";

/* 卡片着色。两层叠加而非单层实色——不透明的色块和旁边半透明的抽屉卡片材质对不上，
   会显得像贴上去的贴纸。品牌色压到 0.7 左右让底下的预模糊壁纸透上来，再叠一层
   左上角的径向高光当光源，卡片才有体积。 */
const HIGHLIGHT =
  "radial-gradient(118% 92% at 0% 0%, rgba(255, 255, 255, 0.32) 0%, rgba(255, 255, 255, 0.06) 42%, rgba(255, 255, 255, 0) 62%)";

const tint = (...layers) => [HIGHLIGHT, ...layers].join(", ");

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
 * provider 目录：首屏卡片与首选项页读的是同一份。
 * 新增一个 provider = 写一个 normalize + 在这里加一条。
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
    tint: tint(
      "linear-gradient(158deg, rgba(77, 107, 254, 0.74) 0%, rgba(63, 92, 236, 0.68) 52%, rgba(79, 112, 220, 0.72) 100%)"
    ),
    size: "small",
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
    /* Kimi 官网只有暖白 #fbfaf9 与墨黑 #121212，本身就是黑白灰识别体系、没有饱和
       主色，所以用墨灰而不是编一个假的品牌色，正好和 DeepSeek 蓝拉开区分。 */
    tint: tint(
      "linear-gradient(158deg, rgba(38, 35, 43, 0.72) 0%, rgba(26, 24, 30, 0.66) 52%, rgba(33, 31, 38, 0.7) 100%)"
    ),
    size: "small",
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
    /* Factory 品牌色 #d15010，取自官网（出现最频繁的那个）。 */
    tint: tint(
      "linear-gradient(158deg, rgba(209, 80, 16, 0.74) 0%, rgba(186, 68, 12, 0.68) 52%, rgba(198, 76, 20, 0.72) 100%)"
    ),
    /* 三个滚动窗口值得各占一条进度条，中卡的横向空间才用在了信息量上，
       而不是把同一行文案拉宽。 */
    size: "medium",
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

/** 密钥字段从目录派生，避免「加了 provider 忘了加键」 */
export const AI_OPTION_KEYS = AI_PROVIDERS.map((provider) => provider.optionKey);

/** 默认坐标同样从目录派生：右上角起按各卡高度排成一列 */
export const AI_DEFAULT_POSITIONS = stackDefaultPositions(AI_PROVIDERS);
