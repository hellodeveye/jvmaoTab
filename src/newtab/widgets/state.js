import { getWidget, widgetAvailable } from "./registry";

/** 已添加的组件 id 列表 */
export const WIDGET_IDS_KEY = "widgetIds";
/** 各组件锚在视口右上角的坐标：{ [id]: { right, top } } */
export const WIDGET_POSITIONS_KEY = "widgetPositions";

/**
 * 首屏上「已添加」的组件 id。顺序即添加顺序，未拖动过的卡片按它自上而下排。
 * 注册表里已经不存在的 id 直接丢掉（删过的组件、改过的 id）。
 */
export function resolveWidgetIds(item) {
  const ids = item?.[WIDGET_IDS_KEY];
  return Array.isArray(ids) ? ids.filter(getWidget) : [];
}

/** 首屏真正渲染的组件：已添加，且前置条件仍满足（清了密钥不必再手动移除） */
export function homeWidgets(item) {
  return resolveWidgetIds(item)
    .map(getWidget)
    .filter((widget) => widget && widgetAvailable(widget, item).ok);
}

export function isWidgetAdded(item, id) {
  return resolveWidgetIds(item).includes(id);
}

export function addWidget(item, id) {
  const ids = resolveWidgetIds(item);
  return ids.includes(id) ? ids : [...ids, id];
}

export function removeWidget(item, id) {
  return resolveWidgetIds(item).filter((one) => one !== id);
}
