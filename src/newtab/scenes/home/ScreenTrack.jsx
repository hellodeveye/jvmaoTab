import React from "react";
import styled from "styled-components";

/* 双屏横向轨道:两个全宽 pane 并排,切屏只动 translateX(偏移由 FirstScreen
   按 currentScreen 算好传入)。轨道有 transform,天然是一个 stacking context,
   pane 内部的 z 层级(组件层 50、壁纸交互层 20)被关在轨道里,
   不会压到管理页(Main, z-index: 2)之上。
   壁纸层不在轨道内:两屏共用同一张壁纸,切屏只有内容横向滑动、壁纸不动。 */
const Track = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: stretch;
  /* 两个 100% pane 拼出 200vw 内容,必须截断,否则底部出横向滚动条 */
  overflow: hidden;
  transition: transform 0.4s cubic-bezier(0.22, 0.61, 0.36, 1);
  will-change: transform;
`;

const Pane = styled.div`
  position: relative;
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

const ScreenTrack = (props) => {
  const { style, children } = props;
  return (
    <Track style={style} aria-live="polite">
      {children}
    </Track>
  );
};

ScreenTrack.Pane = Pane;

export default ScreenTrack;
