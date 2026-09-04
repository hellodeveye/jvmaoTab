import React from "react";
import { getViewportSize } from "~/utils/homeLinkLayout";

/**
 * 视口尺寸，rAF 节流。
 * 用 window.innerWidth/Height 而不是观察某个元素：首屏浮层要按视口夹取坐标，
 * 而元素的内容盒会随入场动画期间的内容高度变化反复触发，白白重排。
 */
export default function useLiveViewportSize() {
  const [viewport, setViewport] = React.useState(getViewportSize);

  React.useEffect(() => {
    let frameId = null;

    const handleResize = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        setViewport(getViewportSize());
      });
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, []);

  return viewport;
}
