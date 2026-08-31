import React from "react";
import { observer } from "mobx-react";
import styled from "styled-components";
import { IconPlus, IconMinus, IconSettings, IconArrowBackUp } from "@tabler/icons-react";
import useStores from "~/hooks/useStores";
import { WIDGETS, getWidget } from "~/widgets/registry";
import {
  listInstances,
  createInstance,
  updateInstance,
  updateInstanceConfig,
  removeInstance,
  WIDGETS_KEY,
} from "~/widgets/instances";
import { toPlain } from "~/widgets/plain";
import {
  checkAvailable,
  settingValue,
  hasSettings,
  hasConfig,
} from "~/widgets/settings";
import { placeNewWidget } from "~/widgets/layout";
import { dropWidgetData } from "~/widgets/storage";
import WidgetPreview from "~/widgets/WidgetPreview";
import SettingsForm from "~/widgets/SettingsForm";
import { SIZE_LABELS } from "~/widgets/sizes";

/* 卡片正反面绝对定位叠在一起，高度就必须先定死。
   正面 = 预览槽 + 标题 + 两行说明 + 尺寸档 + 上下内边距；
   背面（一个表单）比这矮，超了也有 overflow 兜着。 */
const PREVIEW_H = 176;
const CARD_H = PREVIEW_H + 100;

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

const PageDesc = styled.div`
  font-size: 12px;
  color: var(--colorTextSecondary);
  line-height: 1.6;
`;

const Section = styled.div`
  margin: 32px 0 12px;
  font-size: 13px;
  font-weight: 600;
`;

const Group = styled.div`
  margin: 20px 0 10px;
  font-size: 11px;
  color: var(--colorTextSecondary);
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
`;

/* 翻转靠 3D：父级给透视，内层整体转 180°，两面各自背面不可见。
   不可见的那一面还是会吃点击，所以要连 pointer-events 一起关掉。 */
const Flip = styled.div`
  position: relative;
  height: ${CARD_H}px;
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
  padding: 14px;
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

/* 角标按钮常驻而不是 hover 才出现：这一页的全部操作就它们两个，
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
  height: ${PREVIEW_H}px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Title = styled.div`
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Desc = styled.div`
  margin-top: 2px;
  font-size: 11px;
  color: var(--colorTextSecondary);
  line-height: 1.5;
  /* 说明最多两行，卡片高度才对得齐 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

/* 尺寸档不用 Segmented：那个白底方块组在这种卡片里太重，
   降成一排文字，选中的实一点就够了 */
const Sizes = styled.div`
  margin-top: 8px;
  display: flex;
  gap: 10px;
`;

const SizeBtn = styled.button`
  padding: 0;
  border: 0;
  background: none;
  font-size: 12px;
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

/** 组件库按 group 分段，同段里的卡片共用一个栅格 */
const GROUPS = WIDGETS.reduce((out, definition) => {
  const last = out[out.length - 1];
  if (last && last.name === definition.group) last.items.push(definition);
  else out.push({ name: definition.group, items: [definition] });
  return out;
}, []);

