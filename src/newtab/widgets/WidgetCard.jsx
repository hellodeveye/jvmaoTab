import React from "react";
import styled from "styled-components";
import { useDraggable } from "@dnd-kit/core";
import Frost from "~/components/Frost";
import { widgetSize, WIDGET_METRICS as M } from "./sizes";

/* 卡片配色方案。品牌是深色底就用 dark，亮色底就用 light——
   文字、描边、进度条轨道、示警色都得跟着翻，只翻底色会读不清。 */
export const SCHEMES = {
  dark: {
    text: "#fff",
    textShadow: "0 1px 2px rgba(18, 30, 78, 0.28)",
    border: "rgba(255, 255, 255, 0.3)",
    barTrack: "rgba(255, 255, 255, 0.24)",
    barFill: "rgba(255, 255, 255, 0.88)",
    alert: "#ffd2cd",
    shadow: "rgba(30, 50, 140, 0.3)",
    shadowDrag: "rgba(30, 50, 140, 0.42)",
  },
  light: {
    text: "#161413",
    textShadow: "none",
    border: "rgba(0, 0, 0, 0.1)",
    barTrack: "rgba(0, 0, 0, 0.12)",
    barFill: "rgba(0, 0, 0, 0.7)",
    alert: "#c0392b",
    shadow: "rgba(0, 0, 0, 0.18)",
    shadowDrag: "rgba(0, 0, 0, 0.28)",
  },
};

export const scheme = (name) => SCHEMES[name] || SCHEMES.dark;

/* 定位与拖拽位移走内联 style：拖拽时每帧变化的值放进模板会每帧生成新 class */
const Card = styled.div`
  position: absolute;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  width: ${(props) => props.$size.width}px;
  height: ${(props) => props.$size.height}px;
  padding: ${M.padding}px;
  border-radius: ${M.radius}px;
  border: 1px solid ${(props) => props.$scheme.border};
  color: ${(props) => props.$scheme.text};
  cursor: ${(props) => (props.$clickable ? "pointer" : "default")};
  touch-action: none;
  /* 卡片透出壁纸后文字要在深浅不一的壁纸上都立得住 */
  text-shadow: ${(props) => props.$scheme.textShadow};
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    box-shadow: 0 10px 28px ${(props) => props.$scheme.shadow};
    .widget-head-action {
      opacity: 0.7;
    }
  }

  &.dragging {
    cursor: grabbing;
    box-shadow: 0 18px 40px ${(props) => props.$scheme.shadowDrag};
  }
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: ${M.headFontSize}px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.04em;
  opacity: 0.88;
`;

const Body = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

/**
 * 组件外壳：尺寸档、材质、配色、标题栏、拖拽与毛玻璃对齐。
 * 不认识任何一种具体组件的内容——内容由组件自己作为 children 传进来，
 * 于是加一种新组件（待办、天气……）只需要写它的内容部分。
 *
 * 尺寸读实例（用户可在组件库里换档），外观读定义（同一种组件的所有实例长得一样）。
 */
const WidgetCard = (props) => {
  const { instance, definition, position, onClick, tip, action, children } = props;
  const box = widgetSize(instance.size);
  const palette = scheme(definition.scheme);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: instance.id });

  const cardRef = React.useRef(null);
  const [origin, setOrigin] = React.useState({ left: 0, top: 0 });

  const setRefs = React.useCallback(
    (node) => {
      cardRef.current = node;
      setNodeRef(node);
    },
    [setNodeRef]
  );

  // 毛玻璃图层要按卡片在本屏内的坐标反向对齐，所以得知道真实 left/top。
  // 量 offsetLeft/offsetTop 而不是 getBoundingClientRect：前者相对定位父级
  // （StickledLayer，与本屏 pane 同框）且不含 transform，于是切屏时轨道的整体
  // 平移、拖拽时卡片自身的位移都量不进来——位移单独叠加（见 --frost-shift）。
  // 依赖写成标量：position / box 每次都是新对象，写对象会让每个 resize 帧
  // 都强制同步布局一次。
  React.useLayoutEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    setOrigin((prev) =>
      prev.left === node.offsetLeft && prev.top === node.offsetTop
        ? prev
        : { left: node.offsetLeft, top: node.offsetTop }
    );
  }, [position.right, position.top, box.width, box.height]);

  const tx = transform?.x || 0;
  const ty = transform?.y || 0;

  return (
    <Card
      ref={setRefs}
      $size={box}
      $scheme={palette}
      $clickable={!!onClick}
      {...attributes}
      {...listeners}
      className={isDragging ? "dragging" : ""}
      title={tip}
      onClick={onClick}
      style={{
        right: position.right,
        top: position.top,
        transform: `translate3d(${tx}px, ${ty}px, 0)`,
        zIndex: isDragging ? 100 : 1,
        willChange: isDragging ? "transform" : "auto",
        "--frost-shift": `translate(${-(origin.left + tx)}px, ${-(origin.top + ty)}px)`,
        "--frost-tint": definition.tint,
        "--widget-accent": definition.accent,
      }}
    >
      <Frost />
      <Head>
        <span>{definition.instanceTitle?.(instance) || definition.title}</span>
        {action}
      </Head>
      <Body>{children}</Body>
    </Card>
  );
};

export default React.memo(WidgetCard);
