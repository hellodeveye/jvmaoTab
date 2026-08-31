/**
 * 组件尺寸档，沿用苹果那套栅格比例：
 * 小卡是正方形的一个格；中卡横向两格；大卡两格见方。
 * 宽高固定（不再 fit-content），卡片才不会因为文案长短而参差。
 *
 * 内容按「头部贴顶、数值贴底」排布，于是不同档位的卡片放在一起时，
 * 标题行与数值行各自成线。
 */
const UNIT = 158;
export const WIDGET_GAP = 12;

const span = (cols, rows) => ({
  width: cols * UNIT + (cols - 1) * WIDGET_GAP,
  height: rows * UNIT + (rows - 1) * WIDGET_GAP,
});

export const WIDGET_SIZES = {
  small: { ...span(1, 1), valueFontSize: 30, unitFontSize: 18 },
  medium: { ...span(2, 1), valueFontSize: 32, unitFontSize: 19 },
  large: { ...span(2, 2), valueFontSize: 40, unitFontSize: 24 },
};

export const DEFAULT_SIZE = "small";

export function widgetSize(name) {
  return WIDGET_SIZES[name] || WIDGET_SIZES[DEFAULT_SIZE];
}

/**
 * 默认位置：右上角起，按各卡实际高度依次向下排成一列。
 * 从尺寸推导而非手写坐标，改了尺寸档也不会错位。
 */
export function stackDefaultPositions(providers, { right = 24, top = 20 } = {}) {
  let offset = top;
  const positions = {};
  providers.forEach((provider) => {
    positions[provider.id] = { right, top: offset };
    offset += widgetSize(provider.size).height + WIDGET_GAP;
  });
  return positions;
}
