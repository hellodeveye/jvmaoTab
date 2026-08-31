import React from "react";
import { observer } from "mobx-react";
import styled from "styled-components";
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { useMemoizedFn, useSize } from "ahooks";
import useStores from "~/hooks/useStores";
import { HOME_ENTER } from "~/utils";
import { snap } from "~/utils/homeLinkLayout";
import {
  getDeepseekBalance,
  currencySymbol,
  DEEPSEEK_CONSOLE_URL,
} from "~/utils/deepseekBalance";
import { getKimiUsage, KIMI_CONSOLE_URL } from "~/utils/kimiUsage";
import { getFactoryUsage, FACTORY_CONSOLE_URL } from "~/utils/factoryUsage";
import { formatCountdown } from "~/utils/aiProviderCore";
import QuotaCard, { Unit } from "./QuotaCard";

/* DeepSeek 品牌蓝：取自官网在用的 #426EFE / #4F70DC 一族，主色 #4D6BFE。
   两层叠加而非单层实色——不透明的色块和旁边半透明的抽屉卡片材质对不上，会显得
   像贴上去的贴纸。这里把品牌色压到 0.7 左右让底下的预模糊壁纸透上来，再叠一层
   左上角的径向高光当光源，卡片才有体积。 */
const HIGHLIGHT =
  "radial-gradient(118% 92% at 0% 0%, rgba(255, 255, 255, 0.32) 0%, rgba(255, 255, 255, 0.06) 42%, rgba(255, 255, 255, 0) 62%)";

const DEEPSEEK_TINT = [
  HIGHLIGHT,
  "linear-gradient(158deg, rgba(77, 107, 254, 0.74) 0%, rgba(63, 92, 236, 0.68) 52%, rgba(79, 112, 220, 0.72) 100%)",
].join(", ");

/* Kimi 官网只有暖白 #fbfaf9 与墨黑 #121212，本身就是黑白灰识别体系、没有饱和主色，
   所以用墨灰而不是编一个假的品牌色，正好和 DeepSeek 蓝拉开区分。 */
const KIMI_TINT = [
  HIGHLIGHT,
  "linear-gradient(158deg, rgba(38, 35, 43, 0.72) 0%, rgba(26, 24, 30, 0.66) 52%, rgba(33, 31, 38, 0.7) 100%)",
].join(", ");

/* Factory 品牌色 #d15010，取自官网（出现最频繁的那个）。 */
const FACTORY_TINT = [
  HIGHLIGHT,
  "linear-gradient(158deg, rgba(209, 80, 16, 0.74) 0%, rgba(186, 68, 12, 0.68) 52%, rgba(198, 76, 20, 0.72) 100%)",
].join(", ");

/** 位置锚在视口右上角：换显示器时卡片跟着角走，不会漂到屏幕中间 */
const DEFAULT_POSITIONS = {
  deepseek: { right: 24, top: 20 },
  kimi: { right: 24, top: 148 },
  factory: { right: 24, top: 286 },
};
const EDGE_MARGIN = 8;
/** 更新时间与重置倒计时常驻显示，用低频 tick 让它们自己走字 */
const TICK_MS = 30 * 1000;
/** 窗口用量到这个比例就该提醒了 */
const USAGE_ALERT_PERCENT = 90;

const Outer = styled.div`
  position: absolute;
  inset: 0;
  z-index: ${(props) => (props.stickled ? "-1" : "50")};
  opacity: ${(props) => (props.stickled ? 0 : 1)};
  visibility: ${(props) => (props.stickled ? "hidden" : "visible")};
  transition: opacity ${HOME_ENTER.duration}s ${HOME_ENTER.cssEase},
    visibility ${HOME_ENTER.duration}s ${HOME_ENTER.cssEase};
  overflow: hidden;
  pointer-events: none;
`;

const EMPTY_STATE = { data: null, updatedAt: null, error: null };