/** 一张卡：正面是组件本身，背面是它的设置，右上角一个 + 或 − */
const GalleryCard = (props) => {
  const {
    definition,
    size,
    onSize,
    action,
    actionDisabled,
    actionTitle,
    title,
    desc,
    schema,
    values,
    onSave,
    onClear,
    settingsAttention,
  } = props;
  const [flipped, setFlipped] = React.useState(false);
  const canFlip = schema && schema.length > 0;

  return (
    <Flip>
      <Inner $flipped={flipped}>
        <Front $flipped={flipped}>
          <Corner>
            {canFlip ? (
              <Round
                type="button"
                title="设置"
                $attention={settingsAttention}
                onClick={() => setFlipped(true)}
              >
                <IconSettings size={13} stroke={1.8} />
              </Round>
            ) : null}
            <Round
              type="button"
              title={actionTitle}
              disabled={actionDisabled}
              onClick={action.onClick}
            >
              {action.icon}
            </Round>
          </Corner>
          <PreviewSlot>
            <WidgetPreview definition={definition} size={size} dim={actionDisabled} />
          </PreviewSlot>
          <Title>{title}</Title>
          <Desc>{desc}</Desc>
          {definition.sizes.length > 1 ? (
            <Sizes>
              {definition.sizes.map((one) => (
                <SizeBtn
                  key={one}
                  type="button"
                  $active={one === size}
                  onClick={() => onSize(one)}
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
          {canFlip ? (
            <SettingsForm
              schema={schema}
              values={values}
              onSave={onSave}
              onClear={onClear}
            />
          ) : null}
        </Back>
      </Inner>
    </Flip>
  );
};

/**
 * 小组件页：上面是已添加的实例（右上角 − 移除），下面是组件库（右上角 + 添加）。
 * 这一页对组件种类是无知的：卡片、缩略图、可用性、设置表单全部走注册表字段，
 * 以后加待办、天气之类的组件都不需要再动这里。
 */
const WidgetGallery = () => {
  const { option } = useStores();
  const item = option.item;
  const instances = listInstances(item);

  // 组件库里每种组件当前选中的档位；没选过就用定义里的第一档
  const [picked, setPicked] = React.useState({});

  const save = (next) =>
    option.setItem(WIDGETS_KEY, next, false).catch((err) => {
      console.error(`[${WIDGETS_KEY}] save failed:`, err);
    });

  const add = (definition) => {
    const size = picked[definition.type] || definition.sizes[0];
    const position = placeNewWidget(instances, size);
    save([...instances.map(toPlain), createInstance(definition, size, position)]);
  };

  const drop = async (instance) => {
    await save(removeInstance(instances, instance.id));
    // 实例没了，它的数据行也不该留在库里和导出文件里
    await dropWidgetData(option, instance.id);
  };

  const saveSetting = (key, value) => option.setItem(key, value);

  const settingValues = (definition) =>
    Object.fromEntries(
      (definition.settings || []).map((field) => [field.key, settingValue(field, item)])
    );

  return (
    <Warp className="widget-workspace">
      <PageTitle>小组件</PageTitle>
      <PageDesc>添加到首屏右上角，可以直接拖动调整位置。</PageDesc>

      {instances.length > 0 ? (
        <>
          <Section>已添加</Section>
          <Grid>
            {instances.map((instance) => {
              const definition = getWidget(instance.type);
              return (
                <GalleryCard
                  key={instance.id}
                  definition={definition}
                  size={instance.size}
                  onSize={(next) =>
                    save(updateInstance(instances, instance.id, { size: next }))
                  }
                  action={{
                    icon: <IconMinus size={14} stroke={2} />,
                    onClick: () => drop(instance),
                  }}
                  actionTitle="从首屏移除"
                  title={definition.instanceTitle?.(instance) || definition.title}
                  desc={definition.summary}
                  schema={hasConfig(definition) ? definition.configSchema : null}
                  values={toPlain(instance.config || {})}
                  onSave={(key, value) =>
                    save(updateInstanceConfig(instances, instance.id, key, value))
                  }
                  onClear={(key) =>
                    save(updateInstanceConfig(instances, instance.id, key, ""))
                  }
                />
              );
            })}
          </Grid>
        </>
      ) : null}

      <Section>组件库</Section>
      {GROUPS.map((group) => (
        <React.Fragment key={group.name}>
          <Group>{group.name}</Group>
          <Grid>
            {group.items.map((definition) => {
              const availability = checkAvailable(definition, item);
              const size = picked[definition.type] || definition.sizes[0];
              return (
                <GalleryCard
                  key={definition.type}
                  definition={definition}
                  size={size}
                  onSize={(next) => setPicked({ ...picked, [definition.type]: next })}
                  action={{
                    icon: <IconPlus size={14} stroke={2} />,
                    onClick: () => add(definition),
                  }}
                  actionDisabled={!availability.ok}
                  actionTitle={availability.ok ? "添加到首屏" : availability.reason}
                  title={definition.title}
                  desc={definition.summary}
                  settingsAttention={!availability.ok}
                  schema={hasSettings(definition) ? definition.settings : null}
                  values={settingValues(definition)}
                  onSave={saveSetting}
                  onClear={(key) => saveSetting(key, "")}
                />
              );
            })}
          </Grid>
        </React.Fragment>
      ))}
      {WIDGETS.length === 0 ? <Empty>还没有可用的组件。</Empty> : null}

      <Footer>
        密钥只保存在本机，不参与 WebDAV / Gist 同步，也不会出现在导出的数据文件里；
        换设备需要重新填写。
      </Footer>
    </Warp>
  );
};

export default observer(WidgetGallery);
