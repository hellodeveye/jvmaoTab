import React from "react";
import styled from "styled-components";
import { useDraggable } from "@dnd-kit/core";
import { IconExternalLink } from "@tabler/icons-react";
import Frost from "~/components/Frost";
import { formatAge } from "~/utils/timeText";
import { widgetSize } from "~/utils/aiWidgetSizes";

/** 更新时间与重置倒计时常驻显示，靠这个低频 tick 让它们自己走字 */
const TICK_MS = 60 * 1000;

/* 定位与拖拽位移走内联 style：拖拽时每帧变化的值放进模板会每帧生成新 class */
const Card = styled.div`
  position: absolute;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  width: ${(props) => props.$size.width}px;
  height: ${(props) => props.$size.height}px;
  padding: 16px;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  cursor: pointer;
  touch-action: none;
  /* 卡片透出壁纸后白字要在浅色天空上也立得住 */
  text-shadow: 0 1px 2px rgba(18, 30, 78, 0.28);
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    box-shadow: 0 10px 28px rgba(30, 50, 140, 0.3);
    .ai-widget-link {
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

/* 数值行按固定偏移锚在标题下方，底部行锚在卡片底部，中间的空档交给
   Spacer 吸收。整块内容一起贴底的话，没有副行的卡片数值会被顶下去，
   并排时就对不齐——苹果那套齐整靠的是各行锚死，不是卡片一样大。 */
const Value = styled.div`
  display: flex;
  align-items: baseline;
  /* 非数字状态（密钥失效 / —）用整档字号会撑破卡片 */
  font-size: ${(props) =>
    props.$compact ? "20px" : `${props.$size.valueFontSize}px`};
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  /* 深色底上用暖色示警：红字在这类底色上既不醒目也不好读 */
  color: ${(props) => (props.$alert ? "#ffd2cd" : "inherit")};
`;

/* 单位比数字小一号并对齐基线，是这类组件里最省力的「设计过」的信号 */
const Unit = styled.span`
  font-size: ${(props) => props.$size.unitFontSize}px;
  font-weight: 500;
  opacity: 0.88;
`;

const Spacer = styled.div`
  flex: 1;
`;

/* 数值与分解进度条并排：中卡多出来的横向空间用来放信息，不是把文案拉宽 */
const Row = styled.div`
  margin-top: 18px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
`;

const Bars = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  /* 让第一条对齐数值的字面顶部，而不是行盒顶部 */
  padding-top: 2px;
`;

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  line-height: 1;
`;

const BarLabel = styled.span`
  width: 38px;
  flex: none;
  opacity: 0.78;
`;

const BarTrack = styled.div`
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.24);
  overflow: hidden;
`;

const BarFill = styled.div`
  height: 100%;
  border-radius: inherit;
  width: ${(props) => props.$percent}%;
  background: ${(props) =>
    props.$alert ? "#ffd2cd" : "rgba(255, 255, 255, 0.88)"};
`;

const BarValue = styled.span`
  width: 30px;
  flex: none;
  text-align: right;
  font-variant-numeric: tabular-nums;
  opacity: 0.9;
`;

const Meta = styled.div`
  margin-top: 9px;
  font-size: 11px;
  line-height: 1.45;
  opacity: 0.78;
  white-space: nowrap;
`;

const Age = styled.div`
  margin-top: 6px;
  font-size: 11px;
  line-height: 1;
  opacity: 0.55;
`;

const Skeleton = styled.div`
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

/**
 * 额度卡片的呈现与拖拽。
 * 四种状态（加载中 / 正常 / 陈旧 / 密钥失效）全部在这里判定；
 * provider 只提供一个纯函数 format(data) → { prefix?, value, suffix?, alert, meta }，
 * 于是卡片的字号体系不会泄漏给调用方。format 在渲染时调用而非缓存，
 * 里面的倒计时才会随 tick 自己走字。
 */
