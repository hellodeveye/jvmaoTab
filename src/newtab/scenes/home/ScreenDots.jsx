import styled from "styled-components";

/* 屏幕指示点:反映当前所在屏,点击直达对应屏。
   隐藏时机沿用首屏浮层的 stickled 约定:解锁进管理页、第二壁纸预览时整体隐掉,
   用 visibility 而非仅 opacity,一并屏蔽命中测试与焦点。 */
const DotsWrap = styled.div`
  position: absolute;
  left: 50%;
  bottom: 22px;
  transform: translateX(-50%);
  z-index: 55;
  display: flex;
  gap: 10px;
  pointer-events: auto;
  opacity: ${(props) => (props.$stickled ? 0 : 1)};
  visibility: ${(props) => (props.$stickled ? "hidden" : "visible")};
  transition: opacity 0.2s ease, visibility 0.2s ease;
`;

const Dot = styled.button`
  width: ${(props) => (props.$active ? "20px" : "8px")};
  height: 8px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  background: var(--colorText);
  opacity: ${(props) => (props.$active ? 0.9 : 0.3)};
  transition: opacity 0.2s ease, width 0.2s ease;

  &:hover {
    opacity: 0.7;
  }

  &:focus-visible {
    outline: 2px solid var(--colorPrimary);
    outline-offset: 2px;
  }
`;

const ScreenDots = (props) => {
  const { count, current, onSelect, stickled } = props;
  return (
    <DotsWrap $stickled={stickled} role="tablist" aria-label="屏幕切换">
      {Array.from({ length: count }, (_, i) => (
        <Dot
          key={i}
          type="button"
          $active={i === current}
          aria-current={i === current ? "true" : undefined}
          aria-label={i === 0 ? "首屏" : "副屏"}
          title={i === 0 ? "首屏" : "副屏"}
          onClick={() => onSelect(i)}
        />
      ))}
    </DotsWrap>
  );
};

export default ScreenDots;
