import React from "react";
import { observer } from "mobx-react";
import styled from "styled-components";
import { Form, Button, Input, Space, Typography } from "antd";
import useStores from "~/hooks/useStores";
import {
  fetchDeepseekBalance,
  clearDeepseekBalanceCache,
  currencySymbol,
  DEEPSEEK_CONSOLE_URL,
} from "~/utils/deepseekBalance";

const Hint = styled.div`
  font-size: 11px;
  color: var(--colorTextSecondary);
  margin-top: 6px;
  line-height: 1.6;
`;

const PreferencesAI = () => {
  const { option, tools } = useStores();
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);
  const [tested, setTested] = React.useState(null);

  const { deepseekApiKey = "" } = option.item;

  // 首屏组件在未配置密钥时完全不渲染，密钥填错时首屏同样什么都看不到，
  // 所以这里必须给出一次明确的验证结果。
  const onFinish = async (values) => {
    const apiKey = (values.deepseekApiKey || "").trim();
    setLoading(true);
    setTested(null);
    try {
      const data = await fetchDeepseekBalance(apiKey);
      await option.setItem("deepseekApiKey", apiKey);
      // 换了密钥就可能换了账号，旧余额不能留
      await clearDeepseekBalanceCache();
      setTested(data);
      tools.success?.("DeepSeek 密钥验证成功");
    } catch (err) {
      setTested(null);
      tools.error?.(err?.message || "DeepSeek 连接失败");
    } finally {
      setLoading(false);
    }
  };

  const onClear = async () => {
    await option.setItem("deepseekApiKey", "");
    await clearDeepseekBalanceCache();
    form.setFieldValue("deepseekApiKey", "");
    setTested(null);
    tools.success?.("已清除 DeepSeek 密钥");
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{ deepseekApiKey }}
      onFinish={onFinish}
    >
      <Form.Item
        label="DeepSeek API Key"
        name="deepseekApiKey"
        rules={[{ required: true, message: "必填" }]}
      >
        <Input.Password placeholder="sk-xxxxxxxxxxxx" autoComplete="off" />
      </Form.Item>
      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            测试并保存
          </Button>
          {deepseekApiKey ? <Button onClick={onClear}>清除</Button> : null}
          <Typography.Link href={DEEPSEEK_CONSOLE_URL} target="_blank">
            打开控制台
          </Typography.Link>
        </Space>
        {tested ? (
          <Hint>
            当前余额 {currencySymbol(tested.currency)}
            {tested.totalBalance.toFixed(2)}
          </Hint>
        ) : null}
        <Hint>
          密钥只保存在本机，不参与 WebDAV / Gist 同步，也不会出现在导出的数据文件里；
          换设备需要重新填写。验证通过后余额显示在首屏右上角，每 15 分钟自动刷新，点击可手动刷新。
        </Hint>
      </Form.Item>
    </Form>
  );
};

export default observer(PreferencesAI);
