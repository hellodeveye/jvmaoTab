import { AI_WIDGETS } from "./ai";
import { TODO_WIDGET } from "./todo";

/**
 * 首屏组件注册表。加一种新组件 = 新建一个文件夹（定义 + 渲染组件 + 可选的 settings），
 * 再往下面的数组加一条。布局、拖拽、坐标持久化、组件库列表、设置表单都是通用的，
 * 不需要改。
 *
 * 定义字段：
 *   type          全局唯一；实例里存的就是它，改名等于丢用户数据
 *   title         卡片与组件库标题
 *   summary       组件库里的一行说明
 *   group         组件库分组标题
 *   sizes         支持的尺寸档，第一项为默认；用户在组件库里挑，见 ./sizes
 *   tint          卡片材质（叠在预模糊壁纸上的渐变层）
 *   accent?       强调色，进度条一类元素读 --widget-accent
 *   scheme?       dark（默认）| light，深色材质配浅字、浅色材质配深字
 *   Component     收 { instance, definition, position, stickled, justDraggedRef }，
 *                 内部渲染 <WidgetCard>
 *
 *   settings?     类型级设置 schema（所有实例共用，如 API Key）。见 ./settings
 *   configSchema? 实例级配置 schema（每个实例一份，如清单名、城市）
 *   defaultConfig? 新实例的初始 config
 *   available?(item)  能否添加 → { ok, reason? }。不写则由 settings 里的 required
 *                 字段自动推导，见 checkAvailable
 *
 *   instanceTitle?(instance)  多实例时的卡片标题，如「待办 · 工作」；缺省用 title
 *   Settings? / ConfigForm?   schema 表达不了的表单（如带联想搜索的城市选择器），
 *                 首选项页优先用它们
 *   Preview?      自定义组件库缩略图，缺省画通用外形图
 */
export const WIDGETS = [...AI_WIDGETS, TODO_WIDGET];

const index = new Map();
WIDGETS.forEach((widget) => {
  if (index.has(widget.type)) {
    console.error(`[widgets] 重复的组件 type: ${widget.type}`);
  }
  index.set(widget.type, widget);
});

export function getWidget(type) {
  return index.get(type) || null;
}
