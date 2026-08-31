import { formatCountdown } from "./timeText";
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

/* 亮色卡上白色高光是看不见的，换成左上偏白、右下微暗的柔和渐层来做体积 */
const LIGHT_HIGHLIGHT =
  "radial-gradient(120% 95% at 0% 0%, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0) 58%), radial-gradient(90% 80% at 100% 100%, rgba(0, 0, 0, 0.06) 0%, rgba(0, 0, 0, 0) 60%)";

const lightTint = (...layers) => [LIGHT_HIGHLIGHT, ...layers].join(", ");

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
    /* Kimi 官网是暖白 #fbfaf9 配墨黑 #121212，黑白灰识别体系、没有饱和主色，
       所以用墨灰而不是编一个假的品牌色。偏暖（r>g>b）：一来贴合它那个暖白，
       二来和 Factory 的中性近黑分得开——两张都是深色卡，靠冷暖区分。 */
    tint: tint(
      "linear-gradient(158deg, rgba(48, 43, 38, 0.7) 0%, rgba(36, 32, 28, 0.64) 52%, rgba(43, 38, 34, 0.68) 100%)"
    ),
    size: "small",
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
    /* Factory 是「黑白 + 橙色强调」，且官网 <html data-theme="light">，
       CSS 里 light 规则 83 条、dark 只有 7 条——默认就是亮色。
       底色取 --surface-raised #fff / --surface-page #f5f5f5 / --light-base-primary #eee，
       橙色 --accent-100 #ef6f2e 只做强调（这里落在三条进度条上），从不做底色。 */
    scheme: "light",
    tint: lightTint(
      "linear-gradient(158deg, rgba(255, 255, 255, 0.82) 0%, rgba(238, 238, 238, 0.74) 52%, rgba(245, 245, 245, 0.78) 100%)"
    ),
    accent: "#ef6f2e",
    /* 三个滚动窗口值得各占一条进度条，中卡的横向空间才用在了信息量上，
       而不是把同一行文案拉宽。 */
    size: "medium",
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

/** 密钥字段从目录派生，避免「加了 provider 忘了加键」 */
export const AI_OPTION_KEYS = AI_PROVIDERS.map((provider) => provider.optionKey);
