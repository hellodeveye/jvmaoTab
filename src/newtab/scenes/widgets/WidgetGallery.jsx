import React from "react";
import { observer } from "mobx-react";
import styled from "styled-components";
import { IconPlus, IconMinus, IconSettings, IconArrowBackUp } from "@tabler/icons-react";
import useStores from "~/hooks/useStores";
import { WIDGETS } from "~/widgets/registry";
import {
  WIDGETS_KEY,
  addInstance,
  listInstancesWithDedup,
  updateInstance,
  updateInstanceConfig,
  removeInstance,
} from "~/widgets/instances";
import { galleryCards, applyDedupe } from "~/widgets/galleryModel";
import { placeNewWidget } from "~/widgets/layout";
import { dropWidgetData } from "~/widgets/storage";
import WidgetPreview from "~/widgets/WidgetPreview";
import SettingsForm from "~/widgets/SettingsForm";
import { SIZE_LABELS } from "~/widgets/sizes";
import { cardHeightFor, GALLERY, previewSlotFor } from "~/widgets/galleryLayout";

const Warp = styled.section`
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px 28px 80px;
  box-sizing: border-box;

  @media (max-width: 1100px) {
    padding: 20px 20px 64px;
  }
`;

const PageTitle = styled.h1`
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 4px;
`;

/* 一句话说明「卡上挑档位、首屏自由摆」:尺寸在组件库里换,
   真正像 Mac 桌面那样随手摆是首屏的事(见首屏拖拽),不是这页。 */
const PageDesc = styled.div`
  font-size: 12px;
  color: var(--colorTextSecondary);
  line-height: 1.6;
`;

/* 单列表:整页一个栅格,每种组件恰好一张卡。
   以前分「已添加 / 组件库」两栏,加过的组件就会在页面上出现两遍;
   现在卡片自己带状态,未添加显 +,已添加可移除。
   列宽下限按「大档预览(220px)两侧也能留边」定;卡高不统一——大档 tile
   加高(cardHeightFor),像桌面那样让大 widget 占更大的块,而不是硬塞小卡。 */
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(264px, 1fr));
  gap: 16px;
  margin-top: 20px;
`;

/* 翻转靠 3D:父级给透视,内层整体转 180°,两面各自背面不可见。
   不可见的那一面还是会吃点击,所以要连 pointer-events 一起关掉。
   高随档位走:小/中 296,大 364(见 galleryLayout 的两级 tile 说明)。 */
const Flip = styled.div`
  position: relative;
  height: ${(props) => props.$h}px;
  perspective: 1200px;
`;

const Inner = styled.div`
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transition: transform 0.45s cubic-bezier(0.4, 0.1, 0.2, 1);
  transform: rotateY(${(props) => (props.$flipped ? "180deg" : "0deg")});
`;

const Face = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  padding: ${GALLERY.cardPadding}px;
  box-sizing: border-box;
  border-radius: 14px;
  border: 1px solid var(--colorBorderSecondary, rgba(0, 0, 0, 0.06));
  background: var(--colorBgContainer, #fff);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
`;

const Front = styled(Face)`
  pointer-events: ${(props) => (props.$flipped ? "none" : "auto")};

  &:hover {
    border-color: var(--colorBorder, rgba(0, 0, 0, 0.12));
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
  }
`;

const Back = styled(Face)`
  transform: rotateY(180deg);
  pointer-events: ${(props) => (props.$flipped ? "auto" : "none")};
  overflow-y: auto;
`;

/* 角标按钮常驻而不是 hover 才出现:这一页的全部操作就它们两个,
   藏起来只会让人不知道从哪下手 */
const Corner = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 6px;
  z-index: 1;
