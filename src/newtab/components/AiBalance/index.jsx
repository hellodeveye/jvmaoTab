import React from "react";
import { observer } from "mobx-react";
import cx from "classnames";
import { IconExternalLink } from "@tabler/icons-react";
import useStores from "~/hooks/useStores";
import {
  getDeepseekBalance,
  currencySymbol,
  DEEPSEEK_CONSOLE_URL,
} from "~/utils/deepseekBalance";
import "./index.scss";

/** 只有数据可能已经不准了才值得占一行字，所以 1 小时内不显示时间 */
const STALE_AFTER_MS = 60 * 60 * 1000;

function formatAge(updatedAt) {
  const elapsed = Date.now() - updatedAt;
  if (elapsed < STALE_AFTER_MS) return null;
  const hours = Math.floor(elapsed / STALE_AFTER_MS);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

const AiBalance = () => {
  const { option, tools } = useStores();
  const { deepseekApiKey = "" } = option.item;

  const [state, setState] = React.useState({
    data: null,
    updatedAt: null,
    error: null,
  });
  const [loading, setLoading] = React.useState(false);
  // 长时间开着的标签页不会重渲染，靠这个低频 tick 让「陈旧」标记按时出现
  const [, setTick] = React.useState(0);

  const load = React.useCallback(
    async (force) => {
      if (!deepseekApiKey) return;
      setLoading(true);
      try {
        setState(await getDeepseekBalance(deepseekApiKey, { force }));
      } finally {
        setLoading(false);
      }
    },
    [deepseekApiKey]
  );

  React.useEffect(() => {
    load(false);
  }, [load]);

  React.useEffect(() => {
    if (!deepseekApiKey) return undefined;
    const timer = setInterval(() => setTick((n) => n + 1), 60 * 1000);
    return () => clearInterval(timer);
  }, [deepseekApiKey]);

  if (!deepseekApiKey) return null;

  const { data, updatedAt, error } = state;
  const unauthorized = error?.type === "unauthorized";
  const insufficient = data && !data.isAvailable;
  const age = data && updatedAt ? formatAge(updatedAt) : null;

  const onClick = () => {
    if (unauthorized) {
      tools.preferencesOpen = true;
      return;
    }
    load(true);
  };

  const renderValue = () => {
    if (unauthorized) return <span className="value">密钥失效</span>;
    if (loading && !data) return <span className="skeleton" />;
    if (!data) return <span className="value">—</span>;
    return (
      <span className="value">
        {currencySymbol(data.currency)}
        {data.totalBalance.toFixed(2)}
      </span>
    );
  };

  const title = unauthorized
    ? "DeepSeek 密钥失效，点击前往设置"
    : error
      ? `${error.message}，显示的是上次的数据，点击重试`
      : "DeepSeek 余额，点击刷新";

  return (
    <div
      className={cx("aiBalance", { alert: unauthorized || insufficient })}
      onClick={onClick}
      title={title}
    >
      <div className="row">
        {renderValue()}
        <a
          className="link"
          href={DEEPSEEK_CONSOLE_URL}
          target="_blank"
          rel="noreferrer"
          title="打开 DeepSeek 控制台"
          onClick={(e) => e.stopPropagation()}
        >
          <IconExternalLink size={14} stroke={1.8} />
        </a>
      </div>
      {age ? <span className="age">{age}</span> : null}
    </div>
  );
};

export default observer(AiBalance);
