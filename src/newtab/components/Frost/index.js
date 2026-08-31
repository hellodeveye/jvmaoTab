import styled from "styled-components";

/* 毛玻璃改为"预模糊壁纸对齐"实现：不用 backdrop-filter（Chromium 分块光栅化
   会在其他元素动画/重绘时在卡片上闪现横向接缝），而是在卡片内放一个与壁纸
   同尺寸同 fit 模式的图层（::before），按卡片坐标反向偏移对齐后整体模糊，
   ::after 叠加着色。图层内容静态，光栅化一次后不会再因页面其他部分重绘而
   重新采样。

   使用方：
   - 祖先节点提供 --frost-bg-* 变量（壁纸 url 与 fit，见 FirstScreen 的 frostStyle）；
   - 卡片自身内联提供 --frost-shift（卡片在视口中的坐标取负，含拖拽位移）；
   - 需要品牌着色的卡片可覆盖 --frost-tint（默认沿用主题的 --homeNavBg）。
   卡片只出现在第一壁纸上，故无需处理 bg2。 */
const Frost = styled.div`
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  overflow: hidden;
  pointer-events: none;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    width: 100vw;
    height: 100vh;
    transform: var(--frost-shift, none);
    background-image: var(--frost-bg-image, none);
    background-repeat: var(--frost-bg-repeat, no-repeat);
    background-position: var(--frost-bg-position, center center);
    background-size: var(--frost-bg-size, cover);
    opacity: var(--homeImgOpacity, 1);
    filter: saturate(180%) blur(20px);
  }

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: var(--frost-tint, var(--homeNavBg));
  }
`;

export default Frost;
