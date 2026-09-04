import React from "react";
import { Col, Row, Drawer, Spin } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { observer } from "mobx-react";
import {
  useScroll,
  useReactive,
  useMemoizedFn,
  useHover,
  useKeyPress,
} from "ahooks";
import useDebounce from "~/hooks/useDebounce";
import DelayedMount from "~/components/DelayedMount";
import PageLoading from "~/components/PageLoading";
import styled from "styled-components";
import useStores from "~/hooks/useStores";
import { motion } from "framer-motion";
import { IconChevronUp } from "@tabler/icons-react";
import FirstScreen from "~/scenes/home/FirstScreen";
import Nav from "~/scenes/home/Nav";
import TabList from "~/scenes/Link/TabList";

export const headerHeight = 56;
const navWidth = 240;
const tabListDrawerWidth = 240;

const EscMessageIcon = styled(IconChevronUp)`
  color: var(--workspaceMuted);
`;
const Wrap = styled.div`
  width: 100%;
  height: 100dvh;
  /* 必须是 clip 不是 hidden:管理页(Main)只被 translateY(100vh) 挪到屏幕下方,
     DOM 还在也还能拿焦点,而 transform 的区域会计入可滚动溢出。hidden 建立的
     仍是一个可被程序滚动的容器 —— 焦点一落进 Main(弹窗关闭后交还焦点、Tab、
     方向键的默认滚动都会),浏览器就自动把它滚进视野:管理页露出来了,可 unlock
     还是 false,首屏那些浮层(屏幕指示点等)因此不会隐藏。
     clip 只裁剪、不建立滚动容器,这条路就断了。 */
  overflow: clip;
  /* 首屏那些绝对定位浮层的包含块:不写就落到初始包含块上,和这里的内容脱节 */
  position: relative;
`;

const Main = styled(motion.main)`
  width: 100%;
  height: 100vh;
  background: var(--workspaceSidebar);
  position: relative;
  z-index: 2;
`;

const Body = styled.div`
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  position: relative;
  box-sizing: border-box;
  border-radius: 12px 0 0 12px;
  background: var(--workspaceBackdrop);
  box-shadow: inset 1px 0 var(--workspaceSidebarEdge);
`;

const RowWrap = styled(Row)`
  min-height: 100vh;
`;
const homeAnimations = {
  show: {
    y: 0,
  },
  hidden: {
    y: '100vh',
  }
};

