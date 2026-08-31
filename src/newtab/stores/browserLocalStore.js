import { browserApi, getLastError } from "@/utils/browser";

/**
 * chrome.storage.local 的 Promise 封装。
 * 凭据类配置（同步账号、AI 服务商密钥）都存在这里，不进 IndexedDB，
 * 因此不会随数据导出或云端同步离开本机。
 */

export function storageGet(keys) {
  return new Promise((resolve) => {
    if (!browserApi?.storage?.local) {
      resolve({});
      return;
    }
    browserApi.storage.local.get(keys, (result) => {
      void getLastError();
      resolve(result || {});
    });
  });
}

export function storageSet(data) {
  return new Promise((resolve) => {
    if (!browserApi?.storage?.local) {
      resolve();
      return;
    }
    browserApi.storage.local.set(data, () => {
      void getLastError();
      resolve();
    });
  });
}

export function storageRemove(keys) {
  return new Promise((resolve) => {
    if (!browserApi?.storage?.local) {
      resolve();
      return;
    }
    browserApi.storage.local.remove(keys, () => {
      void getLastError();
      resolve();
    });
  });
}
