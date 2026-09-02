import React from "react";
import styled from "styled-components";
import { widgetSize, WIDGET_METRICS as M } from "./sizes";
import { scheme } from "./WidgetCard";

/* 首屏上卡片的材质是半透明的、压在预模糊壁纸上；管理页没有壁纸，
   所以垫一层中性灰当底，品牌色仍然透得出来，又不会因为直接铺在白底上而发灰。 */
const Shell = styled.div`
  flex: none;
  width: ${(props) => props.$box.width}px;
  height: ${(props) => props.$box.height}px;
  padding: ${M.padding}px;
  border-radius: ${M.radius}px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  color: ${(props) => props.$scheme.text};
  border: 1px solid ${(props) => props.$scheme.border};
  background-image: ${(props) => props.$tint}, linear-gradient(150deg, #9aa1a8 0%, #767c83 100%);
  opacity: ${(props) => (props.$dim ? 0.55 : 1)};
  filter: ${(props) => (props.$dim ? "saturate(0.5)" : "none")};
  transition:
    opacity 0.2s ease,
    filter 0.2s ease;
`;

const Title = styled.div`
  font-size: ${M.headFontSize}px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.04em;
  opacity: 0.88;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

/* 「数值区」的占位块:按该档位的数值字号走,锚在标题下固定偏移,
   与真实卡片的排布同一套 M —— 预览留白/比例因此和实物一致 */
const Value = styled.div`
  margin-top: ${M.valueOffset}px;
  width: ${(props) => Math.round(props.$box.valueFontSize * 2.2)}px;
  height: ${(props) => Math.round(props.$box.valueFontSize * 0.72)}px;
  border-radius: 4px;
  background: currentColor;
  opacity: 0.3;
`;

const Spacer = styled.div`
  flex: 1;
`;

/* 底部的两行「元信息」占位:不同档位的卡片都在贴底排更新时间之类的行,
   留两根短条就不至于大档卡片里只有孤零零一个数字块 */
const Meta = styled.div`
  width: ${(props) => props.$w}%;
  height: ${(props) => Math.max(8, Math.round(M.metaFontSize * 0.8))}px;
  border-radius: 2px;
  background: currentColor;
  opacity: 0.2;
  margin-top: ${M.metaGap}px;

  &:first-of-type {
    margin-top: 0;
  }
`;

/**
 * 组件缩略图,按真实尺寸渲染 —— 管理页上的预览就是首屏那张卡的原大,
 * 选档位时看到的就是加上去的效果。只画外形(材质、标题位置、数值占位),
 * 不编造数值:组件库是用来挑「哪个组件」的,不是用来看数据的。
 * 需要更贴近实物的组件可以在定义里自带 Preview 覆盖掉这里。
 */
const WidgetPreview = (props) => {
  const { definition, size, dim } = props;
  if (definition.Preview)
    return <definition.Preview definition={definition} size={size} dim={dim} />;
  const box = widgetSize(size);
  return (
    <Shell $box={box} $scheme={scheme(definition.scheme)} $tint={definition.tint} $dim={dim}>
      <Title>{definition.title}</Title>
      <Value $box={box} />
      <Spacer />
      <Meta $w={58} />
      <Meta $w={34} />
    </Shell>
  );
};

export default WidgetPreview;
