import { storageGet, storageSet, storageRemove } from "./browserLocalStore";
import { SYNC_CONFIG_KEYS } from "./syncConfig";
import { WIDGET_SECRET_KEYS } from "~/widgets/secretKeys";

/**
 * 「只落本地、不进 IndexedDB」的 option 键注册表。
 *
 * 这些键存在 chrome.storage.local：不写入 db 就不会随数据导出，也不会被推到
 * WebDAV / Gist。同步凭据与组件密钥是同一件事的两组，走同一套读写；
 * 组件那一组由各组件的 settings schema 声明 secret 派生（见 ~/widgets/secretKeys），
 * 加一个带密钥的组件不需要回来改这里，setOption / resetOption / 启动清理都会自动覆盖到。
 *
 * 注意与本文件无关的 OptionStores.localStorageKeys：那些键照样进 db，
 * 只是跳过同步推送，语义完全不同。
 */
export const LOCAL_OPTION_KEYS = [...SYNC_CONFIG_KEYS, ...WIDGET_SECRET_KEYS];

const LOCAL_OPTION_KEY_SET = new Set(LOCAL_OPTION_KEYS);

export function isLocalOptionKey(key) {
  return LOCAL_OPTION_KEY_SET.has(key);
}

/** 一次读回全部本地键（仅返回已存在的） */
export async function loadLocalOptions() {
  const result = await storageGet(LOCAL_OPTION_KEYS);
  const config = {};
  LOCAL_OPTION_KEYS.forEach((key) => {
    if (result[key] !== undefined) {
      config[key] = result[key];
    }
  });
  return config;
}

export function saveLocalOption(key, value) {
  return storageSet({ [key]: value });
}

/** 清空全部本地键（设置重置时使用） */
export function clearLocalOptions() {
  return storageRemove(LOCAL_OPTION_KEYS);
}

/**
 * 清除 db 里的本地键残留行。
 * 正常情况下不会有——这些键从未写入 db——但远端拉取或手动导入的快照可能带回来，
 * 带回来就意味着旧凭据会回流并参与同步。
 */
export async function stripLocalOptionRows(db) {
  const rows = await db.option.where("key").anyOf(LOCAL_OPTION_KEYS).toArray();
  if (rows.length > 0) {
    await db.option.bulkDelete(rows.map((row) => row.id));
  }
  return rows.length;
}
