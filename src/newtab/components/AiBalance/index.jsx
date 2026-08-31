import React from "react";
import { observer } from "mobx-react";
import styled from "styled-components";
import { DndContext, useDraggable, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { IconExternalLink } from "@tabler/icons-react";
import { useMemoizedFn, useSize } from "ahooks";
import useStores from "~/hooks/useStores";
import Frost from "~/components/Frost";
import { HOME_ENTER } from "~/utils";
import { snap } from "~/utils/homeLinkLayout";
import {
  getDeepseekBalance,
  currencySymbol,
  DEEPSEEK_CONSOLE_URL,
} from "~/utils/deepseekBalance";

const DRAG_ID = "ai-balance-widget";
/* DeepSeek 品牌蓝：取自官网在用的 #426EFE / #4F70DC 一族，主色 #4D6BFE。
   两层叠加而非单层实色——不透明的色块和旁边半透明的抽屉卡片材质对不上，会显得
   像贴上去的贴纸。这里把品牌蓝压到 0.7 左右让底下的预模糊壁纸透上来，再叠一层
   左上角的径向高光当光源，卡片才有体积。 */
const DEEPSEEK_TINT = [
  "radial-gradient(118% 92% at 0% 0%, rgba(255, 255, 255, 0.32) 0%, rgba(255, 255, 255, 0.06) 42%, rgba(255, 255, 255, 0) 62%)",
  "linear-gradient(158deg, rgba(77, 107, 254, 0.74) 0%, rgba(63, 92, 236, 0.68) 52%, rgba(79, 112, 220, 0.72) 100%)",
].join(", ");
/** 位置锚在视口右上角：换显示器时组件跟着角走，不会漂到屏幕中间 */
const DEFAULT_POSITION = { right: 24, top: 20 };
const EDGE_MARGIN = 8;
/** 更新时间常驻显示，用低频 tick 让它自己走字 */
const TICK_MS = 30 * 1000;

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

/* 定位与拖拽位移走内联 style：拖拽时每帧变化的值放进模板会每帧生成新 class */
const Card = styled.div`
  position: absolute;
  pointer-events: auto;
  width: fit-content;
  min-width: 152px;
  padding: 13px 16px 12px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  /* 卡片透出壁纸后白字要在浅色天空上也立得住 */
  text-shadow: 0 1px 2px rgba(18, 30, 78, 0.28);
  cursor: pointer;
  touch-action: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    box-shadow: 0 10px 28px rgba(30, 50, 140, 0.3);
    .ai-balance-link {
      opacity: 0.7;
    }
  }

  &.dragging {
    cursor: grabbing;
    box-shadow: 0 18px 40px rgba(30, 50, 140, 0.42);
  }
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.04em;
  opacity: 0.88;
`;

const Value = styled.div`
  display: flex;
  align-items: baseline;
  margin-top: 10px;
  /* 非数字状态（密钥失效 / —）用 32px 会撑爆卡片 */
  font-size: ${(props) => (props.$compact ? "20px" : "32px")};
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  /* 蓝底上用暖色示警：红字在蓝底上既不醒目也不好读 */
  color: ${(props) => (props.$alert ? "#ffd2cd" : "inherit")};
`;

/* 货币符号比数字小一号并对齐基线，是这类组件里最省力的"设计过"的信号 */
const Symbol = styled.span`
  margin-right: 1px;
  font-size: 19px;
  font-weight: 500;
  opacity: 0.88;
`;

const Age = styled.div`
  margin-top: 9px;
  font-size: 11px;
  line-height: 1;
  opacity: 0.7;
`;

const Skeleton = styled.div`
  margin-top: 10px;
  width: 78px;
  height: 22px;
  border-radius: 5px;
  background: currentColor;
  opacity: 0.2;
`;

const LinkIcon = styled.a`
  display: flex;
  align-items: center;
  color: inherit;
  opacity: 0;
  transition: opacity 0.2s ease;

  &:hover {
    color: inherit;
    opacity: 1 !important;
  }
`;

function formatAge(updatedAt) {
  if (!updatedAt) return null;
  const minutes = Math.floor((Date.now() - updatedAt) / 60000);
  if (minutes < 1) return "刚刚更新";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

function clamp(value, min, max) {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

const AiBalanceCard = (props) => {
  const { position, state, loading, onRefresh, unauthorized } = props;
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: DRAG_ID });

  const cardRef = React.useRef(null);
  const cardSize = useSize(cardRef);
  const [origin, setOrigin] = React.useState({ left: 0, top: 0 });

  const setRefs = React.useCallback(
    (node) => {
      cardRef.current = node;
      setNodeRef(node);
    },
    [setNodeRef]
  );

  // 毛玻璃图层要按卡片在视口中的坐标反向对齐，所以得知道真实 left/top。
  // 拖拽中不测量（此时 rect 已含 transform），改为在静止坐标上叠加位移。
  React.useLayoutEffect(() => {
    if (isDragging || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setOrigin((prev) =>
      prev.left === rect.left && prev.top === rect.top
        ? prev
        : { left: rect.left, top: rect.top }
    );
  }, [isDragging, position, cardSize]);

  const tx = transform?.x || 0;
  const ty = transform?.y || 0;
  const { data, updatedAt, error } = state;
  const insufficient = data && !data.isAvailable;
  const age = unauthorized ? null : formatAge(updatedAt);

  const title = unauthorized
    ? "DeepSeek 密钥失效，点击前往设置"
    : error
      ? `${error.message}，显示的是上次的数据，点击重试`
      : "点击刷新余额，拖动可调整位置";

  const renderValue = () => {
    if (unauthorized) return <Value $alert $compact>密钥失效</Value>;
    if (loading && !data) return <Skeleton />;
    if (!data) return <Value $compact>—</Value>;
    return (
      <Value $alert={insufficient}>
        <Symbol>{currencySymbol(data.currency)}</Symbol>
        {data.totalBalance.toFixed(2)}
      </Value>
    );
  };

  return (
    <Card
      ref={setRefs}
      {...attributes}
      {...listeners}
      className={isDragging ? "dragging" : ""}
      title={title}
      onClick={onRefresh}
      style={{
        right: position.right,
        top: position.top,
        transform: `translate3d(${tx}px, ${ty}px, 0)`,
        zIndex: isDragging ? 100 : 1,
        willChange: isDragging ? "transform" : "auto",
        "--frost-shift": `translate(${-(origin.left + tx)}px, ${-(origin.top + ty)}px)`,
        "--frost-tint": DEEPSEEK_TINT,
      }}
    >
      <Frost />
      <Head>
        <span>DeepSeek</span>
        <LinkIcon
          className="ai-balance-link"
          href={DEEPSEEK_CONSOLE_URL}
          target="_blank"
          rel="noreferrer"
          title="打开 DeepSeek 控制台"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <IconExternalLink size={13} stroke={1.8} />
        </LinkIcon>
      </Head>
      {renderValue()}
      {age ? <Age>{age}</Age> : null}
    </Card>
  );
};

const AiBalance = (props) => {
  const { stickled, frostStyle } = props;
  const { option, tools } = useStores();
  const { deepseekApiKey = "" } = option.item;

  const [state, setState] = React.useState({
    data: null,
    updatedAt: null,
    error: null,
  });
  const [loading, setLoading] = React.useState(false);
  const [, setTick] = React.useState(0);
  // 拖拽结束后浏览器仍会补一个 click，用它挡掉那次误刷新
  const justDraggedRef = React.useRef(false);
  const viewport = useSize(document.documentElement);

  // 距离小于 5px 不视为拖拽，点击刷新才不会被 dnd-kit 吞掉
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const load = useMemoizedFn(async (force) => {
    if (!deepseekApiKey) return;
    setLoading(true);
    try {
      setState(await getDeepseekBalance(deepseekApiKey, { force }));
    } finally {
      setLoading(false);
    }
  });

  React.useEffect(() => {
    load(false);
  }, [deepseekApiKey, load]);

  React.useEffect(() => {
    if (!deepseekApiKey) return undefined;
    const timer = setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => clearInterval(timer);
  }, [deepseekApiKey]);

  const stored = option.item.aiBalancePosition;
  const position = React.useMemo(() => {
    const base = stored && Number.isFinite(stored.right) ? stored : DEFAULT_POSITION;
    const width = viewport?.width || window.innerWidth;
    const height = viewport?.height || window.innerHeight;
    return {
      right: clamp(base.right, EDGE_MARGIN, Math.max(EDGE_MARGIN, width - 140)),
      top: clamp(base.top, EDGE_MARGIN, Math.max(EDGE_MARGIN, height - 100)),
    };
  }, [stored, viewport]);

  const handleDragEnd = useMemoizedFn((event) => {
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
      right: clamp(snap(position.right - dx), EDGE_MARGIN, Math.max(EDGE_MARGIN, width - 140)),
      top: clamp(snap(position.top + dy), EDGE_MARGIN, Math.max(EDGE_MARGIN, height - 100)),
    };
    option.setItem("aiBalancePosition", next, false).catch((err) => {
      console.error("[aiBalancePosition] save failed:", err);
    });
  });

  const onRefresh = useMemoizedFn(() => {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    if (state.error?.type === "unauthorized") {
      tools.preferencesOpen = true;
      return;
    }
    load(true);
  });

  if (!deepseekApiKey) return null;

  return (
    <Outer stickled={stickled} style={frostStyle}>
      <DndContext
        autoScroll={false}
        sensors={sensors}
        modifiers={[restrictToParentElement]}
        onDragEnd={handleDragEnd}
      >
        <AiBalanceCard
          position={position}
          state={state}
          loading={loading}
          onRefresh={onRefresh}
          unauthorized={state.error?.type === "unauthorized"}
        />
      </DndContext>
    </Outer>
  );
};

export default observer(AiBalance);
