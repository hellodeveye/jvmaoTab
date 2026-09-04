import _ from "lodash";
import {
  getViewportSize,
  snap,
  VIEW_MARGIN,
} from "~/utils/homeLinkLayout";
import { widgetSize, WIDGET_GAP } from "./sizes";

/* 组件锚在视口右上角：换显示器时卡片跟着角走，不会漂到屏幕中间。
   于是 right 越大越靠左，拖拽位移要反号，见 WidgetLayer。 */
export const AXES = ["right", "top"];

/** 右上角那一列的起点 */
const COLUMN_RIGHT = 24;
const COLUMN_TOP = 20;
/** 右列排满后新卡片的阶梯错位 */
const CASCADE_STEP = 24;
/** 阶梯最多试这么多级，试不开就认了——这时候屏幕本来就满了 */
const CASCADE_TRIES = 12;

export function clampToViewport(position, viewport, box) {
  const { width, height } = getViewportSize(viewport);
  return {
    right: _.clamp(position.right, VIEW_MARGIN, Math.max(VIEW_MARGIN, width - box.width)),
    top: _.clamp(position.top, VIEW_MARGIN, Math.max(VIEW_MARGIN, height - box.height)),
  };
}

function overlaps(a, aBox, b, bBox) {
  // right 是「距右边缘」，两张卡在水平方向的区间是 [right, right + width]
  const gapX =
    a.right + aBox.width <= b.right || b.right + bBox.width <= a.right;
  const gapY =
    a.top + aBox.height <= b.top || b.top + bBox.height <= a.top;
  return !gapX && !gapY;
}

/**
 * 新实例的落点。在添加时算好写进实例，而不是渲染时兜底——
 * 兜底的话移除一个组件会让其他没拖过的卡片集体位移。
 *
 * 从右上角起，先沿一列自上而下找第一个不与任何现有卡片相交的空位；
 * 这一列排满就往左挪一列。整屏都放不下时才阶梯错开，那种情况下
 * 重叠是必然的，交给用户自己拖。
 */
export function placeNewWidget(instances, size, viewport) {
  const box = widgetSize(size);
  const { width, height } = getViewportSize(viewport);
  const taken = instances
    .filter((instance) => instance.position)
    .map((instance) => ({
      position: instance.position,
      box: widgetSize(instance.size),
    }));

  const hitAt = (candidate) =>
    taken.find((one) => overlaps(candidate, box, one.position, one.box));

  for (
    let right = COLUMN_RIGHT;
    right + box.width <= width - VIEW_MARGIN;
    right += box.width + WIDGET_GAP
  ) {
    let top = COLUMN_TOP;
    while (top + box.height <= height - VIEW_MARGIN) {
      const candidate = { right, top: snap(top) };
      const hit = hitAt(candidate);
      if (!hit) return candidate;
      // 直接跳到挡路那张卡的下边缘，避免一格一格试
      top = hit.position.top + hit.box.height + WIDGET_GAP;
    }
  }

  // 整屏放不下了：阶梯错开，能不叠就不叠，试不开就认了
  let fallback = null;
  for (let step = 1; step <= CASCADE_TRIES; step += 1) {
    const offset = step * CASCADE_STEP;
    const candidate = clampToViewport(
      { right: COLUMN_RIGHT + offset, top: COLUMN_TOP + offset },
      viewport,
      box
    );
    fallback = candidate;
    if (!hitAt(candidate)) return candidate;
  }
  return fallback;
}
