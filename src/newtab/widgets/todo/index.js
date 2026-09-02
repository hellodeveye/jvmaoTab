import { lightTint } from "../tints";
import TodoWidget from "./TodoWidget";

/**
 * 待办清单。每种组件全局只能添加一张；清单名显示在卡片标题上。
 * 没有类型级设置，所以组件库里直接就能添加。
 */
export const TODO_WIDGET = {
  type: "todo",
  title: "待办清单",
  summary: "本地清单，勾选与新增都在卡片上完成",
  group: "效率",
  sizes: ["medium", "small", "large"],
  /* 纸感的暖黄，和三张 AI 卡（蓝 / 墨灰 / 白）都拉得开 */
  scheme: "light",
  tint: lightTint(
    "linear-gradient(158deg, rgba(255, 238, 205, 0.86) 0%, rgba(252, 226, 178, 0.78) 52%, rgba(255, 243, 220, 0.82) 100%)"
  ),
  Component: TodoWidget,
  configSchema: [
    {
      key: "title",
      label: "清单名称",
      type: "text",
      placeholder: "工作",
      hint: "显示在卡片标题上。",
    },
  ],
  defaultConfig: { title: "" },
  instanceTitle: (instance) =>
    instance.config?.title ? `待办 · ${instance.config.title}` : "待办清单",
};
