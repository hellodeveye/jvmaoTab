import { getID } from "~/utils";
import { toPlain } from "./plain";
import { getWidget } from "./registry";
import { checkAvailable } from "./settings";
import { DEFAULT_SIZE } from "./sizes";

/** 首屏组件实例数组的 option 键 */
export const WIDGETS_KEY = "widgets";

function isValidInstance(instance) {
  return !!(instance?.id && getWidget(instance.type));
}

/** 已添加的实例。type 已不在注册表里的（删过的组件、改过的 type）直接丢掉 */
export function listInstances(item) {
  const raw = item?.[WIDGETS_KEY];
  return Array.isArray(raw) ? raw.filter(isValidInstance) : [];
}

/** 首屏真正渲染的实例：前置条件仍满足（清了密钥的卡片自动下屏，不必手动移除） */
export function homeInstances(item) {
  return listInstances(item).filter(
    (instance) => checkAvailable(getWidget(instance.type), item).ok
  );
}

/** 实例与它的定义配成对，渲染层不用自己去查注册表 */
export function withDefinition(instance) {
  return { instance, definition: getWidget(instance.type) };
}

export function createInstance(definition, size, position) {
  return {
    id: getID(),
    type: definition.type,
    size: definition.sizes?.includes(size) ? size : definition.sizes?.[0] || DEFAULT_SIZE,
    position,
    config: { ...(definition.defaultConfig || {}) },
  };
}

export function updateInstance(instances, id, patch) {
  return instances.map((instance) =>
    instance.id === id ? { ...toPlain(instance), ...patch } : toPlain(instance)
  );
}

/** 改实例配置里的一项 */
export function updateInstanceConfig(instances, id, key, value) {
  const target = instances.find((instance) => instance.id === id);
  if (!target) return instances.map(toPlain);
  return updateInstance(instances, id, {
    config: { ...toPlain(target.config || {}), [key]: value },
  });
}

export function removeInstance(instances, id) {
  return instances.filter((instance) => instance.id !== id).map(toPlain);
}
