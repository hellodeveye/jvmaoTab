import React from "react";
import styled from "styled-components";
import { widgetSize, WIDGET_METRICS as M } from "./sizes";
import { previewScaleFor, previewBoxFor } from "./galleryLayout";
import { scheme } from "./WidgetCard";

/* 缩略图里的留白/字号也按同一比例缩 */
const s = (scale, n) => Math.round(n * scale);

/* 首屏上卡片的材质是半透明的、压在预模糊壁纸上；设置弹窗里没有壁纸，
   所以垫一层中性灰当底，品牌色仍然透得出来，又不会因为直接铺在白底上而发灰。 */
const Shell = styled.div`
  flex: none;
  width: ${(props) => props.$w}px;
  height: ${(props) => props.$h}px;
  padding: ${(props) => props.$pad}px;
  border-radius: ${(props) => props.$radius}px;
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
  font-size: ${(props) => Math.max(9, s(props.$scale, M.headFontSize))}px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.04em;
  opacity: 0.88;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Bone = styled.div`
  margin-top: ${(props) => s(props.$scale, M.valueOffset)}px;
  width: ${(props) => s(props.$scale, props.$box.valueFontSize * 2.6)}px;
  height: ${(props) => s(props.$scale, props.$box.valueFontSize)}px;
  border-radius: 3px;
  background: currentColor;
  opacity: 0.32;
`;

/**
 * 组件缩略图。只画外形——材质、尺寸档、标题位置，不编造数值：
 * 组件库是用来挑「哪个组件」的，不是用来看数据的。
 * 需要更贴近实物的组件可以在定义里自带 Preview 覆盖掉这里。
 *
 * 缩放按档位取:大档(2×2)用独立放大档,在小/中卡的同一套比例下
 * 会显得「放不下」,大档 tile 在卡片里是加高的一档(galleryLayout 的
 * LARGE_*),预览因此也能放大到 220² 而四周仍留白。
 */
const WidgetPreview = (props) => {
  const { definition, size, dim } = props;
  if (definition.Preview)
    return <definition.Preview definition={definition} size={size} dim={dim} />;
  const box = widgetSize(size);
  const scale = previewScaleFor(size);
  const preview = previewBoxFor(size);
  return (
    <Shell
      $w={preview.width}
      $h={preview.height}
      $pad={s(scale, M.padding)}
      $radius={s(scale, M.radius)}
      $scheme={scheme(definition.scheme)}
      $tint={definition.tint}
      $dim={dim}
    >
      <Title $scale={scale}>{definition.title}</Title>
      <Bone $scale={scale} $box={box} />
    </Shell>
  );
};

export default WidgetPreview;