`;

const Round = styled.button`
  width: 24px;
  height: 24px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid var(--colorBorder, rgba(0, 0, 0, 0.14));
  background: var(--colorBgContainer, #fff);
  color: var(--colorText);
  cursor: pointer;
  opacity: ${(props) => (props.$attention ? 1 : 0.6)};
  border-color: ${(props) =>
    props.$attention ? "var(--colorText)" : "var(--colorBorder, rgba(0, 0, 0, 0.14))"};
  transition: opacity 0.2s ease, background 0.2s ease, color 0.2s ease;

  &:hover:not(:disabled) {
    opacity: 1;
    background: var(--colorText);
    color: var(--colorBgContainer, #fff);
  }

  &:disabled {
    opacity: 0.25;
    cursor: not-allowed;
  }
`;

const PreviewSlot = styled.div`
  height: ${(props) => props.$h}px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Title = styled.div`
  font-size: ${GALLERY.titleFontSize}px;
  font-weight: 600;
  line-height: ${GALLERY.titleLineHeight};
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Desc = styled.div`
  margin-top: ${GALLERY.descMarginTop}px;
  font-size: ${GALLERY.descFontSize}px;
  color: var(--colorTextSecondary);
  line-height: ${GALLERY.descLineHeight};
  /* 说明最多两行,卡片高度才对得齐 */
  display: -webkit-box;
  -webkit-line-clamp: ${GALLERY.descLines};
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

/* 尺寸档不用 Segmented:那个白底方块组在这种卡片里太重,
   降成一排文字,选中的实一点就够了 */
const Sizes = styled.div`
  margin-top: ${GALLERY.sizesMarginTop}px;
  display: flex;
  gap: 10px;
`;

const SizeBtn = styled.button`
  padding: 0;
  border: 0;
  background: none;
  font-size: ${GALLERY.sizeBtnFontSize}px;
  line-height: 1;
  cursor: pointer;
  color: var(--colorText);
  opacity: ${(props) => (props.$active ? 1 : 0.35)};
  font-weight: ${(props) => (props.$active ? 600 : 400)};
  transition: opacity 0.2s ease;

  &:hover {
    opacity: ${(props) => (props.$active ? 1 : 0.7)};
  }
`;

const BackTitle = styled.div`
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 10px;
  padding-right: 28px;
`;

/* 背面同时有类型设置(如密钥)和此卡设置(如清单名)时,用小标题分开 */
const BackLabel = styled.div`
  font-size: 11px;
  color: var(--colorTextSecondary);
  margin: 12px 0 6px;

  & + * {
    margin-top: 0;
  }
`;

const Empty = styled.div`
  font-size: 12px;
  color: var(--colorTextSecondary);
`;

const Footer = styled.div`
  margin-top: 32px;
  font-size: 11px;
  color: var(--colorTextSecondary);
  line-height: 1.6;
`;

/** 一张卡:正面是组件本身,背面是它的设置,右上角一个 + 或 − */
const GalleryCard = (props) => {
  const {
    card,
    size,
    onResize,
    onAdd,
    onRemove,
    onSaveSetting,
    onClearSetting,
    onSaveConfig,
    onClearConfig,
  } = props;
  const {
    definition,
    instance,
    added,
    canAdd,
    addReason,
    attention,
    settingsSchema,
    configSchema,
    settingsValues,
    configValues,
  } = card;
  const [flipped, setFlipped] = React.useState(false);
  const canFlip = !!(settingsSchema || configSchema);
  const title = added ? definition.instanceTitle?.(instance) || definition.title : definition.title;
  const tileH = cardHeightFor(size);
  const slotH = previewSlotFor(size);

  return (
    <Flip $h={tileH}>
      <Inner $flipped={flipped}>
        <Front $flipped={flipped}>
          <Corner>
            {canFlip ? (
              <Round
                type="button"
                title="设置"
                $attention={attention}
                onClick={() => setFlipped(true)}
              >
                <IconSettings size={13} stroke={1.8} />
              </Round>
            ) : null}
            {added ? (
              <Round type="button" title="从首屏移除" onClick={onRemove}>
                <IconMinus size={14} stroke={2} />
              </Round>
            ) : (
              <Round
                type="button"
                title={addReason}
                disabled={!canAdd}
                onClick={onAdd}
              >
                <IconPlus size={14} stroke={2} />
              </Round>
            )}
          </Corner>
          <PreviewSlot $h={slotH}>
            <WidgetPreview
              definition={definition}
              size={size}
              dim={!added && !canAdd}
            />
          </PreviewSlot>
          <Title>{title}</Title>
          <Desc>{definition.summary}</Desc>
          {definition.sizes.length > 1 ? (
            <Sizes>
              {definition.sizes.map((one) => (
                <SizeBtn
                  key={one}
                  type="button"
                  $active={one === size}
                  onClick={() => onResize(one)}
                >
                  {SIZE_LABELS[one]}
                </SizeBtn>
              ))}
            </Sizes>
          ) : null}
        </Front>
        <Back $flipped={flipped}>
          <Corner>
            <Round type="button" title="返回" onClick={() => setFlipped(false)}>
              <IconArrowBackUp size={13} stroke={1.8} />
            </Round>
          </Corner>
          <BackTitle>{title}</BackTitle>
          {settingsSchema && configSchema ? <BackLabel>组件设置</BackLabel> : null}
          {settingsSchema ? (
            <SettingsForm
              schema={settingsSchema}
              values={settingsValues}
              onSave={onSaveSetting}
              onClear={onClearSetting}
            />
          ) : null}
          {settingsSchema && configSchema ? <BackLabel>此卡设置</BackLabel> : null}
          {configSchema ? (
            <SettingsForm
              schema={configSchema}
              values={configValues}
              onSave={onSaveConfig}
              onClear={onClearConfig}
            />
          ) : null}
        </Back>
      </Inner>
    </Flip>
  );
};

/**
 * 小组件页:整页一个栅格,每种组件恰好一张卡(模型见 galleryModel)。
 * 这一页对组件种类是无知的:卡片、缩略图、可用性、设置表单全部走注册表字段,
 * 以后加待办、天气之类的组件都不需要再动这里。
 */
const WidgetGallery = () => {
  const { option } = useStores();
  const item = option.item;
  // 读出即去重:存储里留着的重复实例在这里被挡住,视图永远每种类型至多一张
  const dedup = listInstancesWithDedup(item);
  const instances = dedup.instances;
  const cards = galleryCards(WIDGETS, instances, item);

  // 尚未添加的卡在组件库里选中的档位;没选过就用定义里的第一档
  const [picked, setPicked] = React.useState({});

  const save = (next) =>
    option.setItem(WIDGETS_KEY, next, false).catch((err) => {
      console.error(`[${WIDGETS_KEY}] save failed:`, err);
    });

  // 打开本页时把去重结果落一次盘,被丢实例的数据行(待办条目等)一起清掉;
  // 无重复时 applyDedupe 是 no-op,读写都不发生
  React.useEffect(() => {
    applyDedupe(option, listInstancesWithDedup(option.item)).catch((err) => {
      console.error(`[${WIDGETS_KEY}] dedupe failed:`, err);
    });
  }, [option, item]);

  const add = (card) => {
    const type = card.definition.type;
    const size = picked[type] || card.definition.sizes[0];
    save(addInstance(instances, card.definition, size, placeNewWidget(instances, size)));
  };

  const drop = async (card) => {
    const id = card.instance.id;
    await save(removeInstance(instances, id));
    // 实例没了,它的数据行也不该留在库里和导出文件里
    await dropWidgetData(option, id);
  };

  return (
    <Warp className="widget-workspace">
      <PageTitle>小组件</PageTitle>
      <PageDesc>
        在卡上挑尺寸档位，加到首屏后可像 Mac 桌面一样随意拖动摆放。
      </PageDesc>

      <Grid>
        {cards.map((card) => {
          const { definition, instance, added } = card;
          const size = added
            ? instance.size
            : picked[definition.type] || definition.sizes[0];
          return (
            <GalleryCard
              key={definition.type}
              card={card}
              size={size}
              onResize={(next) =>
                added
                  ? save(updateInstance(instances, instance.id, { size: next }))
                  : setPicked({ ...picked, [definition.type]: next })
              }
              onAdd={() => add(card)}
              onRemove={() => drop(card)}
              onSaveSetting={(key, value) => option.setItem(key, value)}
              onClearSetting={(key) => option.setItem(key, "")}
              onSaveConfig={(key, value) =>
                save(updateInstanceConfig(instances, instance.id, key, value))
              }
              onClearConfig={(key) =>
                save(updateInstanceConfig(instances, instance.id, key, ""))
              }
            />
          );
        })}
      </Grid>
      {WIDGETS.length === 0 ? <Empty>还没有可用的组件。</Empty> : null}

      <Footer>
        密钥只保存在本机，不参与 WebDAV / Gist 同步，也不会出现在导出的数据文件里；
        换设备需要重新填写。
      </Footer>
    </Warp>
  );
};

export default observer(WidgetGallery);
