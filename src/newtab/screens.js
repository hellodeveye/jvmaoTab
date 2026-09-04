/**
 * 屏归属模型:首屏(0)之外固定一个副屏(1)。
 *
 * 归属一律「读取时归一」——实例的 screen 字段、homeLinkScreens 里的键
 * 缺失或非法都视为首屏(0),旧数据零迁移;未来扩 N 屏只需要放宽
 * normalizeScreen 的上界,存储形状不变。屏归属存在 option 表里,
 * 随现有导出与同步链路走,没有独立存储。
 *
 * 本文件保持零 import:模型层谁都可以放心引它,不会拖出 React 或存储侧依赖。
 */

/** 目前固定两屏:0 首屏,1 副屏 */
export const SCREEN_COUNT = 2;

/** 书签分组屏归属的 option 键:值形如 { [timeKey]: 0|1 },稀疏存储,缺项即首屏 */
export const LINK_SCREENS_KEY = "homeLinkScreens";

/** 屏展示名;目前两屏,未来扩 N 屏补标签即可 */
export const SCREEN_LABELS = ["首屏", "副屏"];

/** 归一屏编号:整数且落在 [0, SCREEN_COUNT) 内原样返回,否则回落首屏 */
export function normalizeScreen(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n >= SCREEN_COUNT) {
    return 0;
  }
  return n;
}

/** 单个小组件实例的屏归属(旧实例没有 screen 字段 → 首屏) */
export function instanceScreen(instance) {
  return normalizeScreen(instance?.screen);
}

/** 过滤出属于某一屏的实例列表;入参不是数组时返回空数组 */
export function instancesForScreen(instances, screen) {
  const target = normalizeScreen(screen);
  return (Array.isArray(instances) ? instances : []).filter(
    (instance) => instanceScreen(instance) === target
  );
}

/** 单个书签分组的屏归属(键缺失 → 首屏) */
export function linkGroupScreen(item, timeKey) {
  return normalizeScreen(item?.[LINK_SCREENS_KEY]?.[timeKey]);
}

/** 过滤出属于某一屏的分组 timeKey 列表 */
export function linkGroupsForScreen(item, timeKeys, screen) {
  const target = normalizeScreen(screen);
  return (Array.isArray(timeKeys) ? timeKeys : []).filter(
    (timeKey) => linkGroupScreen(item, timeKey) === target
  );
}

/**
 * 改一个分组的屏归属,返回下一份稀疏映射(不改动入参 item)。
 * 归首屏时删键而不是写 0:缺项即首屏,映射里只留真正在副屏的分组。
 */
export function setGroupScreen(item, timeKey, screen) {
  const map = { ...(item?.[LINK_SCREENS_KEY] || {}) };
  const next = normalizeScreen(screen);
  if (next === 0) {
    delete map[timeKey];
  } else {
    map[timeKey] = next;
  }
  return map;
}
