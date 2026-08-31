import { SYNC_CONFIG_KEYS } from "./syncConfig";
import { storageGet, storageSet } from "./browserLocalStore";

const MIGRATED_FLAG = 'syncConfigMigrated';

/**
 * 首次运行把 db.option 里的同步配置迁移到 chrome.storage.local
 * （chrome.storage.local 已有非空值时以本地为准，防止旧数据覆盖）。
 * 这是 sync 独有的历史包袱，AI 密钥从一开始就只落本地，不需要迁移。
 *
 * 迁移要读 db 里的旧行，所以必须在 stripLocalOptionRows 之前调用。
 */
export async function migrateSyncConfigFromDb(db) {
  const { [MIGRATED_FLAG]: migrated } = await storageGet([MIGRATED_FLAG]);
  if (migrated) return;

  const rows = await db.option.where('key').anyOf(SYNC_CONFIG_KEYS).toArray();
  const existing = await storageGet(SYNC_CONFIG_KEYS);
  const data = { [MIGRATED_FLAG]: true };
  rows.forEach((row) => {
    const hasLocal = existing[row.key] !== undefined && existing[row.key] !== '';
    if (!hasLocal && row.value !== undefined) {
      data[row.key] = row.value;
    }
  });
  await storageSet(data);
}
