import { widgetSize } from "./sizes";

/**
 * 管理页画廊卡的版式常量。单独成纯模块:卡片正面放不放得下是一个数学命题,
 * 测试(gallery.model.test.mjs 的 overflow 段)必须和组件算同一组数才作数 ——
 * 藏在 styled-components 模板字符串里的常量是导不出来的。
 *
 * 两级 tile 的由来:
 *   小(1×1)/中(2×1)真实占地都不高,共用一档紧凑卡(PREVIEW_SLOT_H + CARD_H);
 *   大(2×2)是「两格见方」,塞进和小卡一样高的卡里必然顶满——这就是用户说的
 *   「大 size 在 card 里放不下」。所以大档独立加高一整档卡(LARGE_*),预览用
 *   更大的缩放(LARGE_PREVIEW_SCALE),像桌面那样「占更大面积的 widget 就给它
 *   更大的块」,而不是把三档硬压成同一张卡。
 *
 *   为什么管理页不做成 Mac 桌面那种自由排布:挑选页的职责是整排扫读 + 挑档位,
 *   卡片正反面要绝对定位叠放(高度定死),自由摆放会互相遮挡、没法翻设置。
 *   自由排布属于首屏(WidgetLayer 的拖拽摆放),不是这一页。
 */

/* 小 / 中档:与 d6dff33 同一套基线,预览 82² / 169×82 落在 184 槽里 */
export const PREVIEW_SCALE = 0.60;
export const PREVIEW_SLOT_H = 184;

/* 大档:卡加高、预览放大到 220²(比基线 169 大 ~30%),槽 252 上下各留 ~16px */
export const LARGE_PREVIEW_SCALE = 0.78;
export const LARGE_PREVIEW_SLOT_H = 252;

/** 正面各行的版式;WidgetGallery 的 styled-components 从这里取值 */
export const GALLERY = {
  cardPadding: 14,
  titleFontSize: 13,
  titleLineHeight: 1.4,
  descMarginTop: 2,
  descFontSize: 11,
  descLineHeight: 1.5,
  /** 说明最多两行,卡片高度才对得齐 */
  descLines: 2,
  sizesMarginTop: 8,
  sizeBtnFontSize: 12,
};

/** 卡高预算:上下内边距 28 + 正面文字(标题一行 + 说明两行 + 尺寸行)≈73
    + 底部留底 ≈11,见 frontStackHeight。 */
const CARD_BUDGET = 112;

/** 小/中卡定高 = 预览槽 + 文字预算 */
export const CARD_H = PREVIEW_SLOT_H + CARD_BUDGET;
/** 大卡定高 = 大档预览槽 + 同样的文字预算 */
export const LARGE_CARD_H = LARGE_PREVIEW_SLOT_H + CARD_BUDGET;
/* 档位 → 尺寸档独有尺度。widgetSize(name) 给的是真实盒(136/282/282),缩放与槽按档位取 */
const SPEC = {
  small: { scale: PREVIEW_SCALE, slot: PREVIEW_SLOT_H, card: CARD_H },
  medium: { scale: PREVIEW_SCALE, slot: PREVIEW_SLOT_H, card: CARD_H },
  large: { scale: LARGE_PREVIEW_SCALE, slot: LARGE_PREVIEW_SLOT_H, card: LARGE_CARD_H },
};

const specFor = (name) => SPEC[name] || SPEC.small;

/** 该档位用的预览缩放(大档独立放大) */
export function previewScaleFor(name) {
  return specFor(name).scale;
}

/** 该档位的预览槽高 */
export function previewSlotFor(name) {
  return specFor(name).slot;
}

/** 该档位的卡片定高(大档加高) */
export function cardHeightFor(name) {
  return specFor(name).card;
}

/**
 * 真实卡片尺寸 → 画廊里的预览尺寸。previewBox 保持基线语义
 * (测试按它算 overflow),渲染层用 previewBoxFor(name) 取档位对应的尺寸。
 */
export function previewBox(size) {
  return {
    width: Math.round(size.width * PREVIEW_SCALE),
    height: Math.round(size.height * PREVIEW_SCALE),
  };
}

/** 按档位缩放的预览尺寸(小/中同基线,大档放大) */
export function previewBoxFor(name) {
  const box = widgetSize(name);
  return {
    width: Math.round(box.width * specFor(name).scale),
    height: Math.round(box.height * specFor(name).scale),
  };
}

/**
 * 正面内容总高:上下内边距 + 预览槽 + 标题一行 + 说明两行(+ 尺寸行)。
 * withSizes 对应「这组尺寸档渲染不渲染尺寸行」;算留白用 true(最坏情况)。
 * 基线语义按小/中档;大档槽更高,单独用 largeFrontStackHeight 核。
 */
export function frontStackHeight(withSizes) {
  return GALLERY.cardPadding * 2 + PREVIEW_SLOT_H + textRowsHeight(withSizes);
}

/** 大档正面的内容总高,须落在 LARGE_CARD_H 内 */
export function largeFrontStackHeight(withSizes) {
  return GALLERY.cardPadding * 2 + LARGE_PREVIEW_SLOT_H + textRowsHeight(withSizes);
}

function textRowsHeight(withSizes) {
  return (
    GALLERY.titleFontSize * GALLERY.titleLineHeight +
    GALLERY.descMarginTop +
    GALLERY.descLines * GALLERY.descFontSize * GALLERY.descLineHeight +
    (withSizes ? GALLERY.sizesMarginTop + GALLERY.sizeBtnFontSize : 0)
  );
}
