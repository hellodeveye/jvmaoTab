/**
 * 同步连接配置（凭据与本地同步状态）的键名。
 * 存放位置与读写见 localOptions.js —— 它们和 AI 密钥同属「只落本地」的一组。
 *
 * 本模块保持无浏览器 API 依赖，便于在 Node 测试环境中打包。
 */
export const SYNC_CONFIG_KEYS = [
  'syncType',
  'githubToken',
  'githubGistId',
  'webDavURL',
  'webDavUsername',
  'webDavPassword',
  'webDavDir',
  'webdavVersion',
];
