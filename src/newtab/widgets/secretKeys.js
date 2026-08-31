import { AI_SETTING_FIELDS } from "./ai/settings";

/* 只 import 各组件的 settings schema（叶子文件，不含 React），
   于是 stores/localOptions 能读到密钥键名而不会与组件形成循环依赖。
   新增带凭据的组件 = 在下面加一行它的 settings。 */
const ALL_SETTING_FIELDS = [...AI_SETTING_FIELDS];

/**
 * 声明为 secret 的设置键。这些键只写 chrome.storage.local：
 * 不进 IndexedDB，就不会出现在导出文件里，也不会被推到 WebDAV / Gist。
 */
export const WIDGET_SECRET_KEYS = ALL_SETTING_FIELDS.filter(
  (field) => field.secret
).map((field) => field.key);