function clamp(value, min, max) {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

/* option.item 取回的是 MobX observable，嵌套对象是 Proxy。展开只解一层，
   其余 provider 仍是 Proxy，写进 IndexedDB 会因无法结构化克隆而整次失败——
   现象是「只有最后拖的那个能存」。homeLinkPositions 的 toPlainPositions 同理。 */
function toPlainPositions(raw) {
  if (!raw || typeof raw !== "object") return {};
  const plain = {};
  Object.keys(raw).forEach((key) => {
    const position = raw[key];
    if (
      position &&
      Number.isFinite(position.right) &&
      Number.isFinite(position.top)
    ) {
      plain[key] = { right: position.right, top: position.top };
    }
  });
  return plain;
}

function formatPercentPart(label, percent) {
  if (percent === null || percent === undefined) return null;
  return `${label} ${Math.round(percent)}%`;
}

/** 用量型卡片（Kimi / Factory）的主指标都是「滚动窗口已用百分比」，形态一致 */
function buildUsageView(percent, countdown, parts) {
  return {
    primary: (
      <>
        {Math.round(percent)}
        <Unit>%</Unit>
      </>
    ),
    alert: percent >= USAGE_ALERT_PERCENT,
    meta: [countdown, ...parts].filter(Boolean).join(" · ") || null,
  };
}

/** 每个 provider 的取数与刷新，只有密钥存在时才真的请求 */
function useProviderQuota(apiKey, loader) {
  const [state, setState] = React.useState(EMPTY_STATE);
  const [loading, setLoading] = React.useState(false);

  const load = useMemoizedFn(async (force) => {
    if (!apiKey) {
      setState(EMPTY_STATE);
      return;
    }
    setLoading(true);
    try {
      setState(await loader(apiKey, { force }));
    } finally {
      setLoading(false);
    }
  });

  React.useEffect(() => {
    load(false);
  }, [apiKey, load]);

  return { state, loading, refresh: load };
}

const AiWidgets = (props) => {
  const { stickled, frostStyle } = props;
  const { option, tools } = useStores();
  const {
    deepseekApiKey = "",
    kimiApiKey = "",
    factoryApiKey = "",
  } = option.item;

  const [, setTick] = React.useState(0);
  const viewport = useSize(document.documentElement);
  // 拖拽结束后浏览器仍会补一个 click，用它挡掉那次误刷新
  const justDraggedRef = React.useRef(false);

  const deepseek = useProviderQuota(deepseekApiKey, getDeepseekBalance);
  const kimi = useProviderQuota(kimiApiKey, getKimiUsage);
  const factory = useProviderQuota(factoryApiKey, getFactoryUsage);

  const anyEnabled = Boolean(deepseekApiKey || kimiApiKey || factoryApiKey);

  React.useEffect(() => {
    if (!anyEnabled) return undefined;
    const timer = setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => clearInterval(timer);
  }, [anyEnabled]);

  // 距离小于 5px 不视为拖拽，点击刷新才不会被 dnd-kit 吞掉
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const stored = React.useMemo(
    () => toPlainPositions(option.item.aiWidgetPositions),
    [option.item.aiWidgetPositions]
  );
  const positions = React.useMemo(() => {
    const width = viewport?.width || window.innerWidth;
    const height = viewport?.height || window.innerHeight;
    const resolve = (key) => {
      const base = stored[key] || DEFAULT_POSITIONS[key];
      return {
        right: clamp(base.right, EDGE_MARGIN, Math.max(EDGE_MARGIN, width - 140)),
        top: clamp(base.top, EDGE_MARGIN, Math.max(EDGE_MARGIN, height - 100)),
      };
    };
    return {
      deepseek: resolve("deepseek"),
      kimi: resolve("kimi"),
      factory: resolve("factory"),
    };
  }, [stored, viewport]);

  const handleDragEnd = useMemoizedFn((event) => {
    const key = String(event.active?.id || "");
    if (!positions[key]) return;
    const dx = event.delta?.x || 0;
    const dy = event.delta?.y || 0;
    if (dx === 0 && dy === 0) return;

    justDraggedRef.current = true;
    // click 紧跟 pointerup 派发，宏任务里复位刚好在它之后
    setTimeout(() => {
      justDraggedRef.current = false;
    }, 0);

    const width = viewport?.width || window.innerWidth;
    const height = viewport?.height || window.innerHeight;
    const next = {
      // right 与 x 方向相反：往左拖 right 变大
      right: clamp(
        snap(positions[key].right - dx),
        EDGE_MARGIN,
        Math.max(EDGE_MARGIN, width - 140)
      ),
      top: clamp(
        snap(positions[key].top + dy),
        EDGE_MARGIN,
        Math.max(EDGE_MARGIN, height - 100)
      ),
    };

    option
      .setItem("aiWidgetPositions", { ...stored, [key]: next }, false)
      .catch((err) => {
        console.error("[aiWidgetPositions] save failed:", err);
      });
  });

  const makeRefresh = (provider) => () => {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    if (provider.state.error?.type === "unauthorized") {
      tools.preferencesOpen = true;
      return;
    }
    provider.refresh(true);
  };

  const deepseekView = React.useMemo(() => {
    const data = deepseek.state.data;
    if (!data) return null;
    return {
      primary: (
        <>
          <Unit>{currencySymbol(data.currency)}</Unit>
          {data.totalBalance.toFixed(2)}
        </>
      ),
      alert: !data.isAvailable,
      meta: null,
    };
  }, [deepseek.state.data]);

  const factoryView = React.useMemo(() => {
    const data = factory.state.data;
    if (!data) return null;
    const percent = data.fiveHourPercent ?? data.weeklyPercent;
    if (percent === null || percent === undefined) return null;
    return buildUsageView(percent, formatCountdown(data.fiveHourReset), [
      formatPercentPart("周", data.weeklyPercent),
      formatPercentPart("月", data.monthlyPercent),
    ]);
  }, [factory.state.data]);

  const kimiView = React.useMemo(() => {
    const data = kimi.state.data;
    if (!data) return null;
    const percent = data.windowPercent ?? data.weeklyPercent;
    if (percent === null || percent === undefined) return null;

    return buildUsageView(percent, formatCountdown(data.windowReset), [
      formatPercentPart("周", data.weeklyPercent),
    ]);
  }, [kimi.state.data]);

  if (!anyEnabled) return null;

  return (
    <Outer stickled={stickled} style={frostStyle}>
      <DndContext
        autoScroll={false}
        sensors={sensors}
        modifiers={[restrictToParentElement]}
        onDragEnd={handleDragEnd}
      >
        {deepseekApiKey ? (
          <QuotaCard
            id="deepseek"
            title="DeepSeek"
            tint={DEEPSEEK_TINT}
            consoleUrl={DEEPSEEK_CONSOLE_URL}
            position={positions.deepseek}
            state={deepseek.state}
            loading={deepseek.loading}
            view={deepseekView}
            onRefresh={makeRefresh(deepseek)}
          />
        ) : null}
        {factoryApiKey ? (
          <QuotaCard
            id="factory"
            title="Factory"
            tint={FACTORY_TINT}
            consoleUrl={FACTORY_CONSOLE_URL}
            position={positions.factory}
            state={factory.state}
            loading={factory.loading}
            view={factoryView}
            onRefresh={makeRefresh(factory)}
          />
        ) : null}
        {kimiApiKey ? (
          <QuotaCard
            id="kimi"
            title="Kimi Code"
            tint={KIMI_TINT}
            consoleUrl={KIMI_CONSOLE_URL}
            position={positions.kimi}
            state={kimi.state}
            loading={kimi.loading}
            view={kimiView}
            onRefresh={makeRefresh(kimi)}
          />
        ) : null}
      </DndContext>
    </Outer>
  );
};

export default observer(AiWidgets);
