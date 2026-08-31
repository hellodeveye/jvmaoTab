import React from "react";
import styled from "styled-components";
import { observer } from "mobx-react";
import { useMemoizedFn } from "ahooks";
import { IconCheck, IconX } from "@tabler/icons-react";
import { getID } from "~/utils";
import WidgetCard, { scheme } from "../WidgetCard";
import { useWidgetData } from "../storage";
import { widgetSize, WIDGET_METRICS as M } from "../sizes";

/* 列表行的尺度。从 M 推导而不是写死，改了全局 SCALE 这里跟着走 */
const ROW_H = 18;
const ROW_GAP = 3;
const INPUT_H = 20;
const TOP_GAP = 8;
const BOX = 13;

/** 一档能放下几行：按卡片实际高度算，加尺寸档时不用回来改数字 */
function listCapacity(size) {
  const box = widgetSize(size);
  const body =
    box.height -
    M.padding * 2 -
    M.headFontSize -
    TOP_GAP -
    INPUT_H -
    M.metaGap;
  return Math.max(1, Math.floor((body + ROW_GAP) / (ROW_H + ROW_GAP)));
}

const List = styled.div`
  margin-top: ${TOP_GAP}px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${ROW_GAP}px;
  min-height: 0;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  height: ${ROW_H}px;
  font-size: ${M.metaFontSize}px;
  line-height: 1;

  &:hover .todo-remove {
    opacity: 0.5;
  }
`;

const Box = styled.button`
  flex: none;
  width: ${BOX}px;
  height: ${BOX}px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  border: 1px solid ${(props) => props.$scheme.border};
  background: ${(props) =>
    props.$done ? props.$scheme.barFill : "transparent"};
  color: ${(props) => props.$scheme.text};
  cursor: pointer;
`;

const Text = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  opacity: ${(props) => (props.$done ? 0.45 : 0.9)};
  text-decoration: ${(props) => (props.$done ? "line-through" : "none")};
`;

const Remove = styled.button`
  flex: none;
  display: flex;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  opacity: 0;
  cursor: pointer;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 1 !important;
  }
`;

const More = styled.div`
  height: ${ROW_H}px;
  display: flex;
  align-items: center;
  font-size: ${M.metaFontSize}px;
  opacity: 0.5;
`;

const Input = styled.input`
  margin-top: ${M.metaGap}px;
  height: ${INPUT_H}px;
  width: 100%;
  padding: 0;
  border: 0;
  border-top: 1px solid ${(props) => props.$scheme.border};
  background: none;
  color: inherit;
  font-size: ${M.metaFontSize}px;
  outline: none;

  &::placeholder {
    color: inherit;
    opacity: 0.45;
  }
`;

/* 小卡放不下清单，退化成「还剩几件」+ 最近两条，形态与额度卡一致 */
const Count = styled.div`
  margin-top: ${M.valueOffset}px;
  font-size: ${(props) => props.$size.valueFontSize}px;
  font-weight: 600;
  line-height: 1;
  font-variant-numeric: tabular-nums;
`;

const Peek = styled.div`
  margin-top: ${M.metaGap}px;
  font-size: ${M.metaFontSize}px;
  line-height: ${M.metaLineHeight};
  opacity: 0.78;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Spacer = styled.div`
  flex: 1;
`;

const EMPTY = { items: [] };

/** 卡片整体是拖拽把手，所以卡内每个可点的东西都要掐掉 pointerdown */
const stopDrag = (e) => e.stopPropagation();

/**
 * 待办清单。首屏组件里第一个「非 AI、要存自己的数据、要实例配置」的组件——
 * 它跑通了才说明这层是通用的。
 *
 * 数据在 widgetData.{instanceId}（走 db，随同步与导出），
 * 清单名在实例 config.title（每个实例一份）。
 */
const TodoWidget = observer((props) => {
  const { instance, definition, position } = props;
  const [data, setData] = useWidgetData(instance.id, EMPTY);
  const [draft, setDraft] = React.useState("");
  const palette = scheme(definition.scheme);
  const box = widgetSize(instance.size);

  const items = React.useMemo(() => {
    const list = Array.isArray(data?.items) ? data.items : [];
    // 未完成的排前面：行数有限，先给还要做的事
    return [...list].sort((a, b) => Number(a.done) - Number(b.done));
  }, [data]);

  const undone = items.filter((item) => !item.done);

  const toggle = useMemoizedFn((id) => {
    setData((current) => ({
      ...current,
      items: (current.items || []).map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      ),
    }));
  });

  const remove = useMemoizedFn((id) => {
    setData((current) => ({
      ...current,
      items: (current.items || []).filter((item) => item.id !== id),
    }));
  });

  const add = useMemoizedFn(() => {
    const text = draft.trim();
    if (!text) return;
    setData((current) => ({
      ...current,
      items: [...(current.items || []), { id: getID(), text, done: false }],
    }));
    setDraft("");
  });

  if (instance.size === "small") {
    const peek = undone.slice(0, 2);
    return (
      <WidgetCard instance={instance} definition={definition} position={position}>
        <Count $size={box}>{undone.length}</Count>
        <Spacer />
        {peek.length > 0 ? (
          peek.map((item) => <Peek key={item.id}>{item.text}</Peek>)
        ) : (
          <Peek>全部完成</Peek>
        )}
      </WidgetCard>
    );
  }

  const capacity = listCapacity(instance.size);
  const overflow = items.length > capacity;
  const visible = overflow ? items.slice(0, capacity - 1) : items;

  return (
    <WidgetCard instance={instance} definition={definition} position={position}>
      <List>
        {visible.map((item) => (
          <Row key={item.id}>
            <Box
              type="button"
              $scheme={palette}
              $done={item.done}
              title={item.done ? "标记为未完成" : "标记为完成"}
              onPointerDown={stopDrag}
              onClick={() => toggle(item.id)}
            >
              {item.done ? <IconCheck size={9} stroke={3} /> : null}
            </Box>
            <Text $done={item.done}>{item.text}</Text>
            <Remove
              className="todo-remove"
              type="button"
              title="删除"
              onPointerDown={stopDrag}
              onClick={() => remove(item.id)}
            >
              <IconX size={11} stroke={2} />
            </Remove>
          </Row>
        ))}
        {overflow ? <More>还有 {items.length - visible.length} 项</More> : null}
        {items.length === 0 ? <More>还没有待办</More> : null}
      </List>
      <Input
        $scheme={palette}
        value={draft}
        placeholder="添加一项…"
        onPointerDown={stopDrag}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") add();
        }}
      />
    </WidgetCard>
  );
});

export default TodoWidget;
