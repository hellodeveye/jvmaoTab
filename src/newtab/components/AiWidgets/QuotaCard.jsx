import React from "react";
import styled from "styled-components";
import { useDraggable } from "@dnd-kit/core";
import { IconExternalLink } from "@tabler/icons-react";
import { useSize } from "ahooks";
import Frost from "~/components/Frost";

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
  /* 深色底上用暖色示警：红字在这类底色上既不醒目也不好读 */
  color: ${(props) => (props.$alert ? "#ffd2cd" : "inherit")};
`;

/* 单位比数字小一号并对齐基线，是这类组件里最省力的「设计过」的信号 */
export const Unit = styled.span`
  font-size: 19px;
  font-weight: 500;
  opacity: 0.88;
`;

const Meta = styled.div`
  margin-top: 9px;
  font-size: 11px;
  line-height: 1;
  opacity: 0.78;
`;

const Age = styled.div`
  margin-top: 6px;
  font-size: 11px;
  line-height: 1;
  opacity: 0.55;
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

/**
 * 额度卡片的呈现与拖拽。数据形态由各 provider 归一化后经 view 传入，
 * 卡片只负责「未配置以外的四种状态」：加载中 / 正常 / 陈旧 / 密钥失效。
 */
const QuotaCard = (props) => {
  const { id, title, tint, consoleUrl, position, state, loading, view, onRefresh } =
    props;
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id });

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
  const unauthorized = error?.type === "unauthorized";
  const age = unauthorized ? null : formatAge(updatedAt);

  const title_ = unauthorized
    ? `${title} 密钥失效，点击前往设置`
    : error
      ? `${error.message}，显示的是上次的数据，点击重试`
      : "点击刷新，拖动可调整位置";

  const renderValue = () => {
    if (unauthorized) return <Value $alert $compact>密钥失效</Value>;
    if (loading && !data) return <Skeleton />;
    if (!data || !view) return <Value $compact>—</Value>;
    return (
      <Value $alert={view.alert}>{view.primary}</Value>
    );
  };

  return (
    <Card
      ref={setRefs}
      {...attributes}
      {...listeners}
      className={isDragging ? "dragging" : ""}
      title={title_}
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
      {renderValue()}
      {!unauthorized && data && view?.meta ? <Meta>{view.meta}</Meta> : null}
      {age ? <Age>{age}</Age> : null}
    </Card>
  );
};

export default QuotaCard;
