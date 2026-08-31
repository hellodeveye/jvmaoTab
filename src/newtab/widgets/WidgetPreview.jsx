import React from "react";
import styled from "styled-components";
import { widgetSize, WIDGET_METRICS as M } from "./sizes";
import { scheme } from "./WidgetCard";

/** 组件库里的缩略图按真实卡片等比缩，尺寸档的差别才看得出来。
    0.62 是让最宽的中卡（282px）刚好落在栅格一格的内容宽里 */
export const PREVIEW_SCALE = 0.62;
const s = (n) => Math.round(n * PREVIEW_SCALE);

/* 首屏上卡片的材质是半透明的、压在预模糊壁纸上；设置弹窗里没有壁纸，
   所以垫一层中性灰当底，品牌色仍然透得出来，又不会因为直接铺在白底上而发灰。 */
const Shell = styled.div`
  flex: none;
  width: ${(props) => s(props.$size.width)}px;
  height: ${(props) => s(props.$size.height)}px;
  padding: ${s(M.padding)}px;
  border-radius: ${s(M.radius)}px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: ${(props) => props.$scheme.text};
  border: 1px solid ${(props) => props.$scheme.border};
  background-image: ${(props) => props.$tint},
    linear-gradient(150deg, #9aa1a8 0%, #767c83 100%);
  opacity: ${(props) => (props.$dim ? 0.55 : 1)};
  filter: ${(props) => (props.$dim ? "saturate(0.5)" : "none")};
  transition: opacity 0.2s ease, filter 0.2s ease;
`;

const Title = styled.div`
  font-size: ${Math.max(9, s(M.headFontSize))}px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.04em;
  opacity: 0.88;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Bone = styled.div`
  margin-top: ${s(M.valueOffset)}px;
  width: ${(props) => s(props.$size.valueFontSize * 2.6)}px;
  height: ${(props) => s(props.$size.valueFontSize)}px;
  border-radius: 3px;
  background: currentColor;
  opacity: 0.32;
`;

/**
 * 组件缩略图。只画外形——材质、尺寸档、标题位置，不编造数值：
 * 组件库是用来挑「哪个组件」的，不是用来看数据的。
 * 需要更贴近实物的组件可以在定义里自带 Preview 覆盖掉这里。
 */
const WidgetPreview = (props) => {
  const { definition, size, dim } = props;
  if (definition.Preview)
    return <definition.Preview definition={definition} size={size} dim={dim} />;
  const box = widgetSize(size);
  return (
    <Shell
      $size={box}
      $scheme={scheme(definition.scheme)}
      $tint={definition.tint}
      $dim={dim}
    >
      <Title>{definition.title}</Title>
      <Bone $size={box} />
    </Shell>
  );
};

export default WidgetPreview;
