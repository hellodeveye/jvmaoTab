import React from "react";
import { observer } from "mobx-react";
import useStores from "~/hooks/useStores";
import { SCREEN_COUNT, SCREEN_LABELS, linkGroupScreen, setGroupScreen } from "~/screens";
import { Input, Tooltip } from "antd";
import {
  IconPencilMinus,
  IconCopy,
  IconTrashX,
  IconExternalLink,
  IconDeviceDesktop,
  IconDeviceDesktopX,
  IconArrowsMove
} from "@tabler/icons-react";

const LinkTitle = (props) => {
  const {
    item,
    titleClass = "",
    onChange = () => { },
    onDelete = () => { },
    onOpenAll = () => { },
    onCopyAll = () => { },
  } = props;
  const [isEdit, setIsEdit] = React.useState(false);
  const inputRef = React.useRef(null);
  const { option, tools } = useStores();

  const homeKeys = option.getHomeLinkTimeKeys();

  /** 改分组屏归属:写 homeLinkScreens(稀疏映射,归首屏删键,坐标不动不丢位置) */
  const assignScreen = (screen) => {
    const next = setGroupScreen(option.item, item.timeKey, screen);
    option.setItem("homeLinkScreens", next);
  };

  const onInputBlur = (event) => {
    const value = event.target.value;
    if (value) {
      item.title = value;
      onChange(value);
    }
    setIsEdit(false);
  };

  const onEdit = () => {
    setIsEdit(true);
    setTimeout(() => {
      inputRef.current.focus({
        cursor: "end",
      });
    }, 0);
  };

  const onContextMenu = React.useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    const menuItem = [
      {
        label: "打开全部链接",
        icon: <IconExternalLink />,
        key: "open-all-link",
        onClick: onOpenAll,
      },
      {
        label: "复制全部链接",
        icon: <IconCopy />,
        key: "copy-all-link",
        onClick: onCopyAll,
      },
      {
        label: "编辑标题",
        icon: <IconPencilMinus />,
        key: "edit-title",
        onClick: onEdit,
      },
      {
        label: "移动分组",
        icon: <IconArrowsMove />,
        key: "move-group",
        onClick: () => {
          tools.openPublicModal("MoveGroup", {
          }, 500, '移动分组');
        },
      },
      {
        label: "删除分组",
        icon: <IconTrashX />,
        key: "del-group",
        onClick: onDelete,
      },
    ];
    if (homeKeys.includes(item.timeKey)) {
      // 已上屏:另一屏没有它才给「移到副屏/首屏」,并保留原有的「从首屏移除」
      const current = linkGroupScreen(option.item, item.timeKey);
      const other = current === 0 ? 1 : 0;
      menuItem.push({
        label: `移到${SCREEN_LABELS[other]}`,
        icon: <IconDeviceDesktop />,
        key: "move-home-screen",
        onClick: () => assignScreen(other),
      });
      menuItem.push({
        label: "从首屏移除",
        icon: <IconDeviceDesktopX />,
        key: "del-home",
        onClick: () => {
          option.setItem(
            "homeLinkTimeKeys",
            homeKeys.filter((k) => k !== item.timeKey)
          );
          // 一起清掉屏归属,稀疏映射里不留死键
          assignScreen(0);
        },
      });
    } else {
      // 未上屏:添加时选目标屏(首屏/副屏)
      menuItem.push({
        label: `添加到${SCREEN_LABELS[0]}`,
        icon: <IconDeviceDesktop />,
        key: "add-home",
        onClick: () => {
          option.setItem("homeLinkTimeKeys", [...homeKeys, item.timeKey]);
        },
      });
      menuItem.push({
        label: `添加到${SCREEN_LABELS[1]}`,
        icon: <IconDeviceDesktop />,
        key: "add-home-screen-1",
        onClick: () => {
          option.setItem("homeLinkTimeKeys", [...homeKeys, item.timeKey]);
          assignScreen(1);
        },
      });
    }
    tools.setRightClickEvent(e, menuItem);
  }, [item.timeKey, homeKeys]);

  return (
    <div className="link-title" onContextMenu={onContextMenu}>
      {isEdit ? (
        <div>
          <Input
            type="text"
            ref={inputRef}
            className={titleClass + " link-title-item link-title-input"}
            defaultValue={item.title}
            onBlur={onInputBlur}
            bordered={false}
          />
        </div>
      ) : (
        <h4 onClick={onEdit} className={titleClass + " link-title-item"}>
          {item.title}
        </h4>
      )}
      {homeKeys.includes(item.timeKey) ? (
        <Tooltip title="此分组已在首屏展示">
          <div className="link-title-icon">
            <IconDeviceDesktop
              size={18}
              stroke={1.6}
            />
          </div>
        </Tooltip>
      ) : null}
    </div>
  );
};

export default observer(LinkTitle);
