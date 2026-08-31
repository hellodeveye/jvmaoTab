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
import { AI_PROVIDERS, AI_DEFAULT_POSITIONS } from "~/utils/aiProviders";
import { widgetSize } from "~/utils/aiWidgetSizes";
import {
  getViewportSize,
  snap,
  toPlainPositions,
  VIEW_MARGIN,
} from "~/utils/homeLinkLayout";
import QuotaCard from "./QuotaCard";

/** 位置锚在视口右上角：换显示器时卡片跟着角走，不会漂到屏幕中间 */
const AXES = ["right", "top"];
const EMPTY_STATE = { data: null, updatedAt: null, error: null };

function clampToViewport(position, viewport, box) {
  const { width, height } = getViewportSize(viewport);
  return {
    right: _.clamp(position.right, VIEW_MARGIN, Math.max(VIEW_MARGIN, width - box.width)),
    top: _.clamp(position.top, VIEW_MARGIN, Math.max(VIEW_MARGIN, height - box.height)),
  };
}

/** 取数与刷新，只有密钥存在时才真的请求 */
function useProviderQuota(apiKey, load) {
  const [state, setState] = React.useState(EMPTY_STATE);
  const [loading, setLoading] = React.useState(false);

  const refresh = useMemoizedFn(async (force) => {
    if (!apiKey) {
      setState(EMPTY_STATE);
      return;
    }
    setLoading(true);
    try {
      setState(await load(apiKey, { force }));
    } finally {
      setLoading(false);
    }
  });

  React.useEffect(() => {
    refresh(false);
  }, [apiKey, refresh]);

  return { state, loading, refresh };
}

/**
 * 单张卡片：自带取数，于是某个 provider 的响应到达只重渲染它自己，
 * 不会牵动另外两张。
 */
const ProviderCard = observer((props) => {
  const { provider, position, stickled, justDraggedRef } = props;
  const { option, tools } = useStores();
  const apiKey = option.item[provider.optionKey] || "";
  const { state, loading, refresh } = useProviderQuota(apiKey, provider.quota.load);

  const onRefresh = useMemoizedFn(() => {
    // 拖拽结束后浏览器仍会补一个 click，这里挡掉那次误刷新
    if (justDraggedRef.current) return;
    if (state.error?.type === "unauthorized") {
      tools.preferencesOpen = true;
      return;
    }
    refresh(true);
  });

  return (
    <QuotaCard
      id={provider.id}
      title={provider.title}
      tint={provider.tint}
      consoleUrl={provider.consoleUrl}
      size={provider.size}
      format={provider.format}
      position={position}
      state={state}
      loading={loading}
      stickled={stickled}
      onRefresh={onRefresh}
    />
  );
});

const AiWidgetsLayer = observer((props) => {
  const { stickled, frostStyle, providers } = props;
  const { option } = useStores();
  const viewport = useLiveViewportSize();
  const justDraggedRef = React.useRef(false);

  // 距离小于 5px 不视为拖拽，点击刷新才不会被 dnd-kit 吞掉
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const stored = React.useMemo(
    () => toPlainPositions(option.item.aiWidgetPositions, AXES),
    [option.item.aiWidgetPositions]
  );

  const positions = React.useMemo(() => {
    const resolved = {};
    AI_PROVIDERS.forEach((provider) => {
      resolved[provider.id] = clampToViewport(
        stored[provider.id] || AI_DEFAULT_POSITIONS[provider.id],
        viewport,
        widgetSize(provider.size)
      );
    });
    return resolved;
  }, [stored, viewport]);

  const handleDragEnd = useMemoizedFn((event) => {
    const id = String(event.active?.id || "");
    const current = positions[id];
    const provider = AI_PROVIDERS.find((item) => item.id === id);
    if (!current || !provider) return;
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
      widgetSize(provider.size)
    );

    option
      .setItem("aiWidgetPositions", { ...stored, [id]: next }, false)
      .catch((err) => {
        console.error("[aiWidgetPositions] save failed:", err);
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
        {providers.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            position={positions[provider.id]}
            stickled={stickled}
            justDraggedRef={justDraggedRef}
          />
        ))}
      </DndContext>
    </StickledLayer>
  );
});

/** 一个密钥都没配时不挂载下面那层，省掉 resize 监听与三份取数状态 */
const AiWidgets = (props) => {
  const { option } = useStores();
  const providers = AI_PROVIDERS.filter(
    (provider) => option.item[provider.optionKey]
  );
  if (providers.length === 0) return null;
  return <AiWidgetsLayer {...props} providers={providers} />;
};

export default observer(AiWidgets);
