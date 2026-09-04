import React from "react";
import { observer } from "mobx-react";
import useStores from "~/hooks/useStores";
import styled from "styled-components";
import {
  IconSettings,
  IconInfoCircle,
  IconDownload,
  IconRefresh,
  IconLayoutGrid,
} from "@tabler/icons-react";
import ConfirmDialogIcon from "~/components/ConfirmDialogIcon";
import { useLongPress } from "ahooks";
import { App as AntApp } from "antd";
import {
  computeAnchoredDefaultLayout,
  filterRenderableGroups,
} from "~/utils/homeLinkLayout";
import { SCREEN_LABELS, normalizeScreen } from "~/screens";

/** 首屏壁纸交互层：右键菜单 + 长按切换第二壁纸（原便签层职责中的非便签部分） */
const Wrap = styled.div`
  position: absolute;
  inset: 0;
  z-index: ${(props) => props.$zIndex};
  pointer-events: auto;
`;

const Surface = styled.div`
  width: 100%;
  height: 100%;
`;

const HomeBgLayerComponent = (props) => {
  const {
    stickled,
    homeGroups = [],
    isSoBarDown,
    showGroupTitle = true,
    screen = 0,
  } = props;
  // 每屏各有一层壁纸交互层,「整理」只重排右键所在这一屏的分组
  const screenLabel = SCREEN_LABELS[normalizeScreen(screen)];
  const { home, option, tools } = useStores();
  const { modal } = AntApp.useApp();
  const parentRef = React.useRef(null);
  const validHomeGroups = React.useMemo(
    () => filterRenderableGroups(homeGroups),
    [homeGroups]
  );

  const organizeHomeGroups = React.useCallback(() => {
    modal.confirm({
      title: `确认整理${screenLabel}分组？`,
      icon: <ConfirmDialogIcon icon={IconLayoutGrid} />,
      content: `将重新排列${screenLabel}的所有分组，这一屏的自定义位置会丢失。`,
      okText: "整理",
      okType: "primary",
      cancelText: "取消",
      async onOk() {
        const layout = computeAnchoredDefaultLayout(
          validHomeGroups,
          showGroupTitle,
          isSoBarDown
        );
        try {
          await tools.applyHomeLinkLayout(layout.positions);
          if (layout.overflow) {
            tools.messageApi.warning(
              "整理完成，但分组过多，当前窗口无法完全容纳"
            );
          } else {
            tools.success("整理完成");
          }
        } catch (error) {
          console.error("[homeLinkPositions] organize failed:", error);
          tools.error("整理失败，请重试");
        }
      },
    });
  }, [isSoBarDown, modal, screenLabel, showGroupTitle, tools, validHomeGroups]);

  const onContextMenu = React.useCallback(
    (e) => {
      e.stopPropagation();
      e.preventDefault();
      const list = [];
      if (validHomeGroups.length > 0) {
        list.push({
          label: "整理",
          icon: <IconLayoutGrid />,
          key: "organize-home-groups",
          onClick: organizeHomeGroups,
        });
        list.push({ type: "divider" });
      }
      list.push(
        {
          label: "首选项",
          icon: <IconSettings />,
          key: "preferences",
          onClick: () => {
            tools.preferencesOpen = true;
          },
        },
        {
          label: "关于",
          icon: <IconInfoCircle />,
          key: "about",
          onClick: () => {
            tools.openPublicModal("About", {}, 560, "关于");
          },
        }
      );
      if (option.item.bgType === "bing") {
        list.push({ type: "divider" });
        list.push({
          label: "壁纸下载",
          icon: <IconDownload />,
          key: "downloadBing",
          onClick: () => {
            home.downloadBingWallpaper && home.downloadBingWallpaper();
          },
        });
        list.push({
          label: "更换壁纸",
          icon: <IconRefresh />,
          key: "randomBing",
          onClick: () => {
            home.randomBingBg && home.randomBingBg();
          },
        });
      }
      tools.setRightClickEvent(e, list);
    },
    [home, option, organizeHomeGroups, tools, validHomeGroups.length]
  );

  useLongPress(
    (e) => {
      if (!e.target.classList.contains("sn-bg-wrap")) {
        return;
      }
      if (!stickled) {
        home.showBg2();
      }
    },
    parentRef,
    {
      moveThreshold: { x: 30, y: 30 },
      onLongPressEnd: () => {
        home.showBg1();
      },
    }
  );

  return (
    <Wrap $zIndex={stickled ? -1 : 20}>
      <Surface
        className="sn-bg-wrap"
        data-type="bg-root"
        ref={parentRef}
        onContextMenu={onContextMenu}
      />
    </Wrap>
  );
};

const HomeBgLayer = React.memo(observer(HomeBgLayerComponent));

export default HomeBgLayer;
