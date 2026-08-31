import React from "react";
import { observer } from "mobx-react";
import styled from "styled-components";
import { Button, Segmented, Tag } from "antd";
import { IconPlus, IconMinus, IconSettings } from "@tabler/icons-react";
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

/* PublicModal 自己不限高，长列表得在这里滚，
   否则组件多了会把弹窗撑出屏幕 */
const Wrap = styled.div`
  max-height: 520px;
  overflow-y: auto;
  padding: 4px 4px 0;
  margin: -4px -4px 0;
`;

const Section = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: var(--colorTextSecondary);
  margin: 0 0 10px;

  &:not(:first-child) {
    margin-top: 24px;
  }
`;

const Group = styled.div`
  font-size: 11px;
  color: var(--colorTextSecondary);
  margin: 16px 0 8px;
  opacity: 0.8;
`;

const Card = styled.div`
  border-radius: 12px;
  border: 1px solid var(--colorBorderSecondary, rgba(0, 0, 0, 0.06));
  overflow: hidden;

  & + & {
    margin-top: 10px;
  }
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px;
`;

const Info = styled.div`
  flex: 1;
  min-width: 0;
`;

const Name = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
`;

const Desc = styled.div`
  margin-top: 4px;
  font-size: 12px;
  color: var(--colorTextSecondary);
  line-height: 1.5;
`;

/* 首选项本身已经在 Modal 里，设置再套一层弹窗操作起来很别扭，所以行内展开 */
const Panel = styled.div`
  padding: 14px 12px;
  border-top: 1px solid var(--colorBorderSecondary, rgba(0, 0, 0, 0.06));
  background: var(--colorFillQuaternary, rgba(0, 0, 0, 0.02));
`;

const Empty = styled.div`
  font-size: 12px;
  color: var(--colorTextSecondary);
  padding: 4px 0 0;
`;

const Footer = styled.div`
  margin-top: 20px;
  font-size: 11px;
  color: var(--colorTextSecondary);
  line-height: 1.6;
`;

const sizeOptions = (sizes) =>
  sizes.map((size) => ({ label: SIZE_LABELS[size], value: size }));

/**
 * 组件库 + 已添加实例的管理。
 * 这一页对组件种类是无知的：列表、缩略图、可用性、设置表单全部走注册表字段，
 * 以后加待办、天气之类的组件都不需要再动这里。
 */
const PreferencesWidgets = () => {
  const { option } = useStores();
  const item = option.item;
  const instances = listInstances(item);

  // 组件库里每种组件当前选中的档位；没选过就用定义里的第一档
  const [picked, setPicked] = React.useState({});
  const [openType, setOpenType] = React.useState(null);
  const [openInstance, setOpenInstance] = React.useState(null);

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
    if (openInstance === instance.id) setOpenInstance(null);
  };

  const saveSetting = (key, value) => option.setItem(key, value);

  return (
    <Wrap className="scroll-container">
      <Section>组件库</Section>
      {WIDGETS.map((definition, index) => {
        const availability = checkAvailable(definition, item);
        const size = picked[definition.type] || definition.sizes[0];
        const count = instances.filter((one) => one.type === definition.type).length;
        const group =
          index === 0 || WIDGETS[index - 1].group !== definition.group
            ? definition.group
            : null;
        const settingsOpen = openType === definition.type;

        return (
          <React.Fragment key={definition.type}>
            {group ? <Group>{group}</Group> : null}
            <Card>
              <Row>
                <WidgetPreview
                  definition={definition}
                  size={size}
                  dim={!availability.ok}
                />
                <Info>
                  <Name>
                    {definition.title}
                    {count > 0 ? <Tag bordered={false}>已添加 {count}</Tag> : null}
                  </Name>
                  <Desc>{availability.ok ? definition.summary : availability.reason}</Desc>
                  {definition.sizes.length > 1 ? (
                    <div style={{ marginTop: 8 }}>
                      <Segmented
                        size="small"
                        options={sizeOptions(definition.sizes)}
                        value={size}
                        onChange={(next) =>
                          setPicked({ ...picked, [definition.type]: next })
                        }
                      />
                    </div>
                  ) : null}
                </Info>
                {hasSettings(definition) ? (
                  <Button
                    size="small"
                    icon={<IconSettings size={14} />}
                    type={availability.ok ? "default" : "primary"}
                    onClick={() => setOpenType(settingsOpen ? null : definition.type)}
                  >
                    设置
                  </Button>
                ) : null}
                <Button
                  size="small"
                  type="primary"
                  icon={<IconPlus size={14} />}
                  disabled={!availability.ok}
                  onClick={() => add(definition)}
                >
                  添加
                </Button>
              </Row>
              {settingsOpen ? (
                <Panel>
                  <SettingsForm
                    schema={definition.settings}
                    values={Object.fromEntries(
                      definition.settings.map((field) => [
                        field.key,
                        settingValue(field, item),
                      ])
                    )}
                    onSave={saveSetting}
                    onClear={(key) => saveSetting(key, "")}
                  />
                </Panel>
              ) : null}
            </Card>
          </React.Fragment>
        );
      })}

      <Section>已添加</Section>
      {instances.length === 0 ? (
        <Empty>还没有添加任何组件。</Empty>
      ) : (
        instances.map((instance) => {
          const definition = getWidget(instance.type);
          const configOpen = openInstance === instance.id;
          return (
            <Card key={instance.id}>
              <Row>
                <Info>
                  <Name>
                    {definition.instanceTitle?.(instance) || definition.title}
                  </Name>
                  {definition.sizes.length > 1 ? (
                    <div style={{ marginTop: 8 }}>
                      <Segmented
                        size="small"
                        options={sizeOptions(definition.sizes)}
                        value={instance.size}
                        onChange={(next) =>
                          save(updateInstance(instances, instance.id, { size: next }))
                        }
                      />
                    </div>
                  ) : null}
                </Info>
                {hasConfig(definition) ? (
                  <Button
                    size="small"
                    icon={<IconSettings size={14} />}
                    onClick={() => setOpenInstance(configOpen ? null : instance.id)}
                  >
                    设置
                  </Button>
                ) : null}
                <Button
                  size="small"
                  icon={<IconMinus size={14} />}
                  onClick={() => drop(instance)}
                >
                  移除
                </Button>
              </Row>
              {configOpen ? (
                <Panel>
                  <SettingsForm
                    schema={definition.configSchema}
                    values={toPlain(instance.config || {})}
                    onSave={(key, value) =>
                      save(updateInstanceConfig(instances, instance.id, key, value))
                    }
                    onClear={(key) =>
                      save(updateInstanceConfig(instances, instance.id, key, ""))
                    }
                  />
                </Panel>
              ) : null}
            </Card>
          );
        })
      )}

      <Footer>
        组件显示在首屏右上角，可以直接拖动调整位置。
        密钥只保存在本机，不参与 WebDAV / Gist 同步，也不会出现在导出的数据文件里；
        换设备需要重新填写。
      </Footer>
    </Wrap>
  );
};

export default observer(PreferencesWidgets);
