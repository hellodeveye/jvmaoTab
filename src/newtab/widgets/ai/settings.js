import { AI_PROVIDERS } from "~/utils/aiProviders";

/**
 * AI 组件的类型级设置：一把密钥，该服务商的所有实例共用。
 *
 * 单独成文件、且不 import 任何 React 代码，是因为 stores/localOptions 要读出
 * secret 键名才能把它们只写进 chrome.storage.local；而 localOptions 不能 import
 * 注册表——注册表会拉进组件，组件 import useStores，就成了
 * stores → registry → Component → hooks → stores 的环。
 */
export function providerSettings(provider) {
  return [
    {
      key: provider.optionKey,
      label: provider.label,
      type: "password",
      /** 只落 chrome.storage.local：不进 db 就不会随导出外流，也不会被推去同步 */
      secret: true,
      required: true,
      placeholder: provider.placeholder,
      /** 「测试并保存」：验证通过才写入，返回值交给 describe 报告一句人话 */
      verify: (value) => provider.quota.verify(value),
      describe: provider.describe,
      /** 换了密钥就可能换了账号，旧缓存不能留 */
      afterSave: () => provider.quota.clearCache(),
      link: { text: "打开控制台", url: provider.consoleUrl },
      hint: provider.hint,
    },
  ];
}

export const AI_SETTING_FIELDS = AI_PROVIDERS.flatMap(providerSettings);