const Home = () => {
  const { tools, link, option } = useStores();
  const { pwKey, defaultOpenAdd, defauiltLink, rollingBack } = option.item || {};

  const ref = React.useRef(null);
  const s = useScroll(ref);
  const isHovering = useHover(ref);
  const location = useLocation();
  const navigate = useNavigate();

  const v = useReactive(
    {
      unlock: defauiltLink,
      scrollTopNum: 0,
      showTopIcon: false,
    },
    []
  );

  const state = React.useRef({
    pwKeyNum: 0,
  }).current;

  const handleUnlock = useMemoizedFn(() => {
    if (v.unlock) {
      setTimeout(() => {
        v.unlock = false;
        tools.tabListDrawer = false;
        v.scrollTopNum = 0;
        setTimeout(() => {
          v.showTopIcon = false;
        }, 1000);
      }, 0);
    } else {
      v.unlock = true;
    }
  }, [v.unlock]);

  useKeyPress(
    (event) => true,
    (event) => {
      if (!v.unlock && pwKey?.length) {
        if (pwKey[state.pwKeyNum] === event.key) {
          if (state.pwKeyNum === pwKey.length - 1) {
            option.showHide = true;
            tools.messageApi.success("叮");
            link.updateNav();
          } else {
            state.pwKeyNum++;

          }
        } else {
          state.pwKeyNum = 0;
        }
      }

      if (v.unlock && event.key === "Escape") {
        handleUnlock();
      }
    },
    {
      events: ['keyup'],
    },
  );

  const onwheel = useMemoizedFn(
    (e) => {
      if (e.deltaY > 0) {
        if (!e.target.classList.contains("sn-bg-wrap")) {
          return;
        }
        v.unlock = true;
      } else if (s.top === 0 && isHovering) {
        v.scrollTopNum += 1;
        if (rollingBack) {
          if (v.scrollTopNum >= 3) {
            handleUnlock();
          }
        } else {
          if (v.scrollTopNum === 3) {
            tools.messageApi.open({
              content: "请按 Esc 键返回首屏",
              icon: <EscMessageIcon size={18} stroke={1.7} />,
            });
            setTimeout(() => {
              v.showTopIcon = true;
              setTimeout(() => {
                v.showTopIcon = false;
              }, 5000);
            }, 300);
          }
        }
      }
    },
    [s, isHovering, rollingBack]
  );

  // 预加载 TabList 数据，当 unlock 为 true 时提前加载
  React.useEffect(() => {
    if (v.unlock && location.pathname === '/') {
      // 提前加载窗口和标签页数据，避免 Drawer 打开时卡顿
      // 优化：只调用一次 chrome.windows.getCurrent，然后并行加载其他数据
      chrome.windows.getCurrent((window) => {
        if (window?.id) {
          Promise.all([
            chrome.tabs.query({ windowId: window.id }),
            link.getPendingLinks().catch(() => [])
          ]).catch(() => {
            // 静默失败，不影响主流程
          });
        }
      });
    }
  }, [v.unlock, location.pathname, link]);

  React.useEffect(() => {
    if (v.unlock) {
      tools.updateTimeKey();
    }

    if (location.pathname != '/') {
      tools.tabListDrawer = false;
      return;
    }

    if (v.unlock && (defaultOpenAdd || !link.list.length)) {
      setTimeout(() => {
        if (v.unlock && (defaultOpenAdd || !link.list.length) && location.pathname == '/') {
          tools.tabListDrawer = true;
        }
      }, 500);
    } else if (!v.unlock) {
      tools.tabListDrawer = false;
    }
  }, [link.list, v.unlock, location.pathname]);

  // 首屏的组件卡片盖在主区域之上，要去小组件页得先把首屏收起来
  React.useEffect(() => {
    if (!tools.gotoWidgets) return;
    tools.gotoWidgets = false;
    v.unlock = true;
    navigate("/widgets");
  }, [tools.gotoWidgets, navigate]);

  React.useEffect(() => {
    // 监听滚轮事件
    // 注意：使用 passive: false 是因为需要阻止默认行为（在特定条件下）
    // 如果未来可以优化为 passive: true，性能会更好
    window.addEventListener("wheel", onwheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", onwheel);
    };
  }, [onwheel]);

  return (
    <Wrap className="main-wrap sn-bg-wrap">
      <FirstScreen
        navWidth={navWidth}
        headerHeight={headerHeight}
        unlock={v.unlock}
        showTopIcon={v.showTopIcon}
        handleUnlock={handleUnlock}
      />
      <Main
        initial={v.unlock ? 'show' : "hidden"}
        animate={v.unlock ? 'show' : "hidden"}
        variants={homeAnimations}
        transition={{ duration: 0.4, ease: "circIn" }}
      >
        <RowWrap>
          <Col flex={`${navWidth}px`}>
            <Nav headerHeight={headerHeight} />
          </Col>
          <Col
            flex="auto"
            style={{
              width: '0px',
            }}
          >
            <Body ref={ref} className="scroll-container">
              <React.Suspense
                fallback={
                  <DelayedMount delay={200}>
                    <PageLoading />
                  </DelayedMount>
                }
              >
                <Outlet />
              </React.Suspense>

            </Body>
          </Col>
          <Col
            flex={`${tools.tabListDrawer ? tabListDrawerWidth : 0}px`}
            style={{
              transition: "flex 0.3s ease-in-out",
            }}
          ></Col>
        </RowWrap>
      </Main>
      <Drawer
        title="新增链接"
        placement="right"
        closable={true}
        maskClosable={false}
        mask={false}
        onClose={useMemoizedFn(() => {
          tools.tabListDrawer = false;
        })}
        open={tools.tabListDrawer}
        width={tabListDrawerWidth}
        headerStyle={{
          height: headerHeight + "px",
          flexBasis: headerHeight + "px",
        }}
        bodyStyle={{
          padding: "10px",
          willChange: "transform",
          transform: "translateZ(0)",
        }}
        drawerStyle={{
          willChange: "transform",
        }}
      >
        <React.Suspense fallback={<Spin />}>
          <TabList isShow={tools.tabListDrawer} />
        </React.Suspense>
      </Drawer>
    </Wrap>
  );
};

export default observer(Home);
