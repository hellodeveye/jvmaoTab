import assert from "node:assert/strict";
import { build } from "esbuild";

/* aiProviders.format 的契约测试。
   aiProviders 的依赖链里有 ~/ 别名,裸 node 跑不了,照 DataStores.sync.test.mjs
   的先例:esbuild 打包 + stub 掉 ~/utils/storage,再从 data: URL 导入。
   format 是「数据 → 卡片文案」的纯函数,断言全部打在它身上。

   段名取 argv[2](kimi-bars / kimi-meta / regression),无参跑全部;
   verify.sh 的 ac1/ac2/ac3 分支各跑一段,互不牵连。 */

const result = await build({
  entryPoints: [new URL("./aiProviders.js", import.meta.url).pathname],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  plugins: [
    {
      name: "ai-providers-format-test-stubs",
      setup(builder) {
        builder.onResolve({ filter: /^~\/utils\/storage$/ }, () => ({
          path: "storage",
          namespace: "ai-format-test",
        }));
        builder.onLoad({ filter: /.*/, namespace: "ai-format-test" }, () => ({
          contents: `
            export default {
              async getBlob() { return null; },
              async setBlob() {},
            };
          `,
        }));
      },
    },
  ],
});

const { AI_PROVIDERS } = await import(
  `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
);

const byId = (id) => {
  const provider = AI_PROVIDERS.find((p) => p.id === id);
  assert.ok(provider, `provider ${id} 不在目录里`);
  return provider;
};

const kimi = byId("kimi");
const factory = byId("factory");
const deepseek = byId("deepseek");
const antix = byId("antix");

/* resetTime 用远期时间:倒计时落在「天」档,断言在测试运行窗口内稳定 */
const KIMI_DATA = {
  windowPercent: 42.4,
  windowReset: "2999-01-01T00:00:00Z",
  weeklyPercent: 17.6,
};

/** ac1:中卡进度条契约,与 Factory 同构;主数值行为与现状一致 */
function kimiBars() {
  const view = kimi.format(KIMI_DATA, "medium");
  assert.deepEqual(view.bars, [
    { label: "5 小时", percent: 42.4 },
    { label: "周", percent: 17.6 },
  ]);
  assert.equal(view.value, "42");
  assert.equal(view.suffix, "%");
  assert.equal(view.alert, false);

  // bars 无条件返回,小卡不渲染是 QuotaWidget showsBars 的事(与 Factory 一致)
  assert.deepEqual(kimi.format(KIMI_DATA, "small").bars, view.bars);

  // ≥90% 示警
  assert.equal(kimi.format({ ...KIMI_DATA, windowPercent: 92.5 }, "medium").alert, true);

  // null 的档位被过滤,主数值回落到 weeklyPercent
  const partial = kimi.format(
    { windowPercent: null, windowReset: null, weeklyPercent: 8 },
    "medium"
  );
  assert.deepEqual(partial.bars, [{ label: "周", percent: 8 }]);
  assert.equal(partial.value, "8");

  assert.deepEqual(
    kimi.format({ windowPercent: null, windowReset: null, weeklyPercent: null }, "medium")
      .bars,
    []
  );
}

/** ac2:meta 分尺寸——中卡不重复展示周用量,小卡维持现状文案 */
function kimiMeta() {
  const medium = kimi.format(KIMI_DATA, "medium");
  assert.equal(medium.meta.length, 1, "中卡 meta 只应剩倒计时一行");
  assert.match(medium.meta[0], /后重置|即将重置/);
  assert.ok(!medium.meta.some((line) => line.includes("周")), "中卡 meta 不该再有周文字");

  const small = kimi.format(KIMI_DATA, "small");
  assert.equal(small.meta.length, 2, "小卡 meta 应保持倒计时 + 周百分比");
  assert.match(small.meta[0], /后重置|即将重置/);
  assert.equal(small.meta[1], "周 18%");
  assert.equal(small.value, medium.value, "主数值不随尺寸变");

  // weeklyPercent 为 null:小卡的周文字行照旧消失(percentPart 的老规矩)
  const smallNoWeek = kimi.format({ ...KIMI_DATA, weeklyPercent: null }, "small");
  assert.equal(smallNoWeek.meta.length, 1);
}

/** ac3:既有 provider 的输出锁定为回归基线 */
function regression() {
  const FACTORY_DATA = {
    fiveHourPercent: 10.4,
    fiveHourReset: "2999-01-01T05:00:00Z",
    weeklyPercent: 20.5,
    monthlyPercent: 30.6,
  };
  const factoryView = factory.format(FACTORY_DATA);
  assert.deepEqual(factoryView.bars, [
    { label: "5 小时", percent: 10.4 },
    { label: "周", percent: 20.5 },
    { label: "月", percent: 30.6 },
  ]);
  assert.equal(factoryView.value, "10");
  assert.equal(factoryView.suffix, "%");
  assert.equal(factoryView.meta.length, 1, "Factory meta 只含倒计时");

  const deepseekView = deepseek.format({
    currency: "CNY",
    totalBalance: 12.34,
    isAvailable: true,
  });
  assert.equal(deepseekView.prefix, "¥");
  assert.equal(deepseekView.value, "12.34");
  assert.equal(deepseekView.alert, false);
  assert.deepEqual(deepseekView.meta, []);

  const antixView = antix.format({
    currency: "USD",
    totalBalance: 4,
    isAvailable: false,
  });
  assert.equal(antixView.prefix, "$");
  assert.equal(antixView.value, "4.00");
  assert.equal(antixView.alert, true);
}

const sections = { "kimi-bars": kimiBars, "kimi-meta": kimiMeta, regression };

const requested = process.argv[2];
if (requested && !sections[requested]) {
  console.error(`unknown section: ${requested}`);
  process.exit(2);
}
for (const [name, run] of Object.entries(sections)) {
  if (requested && name !== requested) continue;
  run();
  console.log(`ok - ${name}`);
}
