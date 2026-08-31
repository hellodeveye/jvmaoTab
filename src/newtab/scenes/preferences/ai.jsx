import React from "react";
import { observer } from "mobx-react";
import styled from "styled-components";
import { Form, Button, Input, Space, Typography, Divider } from "antd";
import useStores from "~/hooks/useStores";
import {
  fetchDeepseekBalance,
  clearDeepseekBalanceCache,
  currencySymbol,
  DEEPSEEK_CONSOLE_URL,
} from "~/utils/deepseekBalance";
import {
  fetchKimiUsage,
  clearKimiUsageCache,
  KIMI_CONSOLE_URL,
} from "~/utils/kimiUsage";

const Hint = styled.div`
  font-size: 11px;
  color: var(--colorTextSecondary);
  margin-top: 6px;
  line-height: 1.6;
`;

/* 首屏卡片在未配置密钥时不渲染，密钥填错时首屏同样什么都看不到，
   所以每个服务商都必须给出一次明确的验证结果。 */
const PROVIDERS = [
  {
    key: "deepseekApiKey",
    label: "DeepSeek API Key",
    placeholder: "sk-xxxxxxxxxxxx",
    consoleUrl: DEEPSEEK_CONSOLE_URL,
    verify: fetchDeepseekBalance,
    clearCache: clearDeepseekBalanceCache,
    describe: (data) =>
      `当前余额 ${currencySymbol(data.currency)}${data.totalBalance.toFixed(2)}`,
    hint: "首屏显示账户总余额（赠金 + 充值）。",
  },
  {
    key: "kimiApiKey",
    label: "Kimi Code API Key",
    placeholder: "sk-kimi-xxxxxxxxxxxx",
    consoleUrl: KIMI_CONSOLE_URL,
    verify: fetchKimiUsage,
    clearCache: clearKimiUsageCache,
    describe: (data) =>
      `滚动窗口已用 ${Math.round(data.windowPercent ?? data.weeklyPercent ?? 0)}%`,
    hint: "要 Coding Plan 的 sk-kimi-* 密钥；platform.kimi.com 的 sk-* 是另一套，会验证失败。该用量接口官方未公开文档，字段变动可能导致显示异常。",
  },
];

const ProviderField = observer((props) => {
  const { provider } = props;
  const { option, tools } = useStores();
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);
  const [tested, setTested] = React.useState(null);

  const saved = option.item[provider.key] || "";

  const onFinish = async (values) => {
    const apiKey = (values[provider.key] || "").trim();
    setLoading(true);
    setTested(null);
    try {
      const data = await provider.verify(apiKey);
      await option.setItem(provider.key, apiKey);
      // 换了密钥就可能换了账号，旧数据不能留
      await provider.clearCache();
      setTested(provider.describe(data));
      tools.success?.(`${provider.label} 验证成功`);
    } catch (err) {
      setTested(null);
      tools.error?.(err?.message || `${provider.label} 连接失败`);
    } finally {
      setLoading(false);
    }
  };

  const onClear = async () => {
    await option.setItem(provider.key, "");
    await provider.clearCache();
    form.setFieldValue(provider.key, "");
    setTested(null);
    tools.success?.(`已清除 ${provider.label}`);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{ [provider.key]: saved }}
      onFinish={onFinish}
    >
      <Form.Item
        label={provider.label}
        name={provider.key}
        rules={[{ required: true, message: "必填" }]}
      >
        <Input.Password placeholder={provider.placeholder} autoComplete="off" />
      </Form.Item>
      <Form.Item style={{ marginBottom: 0 }}>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            测试并保存
          </Button>
          {saved ? <Button onClick={onClear}>清除</Button> : null}
          <Typography.Link href={provider.consoleUrl} target="_blank">
            打开控制台
          </Typography.Link>
        </Space>
        {tested ? <Hint>{tested}</Hint> : null}
        <Hint>{provider.hint}</Hint>
      </Form.Item>
    </Form>
  );
});

const PreferencesAI = () => (
  <>
    {PROVIDERS.map((provider, index) => (
      <React.Fragment key={provider.key}>
        {index > 0 ? <Divider /> : null}
        <ProviderField provider={provider} />
      </React.Fragment>
    ))}
    <Divider />
    <Hint>
      密钥只保存在本机，不参与 WebDAV / Gist 同步，也不会出现在导出的数据文件里；
      换设备需要重新填写。验证通过后卡片显示在首屏右上角，每 15 分钟自动刷新，
      点击可手动刷新，拖动可调整位置。
    </Hint>
  </>
);

export default observer(PreferencesAI);
