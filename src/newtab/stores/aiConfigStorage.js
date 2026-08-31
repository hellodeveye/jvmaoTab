import { AI_CONFIG_KEYS, stripAiConfigRows } from "./aiConfig";
import { storageGet, storageSet, storageRemove } from "./browserLocalStore";

/** 读取全部 AI 配置（仅返回已存在的键） */
export async function loadAiConfig() {
  const result = await storageGet(AI_CONFIG_KEYS);
  const config = {};
  AI_CONFIG_KEYS.forEach((key) => {
    if (result[key] !== undefined) {
      config[key] = result[key];
    }
  });
  return config;
}

export function saveAiConfigValue(key, value) {
  return storageSet({ [key]: value });
}

/** 清空全部 AI 配置（设置重置时使用） */
export function clearAiConfig() {
  return storageRemove(AI_CONFIG_KEYS);
}

/** 启动时清理 db 中可能由外部导入带进来的残留行 */
export function pruneAiConfigFromDb(db) {
  return stripAiConfigRows(db);
}
