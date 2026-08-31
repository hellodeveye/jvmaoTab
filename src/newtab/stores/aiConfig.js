/**
 * AI 服务商配置（额度组件用）的定义。
 * 这些键存放在 chrome.storage.local（见 aiConfigStorage.js），
 * 不写入 IndexedDB option 表，因此不会随数据导出/同步到远端。
 *
 * 刻意与 SYNC_CONFIG_KEYS 分开：那组键的语义是「同步连接配置」，
 * 且会被 clearSyncConfig() 在设置重置时整组清空。
 *
 * 本模块保持无浏览器 API 依赖，便于在 Node 测试环境中打包。
 */
export const AI_CONFIG_KEYS = ['deepseekApiKey', 'kimiApiKey'];

/**
 * 清除 option 表中的 AI 配置残留行。
 * 正常情况下不会有——这些键从未写入 db——但手动导入的外部快照可能带进来。
 */
export async function stripAiConfigRows(db) {
  const rows = await db.option.where('key').anyOf(AI_CONFIG_KEYS).toArray();
  if (rows.length > 0) {
    await db.option.bulkDelete(rows.map((row) => row.id));
  }
  return rows.length;
}
