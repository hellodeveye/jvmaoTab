import React from "react";
import { observer } from "mobx-react";
import styled from "styled-components";
import { Form, Button, Input, Space, Typography, Divider } from "antd";
import useStores from "~/hooks/useStores";
import { AI_PROVIDERS } from "~/utils/aiProviders";

const Hint = styled.div`
  font-size: 11px;
  color: var(--colorTextSecondary);
  margin-top: 6px;
  line-height: 1.6;
`;

/* 首屏卡片在未配置密钥时不渲染，密钥填错时首屏同样什么都看不到，
   所以每个服务商都必须给出一次明确的验证结果。 */
const ProviderField = observer((props) => {
  const { provider } = props;
  const { option, tools } = useStores();
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);
  const [tested, setTested] = React.useState(null);

  const saved = option.item[provider.optionKey] || "";

  const onFinish = async (values) => {
    const apiKey = (values[provider.optionKey] || "").trim();
    setLoading(true);
    setTested(null);
    try {
      const data = await provider.quota.verify(apiKey);
      await option.setItem(provider.optionKey, apiKey);
      // 换了密钥就可能换了账号，旧数据不能留
      await provider.quota.clearCache();
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
    await option.setItem(provider.optionKey, "");
    await provider.quota.clearCache();
    form.setFieldValue(provider.optionKey, "");
    setTested(null);
    tools.success?.(`已清除 ${provider.label}`);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{ [provider.optionKey]: saved }}
      onFinish={onFinish}
    >
      <Form.Item
        label={provider.label}
        name={provider.optionKey}
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
    {AI_PROVIDERS.map((provider, index) => (
      <React.Fragment key={provider.optionKey}>
        {index > 0 ? <Divider /> : null}
        <ProviderField provider={provider} />
      </React.Fragment>
    ))}
    <Divider />
    <Hint>
      密钥只保存在本机，不参与 WebDAV / Gist 同步，也不会出现在导出的数据文件里；
      换设备需要重新填写。验证通过后到「小组件」里把卡片添加到首屏，
      它每 15 分钟自动刷新，点击可手动刷新，拖动可调整位置。
    </Hint>
  </>
);

export default observer(PreferencesAI);
