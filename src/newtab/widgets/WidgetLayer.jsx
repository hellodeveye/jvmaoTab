import React from "react";
import { observer } from "mobx-react";
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { useMemoizedFn } from "ahooks";
import _ from "lodash";
import useStores from "~/hooks/useStores";
import useLiveViewportSize from "~/hooks/useLiveViewportSize";
import StickledLayer from "~/components/StickledLayer";
import {
  getViewportSize,
  snap,
  toPlainPositions,
  VIEW_MARGIN,
} from "~/utils/homeLinkLayout";
import { getWidget } from "./registry";
import { homeWidgets, WIDGET_POSITIONS_KEY } from "./state";
import { widgetSize, stackDefaultPositions } from "./sizes";

/** 位置锚在视口右上角：换显示器时卡片跟着角走，不会漂到屏幕中间 */
const AXES = ["right", "top"];

function clampToViewport(position, viewport, box) {
  const { width, height } = getViewportSize(viewport);
  return {
    right: _.clamp(position.right, VIEW_MARGIN, Math.max(VIEW_MARGIN, width - box.width)),
    top: _.clamp(position.top, VIEW_MARGIN, Math.max(VIEW_MARGIN, height - box.height)),
  };
}

/**
 * 组件层：只管布局、拖拽与坐标持久化，不认识任何一种具体组件。
 * 每个组件的取数与内容都在它自己的 Component 里，于是一张卡片的数据到达
 * 不会牵动其他卡片重渲染。
 */
const Layer = observer((props) => {
  const { stickled, frostStyle, widgets } = props;
  const { option } = useStores();
  const viewport = useLiveViewportSize();
  const justDraggedRef = React.useRef(false);

  // 距离小于 5px 不视为拖拽，点击刷新才不会被 dnd-kit 吞掉
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const stored = React.useMemo(
    () => toPlainPositions(option.item[WIDGET_POSITIONS_KEY], AXES),
    [option.item[WIDGET_POSITIONS_KEY]]
  );

  const positions = React.useMemo(() => {
    // 默认坐标按当前这几张卡排，添加/移除后没拖过的卡片会自己补位
    const defaults = stackDefaultPositions(widgets);
    const resolved = {};
    widgets.forEach((widget) => {
      resolved[widget.id] = clampToViewport(
        stored[widget.id] || defaults[widget.id],
        viewport,
        widgetSize(widget.size)
      );
    });
    return resolved;
  }, [stored, viewport, widgets]);

  const handleDragEnd = useMemoizedFn((event) => {
    const id = String(event.active?.id || "");
    const current = positions[id];
    const widget = getWidget(id);
    if (!current || !widget) return;
    const dx = event.delta?.x || 0;
    const dy = event.delta?.y || 0;
    if (dx === 0 && dy === 0) return;

    justDraggedRef.current = true;
    // click 紧跟 pointerup 派发，宏任务里复位刚好在它之后
    setTimeout(() => {
      justDraggedRef.current = false;
    }, 0);

    // right 与 x 方向相反：往左拖 right 变大
    const next = clampToViewport(
      { right: snap(current.right - dx), top: snap(current.top + dy) },
      viewport,
      widgetSize(widget.size)
    );

    option
      .setItem(WIDGET_POSITIONS_KEY, { ...stored, [id]: next }, false)
      .catch((err) => {
        console.error(`[${WIDGET_POSITIONS_KEY}] save failed:`, err);
      });
  });

  return (
    <StickledLayer stickled={stickled} style={frostStyle}>
      <DndContext
        autoScroll={false}
        sensors={sensors}
        modifiers={[restrictToParentElement]}
        onDragEnd={handleDragEnd}
      >
        {widgets.map((widget) => (
          <widget.Component
            key={widget.id}
            widget={widget}
            position={positions[widget.id]}
            stickled={stickled}
            justDraggedRef={justDraggedRef}
          />
        ))}
      </DndContext>
    </StickledLayer>
  );
});

/** 一个组件都没添加时不挂载下面那层，省掉 resize 监听与各组件的取数状态 */
const WidgetLayer = (props) => {
  const { option } = useStores();
  const list = homeWidgets(option.item);
  // 每次都是新数组，用 id 串当记忆键，首屏的其他重渲染才不会连带重算坐标
  const ids = list.map((widget) => widget.id).join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const widgets = React.useMemo(() => list, [ids]);
  if (widgets.length === 0) return null;
  return <Layer {...props} widgets={widgets} />;
};

export default observer(WidgetLayer);
