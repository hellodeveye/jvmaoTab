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

/**
 * 去重:每种类型只保留数组中最早的一张(添加是追加,所以前面的更早)，
 * 顺序不变。返回被丢实例的 id，由调用方决定要不要落地清理。
 */
export function dedupeInstances(instances) {
  const seen = new Set();
  const kept = [];
  const droppedIds = [];
  for (const instance of instances) {
    if (seen.has(instance.type)) {
      droppedIds.push(instance.id);
      continue;
    }
    seen.add(instance.type);
    kept.push(toPlain(instance));
  }
  return { instances: kept, changed: droppedIds.length > 0, droppedIds };
}

/**
 * 读取入口(带去重诊断):存储里留着的重复实例在这里被拦住，
 * 视图、首屏、导出前置看到的都是每种类型至多一张。
 */
export function listInstancesWithDedup(item) {
  const raw = item?.[WIDGETS_KEY];
  const valid = Array.isArray(raw) ? raw.filter(isValidInstance) : [];
  return dedupeInstances(valid);
}

/** 已添加的实例。type 已不在注册表里的（删过的组件、改过的 type）直接丢掉 */
export function listInstances(item) {
  return listInstancesWithDedup(item).instances;
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

/**
 * 数据层添加入口:同 type 已存在就原样返回 —— 一种组件只允许一个实例。
 * UI 的禁用只是提示，这里是真正的栅栏:存储直写、未来的新入口都过这里。
 */
export function addInstance(instances, definition, size, position) {
  if (instances.some((instance) => instance.type === definition.type)) {
    return instances;
  }
  return [...instances.map(toPlain), createInstance(definition, size, position)];
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
