import styled from "styled-components";
import { HOME_ENTER } from "~/utils";

/* 首屏上的浮层容器（抽屉分组、AI 额度卡片）。
   stickled 时窗格保持挂载（卸载重挂会让下面的过渡失效），
   用 visibility 而非仅 opacity：一并屏蔽命中测试、Tab 焦点与无障碍树。
   CSS 对 visibility 过渡有特殊规则——淡出期间保持 visible，淡入时立即可见。
   时长与缓动同步自壁纸入场，否则返回首页时窗格会先于壁纸出现。 */
const StickledLayer = styled.div`
  position: absolute;
  inset: 0;
  z-index: ${(props) => (props.stickled ? "-1" : "50")};
  opacity: ${(props) => (props.stickled ? 0 : 1)};
  visibility: ${(props) => (props.stickled ? "hidden" : "visible")};
  transition: opacity ${HOME_ENTER.duration}s ${HOME_ENTER.cssEase},
    visibility ${HOME_ENTER.duration}s ${HOME_ENTER.cssEase};
  overflow: hidden;
  pointer-events: none;
`;

export default StickledLayer;