const QuotaCard = (props) => {
  const { id, title, tint, consoleUrl, size, position, state, loading, format, stickled, onRefresh } =
    props;
  const box = widgetSize(size);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id });

  const cardRef = React.useRef(null);
  const [origin, setOrigin] = React.useState({ left: 0, top: 0 });
  const [, setTick] = React.useState(0);

  const setRefs = React.useCallback(
    (node) => {
      cardRef.current = node;
      setNodeRef(node);
    },
    [setNodeRef]
  );

  React.useEffect(() => {
    if (stickled) return undefined;
    const timer = setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => clearInterval(timer);
  }, [stickled]);

  // 毛玻璃图层要按卡片在视口中的坐标反向对齐，所以得知道真实 left/top。
  // 拖拽中不测量（此时 rect 已含 transform），改为在静止坐标上叠加位移。
  // 依赖写成标量：position / cardSize 每次都是新对象，写对象会让每个 resize 帧
  // 都强制同步布局一次。
  React.useLayoutEffect(() => {
    if (isDragging || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setOrigin((prev) =>
      prev.left === rect.left && prev.top === rect.top
        ? prev
        : { left: rect.left, top: rect.top }
    );
  }, [isDragging, position.right, position.top, box.width, box.height]);

  const tx = transform?.x || 0;
  const ty = transform?.y || 0;
  const { data, updatedAt, error } = state;
  const unauthorized = error?.type === "unauthorized";
  const view = data ? format(data) : null;
  const age = unauthorized ? null : formatAge(updatedAt);

  const hoverTitle = unauthorized
    ? `${title} 密钥失效，点击前往设置`
    : error
      ? `${error.message}，显示的是上次的数据，点击重试`
      : "点击刷新，拖动可调整位置";

  const renderValue = () => {
    if (unauthorized)
      return (
        <Value $size={box} $alert $compact>
          密钥失效
        </Value>
      );
    if (loading && !data) return <Skeleton />;
    if (!view) return <Value $size={box} $compact>—</Value>;
    return (
      <Value $size={box} $alert={view.alert}>
        {view.prefix ? <Unit $size={box}>{view.prefix}</Unit> : null}
        {view.value}
        {view.suffix ? <Unit $size={box}>{view.suffix}</Unit> : null}
      </Value>
    );
  };

  return (
    <Card
      ref={setRefs}
      $size={box}
      {...attributes}
      {...listeners}
      className={isDragging ? "dragging" : ""}
      title={hoverTitle}
      onClick={onRefresh}
      style={{
        right: position.right,
        top: position.top,
        transform: `translate3d(${tx}px, ${ty}px, 0)`,
        zIndex: isDragging ? 100 : 1,
        willChange: isDragging ? "transform" : "auto",
        "--frost-shift": `translate(${-(origin.left + tx)}px, ${-(origin.top + ty)}px)`,
        "--frost-tint": tint,
      }}
    >
      <Frost />
      <Head>
        <span>{title}</span>
        <LinkIcon
          className="ai-widget-link"
          href={consoleUrl}
          target="_blank"
          rel="noreferrer"
          title={`打开 ${title} 控制台`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <IconExternalLink size={13} stroke={1.8} />
        </LinkIcon>
      </Head>
      <Row>
        {renderValue()}
        {view?.bars?.length ? (
          <Bars>
            {view.bars.map((bar) => (
              <Bar key={bar.label}>
                <BarLabel>{bar.label}</BarLabel>
                <BarTrack>
                  <BarFill
                    $percent={Math.min(100, Math.max(0, bar.percent))}
                    $alert={bar.percent >= 90}
                  />
                </BarTrack>
                <BarValue>{Math.round(bar.percent)}%</BarValue>
              </Bar>
            ))}
          </Bars>
        ) : null}
      </Row>
      <Spacer />
      {view?.meta?.length
        ? view.meta.map((line) => <Meta key={line}>{line}</Meta>)
        : null}
      {age ? <Age>{age}</Age> : null}
    </Card>
  );
};

export default React.memo(QuotaCard);
