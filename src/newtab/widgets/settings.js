/**
 * 组件设置分两层，存储位置与归属都不同：
 *
 *   settings（类型级）    一种组件的所有实例共用一份，如 DeepSeek 的 API Key。
 *                        每个字段的 key 就是 option 键名；secret 的只落
 *                        chrome.storage.local，不进导出也不进同步。
 *   configSchema（实例级）每个实例一份，如待办的清单名、天气的城市，
 *                        存在实例的 config 里，随 db 走同步与导出。
 *
 * 字段本身用同一套 schema 描述，于是两层共用一个表单渲染器——
 * 「加组件不用改首选项页」靠的就是这一点。
 */

/** 字段当前值：类型级读 option，实例级读实例 config */
export function settingValue(field, item) {
  const value = item?.[field.key];
  return value === undefined ? field.defaultValue : value;
}

export function hasValue(value) {
  if (typeof value === "string") return value.trim() !== "";
  return value !== undefined && value !== null && value !== false;
}

/**
 * 能不能添加到首屏。
 * 组件没自己写 available 时，缺省规则是「类型级设置里所有 required 字段都有值」，
 * 于是 AI 那三个组件一行判断都不用写。
 */
export function checkAvailable(definition, item) {
  if (!definition) return { ok: false, reason: "组件不存在" };
  if (definition.available) return definition.available(item);

  const missing = (definition.settings || []).filter(
    (field) => field.required && !hasValue(settingValue(field, item))
  );
  if (missing.length === 0) return { ok: true };
  return { ok: false, reason: `需先填写${missing.map((f) => f.label).join(" / ")}` };
}

/** 组件有没有可填的东西——决定首选项里要不要给「设置」入口 */
export function hasSettings(definition) {
  return (definition?.settings || []).length > 0 || !!definition?.Settings;
}

export function hasConfig(definition) {
  return (definition?.configSchema || []).length > 0 || !!definition?.ConfigForm;
}
