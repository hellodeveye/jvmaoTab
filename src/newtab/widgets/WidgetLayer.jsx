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
import useStores from "~/hooks/useStores";
import useLiveViewportSize from "~/hooks/useLiveViewportSize";
import StickledLayer from "~/components/StickledLayer";
import { snap } from "~/utils/homeLinkLayout";
import { getWidget } from "./registry";
import {
  homeInstances,
  listInstances,
  updateInstance,
  WIDGETS_KEY,
} from "./instances";
import { instancesForScreen } from "~/screens";
import { clampToViewport } from "./layout";
import { widgetSize } from "./sizes";

/**
 * 组件层：只管布局、拖拽与坐标持久化，不认识任何一种具体组件。
 * 每个实例的取数与内容都在它自己的 Component 里，于是一张卡片的数据到达
 * 不会牵动其他卡片重渲染。
 */
const Layer = observer((props) => {
  const { stickled, frostStyle, instances } = props;
  const { option } = useStores();
  const viewport = useLiveViewportSize();
  const justDraggedRef = React.useRef(false);

  // 距离小于 5px 不视为拖拽，点击刷新才不会被 dnd-kit 吞掉
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = useMemoizedFn((event) => {
    const id = String(event.active?.id || "");
    const instance = instances.find((one) => one.id === id);
    if (!instance) return;
    const dx = event.delta?.x || 0;
    const dy = event.delta?.y || 0;
    if (dx === 0 && dy === 0) return;

    justDraggedRef.current = true;
    // click 紧跟 pointerup 派发，宏任务里复位刚好在它之后
    setTimeout(() => {
      justDraggedRef.current = false;
    }, 0);

    // right 与 x 方向相反：往左拖 right 变大
    const position = clampToViewport(
      {
        right: snap(instance.position.right - dx),
        top: snap(instance.position.top + dy),
      },
      viewport,
      widgetSize(instance.size)
    );

    // 写的是全量数组，所以要连同其他实例一起转纯对象，见 instances.toPlain
    const next = updateInstance(listInstances(option.item), id, { position });
    option.setItem(WIDGETS_KEY, next, false).catch((err) => {
      console.error(`[${WIDGETS_KEY}] save failed:`, err);
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
        {/* 坐标每次渲染重算而不做 memo：卡片就这么几张，而 memo 的签名要覆盖
            size / position / config 才不会漏更新，那个签名比重算还贵。
            拖拽每帧的位移走 useDraggable 的 transform，不经过这一层。 */}
        {instances.map((instance) => {
          const definition = getWidget(instance.type);
          const Component = definition.Component;
          return (
            <Component
              key={instance.id}
              instance={instance}
              definition={definition}
              position={clampToViewport(
                instance.position,
                viewport,
                widgetSize(instance.size)
              )}
              stickled={stickled}
              justDraggedRef={justDraggedRef}
            />
          );
        })}
      </DndContext>
    </StickledLayer>
  );
});

/** 一个实例都没有时不挂载下面那层，省掉 resize 监听与各组件的取数状态 */
const WidgetLayer = (props) => {
  const { option } = useStores();
  const { screen } = props;
  // 屏归属读取时归一:旧实例没有 screen 字段全部归首屏(0),零迁移
  const instances = instancesForScreen(
    homeInstances(option.item),
    screen
  );
  if (instances.length === 0) return null;
  return <Layer {...props} instances={instances} />;
};

export default observer(WidgetLayer);
