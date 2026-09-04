/**
 * item 结构 {id, text, done} → GitHub 风格任务列表。
 * 抽成纯函数是为了能被 node 直接导入做格式契约断言(仓库无测试框架)。
 * 输出:每项一行,未完成 `- [ ] 文本`、已完成 `- [x] 文本`,不带标题。
 */
export function todoMarkdown(items) {
  if (!Array.isArray(items)) return "";
  return items
    .map((item) => `- [${item.done ? "x" : " "}] ${item.text}`)
    .join("\n");
}
