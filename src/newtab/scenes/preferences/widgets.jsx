import React from "react";
import { observer } from "mobx-react";
import styled from "styled-components";
import { Button, Tag, Typography } from "antd";
import { IconPlus, IconMinus } from "@tabler/icons-react";
import useStores from "~/hooks/useStores";
import { WIDGETS, widgetAvailable } from "~/widgets/registry";
import {
  resolveWidgetIds,
  addWidget,
  removeWidget,
  WIDGET_IDS_KEY,
} from "~/widgets/state";
import WidgetPreview from "~/widgets/WidgetPreview";
import { SIZE_LABELS } from "~/widgets/sizes";

const Group = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: var(--colorTextSecondary);
  margin: 4px 0 10px;

  &:not(:first-child) {
    margin-top: 22px;
  }
`;

const Item = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--colorBorderSecondary, rgba(0, 0, 0, 0.06));

  & + & {
    margin-top: 10px;
  }
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

const Footer = styled.div`
  margin-top: 20px;
  font-size: 11px;
  color: var(--colorTextSecondary);
  line-height: 1.6;
`;

/**
 * 组件库：列出注册表里的全部组件，加到首屏或从首屏移除。
 * 这一页对组件种类是无知的——列表、缩略图、可用性判断全部走注册表字段，
 * 以后加待办、天气之类的组件不需要再动这里。
 */
const PreferencesWidgets = (props) => {
  const { onNavigate } = props;
  const { option } = useStores();
  const item = option.item;
  const added = resolveWidgetIds(item);

  const save = (ids) => {
    option.setItem(WIDGET_IDS_KEY, ids, false).catch((err) => {
      console.error(`[${WIDGET_IDS_KEY}] save failed:`, err);
    });
  };

  let lastGroup = null;

  return (
    <>
      {WIDGETS.map((widget) => {
        const isAdded = added.includes(widget.id);
        const availability = widgetAvailable(widget, item);
        const group = widget.group !== lastGroup ? widget.group : null;
        lastGroup = widget.group;

        return (
          <React.Fragment key={widget.id}>
            {group ? <Group>{group}</Group> : null}
            <Item>
              <WidgetPreview widget={widget} dim={!availability.ok} />
              <Info>
                <Name>
                  {widget.title}
                  <Tag bordered={false}>{SIZE_LABELS[widget.size]}</Tag>
                </Name>
                <Desc>
                  {availability.ok ? (
                    widget.summary
                  ) : (
                    <>
                      {availability.reason}
                      {availability.goto ? (
                        <>
                          {" · "}
                          <Typography.Link
                            onClick={() => onNavigate?.(availability.goto)}
                          >
                            去设置
                          </Typography.Link>
                        </>
                      ) : null}
                    </>
                  )}
                </Desc>
              </Info>
              {isAdded ? (
                <Button
                  size="small"
                  icon={<IconMinus size={14} />}
                  onClick={() => save(removeWidget(item, widget.id))}
                >
                  移除
                </Button>
              ) : (
                <Button
                  size="small"
                  type="primary"
                  icon={<IconPlus size={14} />}
                  disabled={!availability.ok}
                  onClick={() => save(addWidget(item, widget.id))}
                >
                  添加
                </Button>
              )}
            </Item>
          </React.Fragment>
        );
      })}
      <Footer>
        添加后的组件显示在首屏右上角，可以直接拖动调整位置；
        移除只是从首屏拿下来，密钥等设置都还在。
      </Footer>
    </>
  );
};

export default observer(PreferencesWidgets);
