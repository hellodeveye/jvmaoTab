import { AI_WIDGETS } from "./ai";

/**
 * 首屏组件注册表。加一种新组件（待办、天气、汇率……）=
 * 写一个渲染 <WidgetCard> 的 Component，再往这里加一条定义。
 *
 * 定义字段：
 *   id        全局唯一，同时是坐标与「已添加」列表里的键，改名等于丢用户数据
 *   title     卡片标题与组件库标题
 *   summary   组件库里的一行说明
 *   group     组件库分组标题
 *   size      small | medium | large，见 ./sizes
 *   tint      卡片材质（叠在预模糊壁纸上的渐变层）
 *   accent?   强调色，进度条一类元素读 --widget-accent
 *   scheme?   dark（默认）| light，深色材质配浅字、浅色材质配深字
 *   Component 收 { widget, position, stickled, justDraggedRef }，内部渲染 <WidgetCard>
 *   available?(item) → { ok, reason?, goto? }  不满足前置条件时组件库禁止添加
 *
 * 布局、拖拽、坐标持久化、毛玻璃对齐都由 WidgetLayer + WidgetCard 统一负责，
 * 组件本身只管自己的数据与内容区。
 */
export const WIDGETS = [...AI_WIDGETS];

const index = new Map();
WIDGETS.forEach((widget) => {
  if (index.has(widget.id)) {
    console.error(`[widgets] 重复的组件 id: ${widget.id}`);
  }
  index.set(widget.id, widget);
});

export function getWidget(id) {
  return index.get(id) || null;
}

/** 前置条件（如 AI 组件要有密钥）；没声明就是随时可加 */
export function widgetAvailable(widget, item) {
  return widget.available ? widget.available(item) : { ok: true };
}
