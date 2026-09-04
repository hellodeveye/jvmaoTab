import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

/* 屏归属模型的契约测试。
   screens.js 本身零依赖可裸跑,但它要和 instances.js(依赖 ~ 别名)一起锁
   契约,照 gallery.model.test.mjs 的先例:esbuild 打包 + stub 掉边界模块,
   再从 data: URL 导入。

     ~/utils            getID → 自增序号,断言可预测
     ~/widgets/registry 注册表 → 测试自己塞假定义
     ~/widgets/settings checkAvailable → 只测屏归属,不测前置条件

   段名取 argv[2](assign / filter / group / regression),无参跑全部;
   verify.sh 的 model 分支跑全部。 */

const STUBS = {
  utils: `
    let seq = 0;
    export const getID = () => \`id-\${++seq}\`;
  `,
  registry: `
    const defs = new Map();
    export function __setRegistry(list) {
      defs.clear();
      for (const d of list) defs.set(d.type, d);
    }
    export function getWidget(type) {
      return defs.get(type) || null;
    }
  `,
  settings: `
    export function checkAvailable() {
      return { ok: true };
    }
  `,
};

/* 按「解析后的绝对路径」打桩:别名与相对导入殊途同归 */
const NEWTAB = path.resolve(fileURLToPath(import.meta.url), "..");
const PATH_STUBS = new Map([
  [path.join(NEWTAB, "utils", "index.js"), STUBS.utils],
  [path.join(NEWTAB, "widgets", "registry.js"), STUBS.registry],
  [path.join(NEWTAB, "widgets", "settings.js"), STUBS.settings],
]);

/** 常规扩展名/目录 index 的解析;找不到返回 null 交回 esbuild 报错 */
function resolveReal(base) {
  for (const c of [
    base,
    `${base}.js`,
    `${base}.jsx`,
    path.join(base, "index.js"),
    path.join(base, "index.jsx"),
  ]) {
    try {
      if (fs.statSync(c).isFile()) return c;
    } catch {}
  }
  return null;
}

const result = await build({
  stdin: {
    contents: `
      export {
        SCREEN_COUNT, LINK_SCREENS_KEY, normalizeScreen, instanceScreen,
        instancesForScreen, linkGroupScreen, linkGroupsForScreen, setGroupScreen,
      } from "~/screens";
      export {
        WIDGETS_KEY, listInstances, createInstance, addInstance, updateInstance,
      } from "~/widgets/instances";
      export { __setRegistry } from "~/widgets/registry";
    `,
    resolveDir: new URL(".", import.meta.url).pathname,
    sourcefile: "screens.model.entries.js",
  },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  plugins: [
    {
      name: "screens-model-test-stubs",
      setup(builder) {
        builder.onResolve({ filter: /.*/ }, (args) => {
          if (args.namespace === "stub") return; // 已打桩的不再解析
          let abs;
          if (args.path.startsWith("~/")) {
            abs = resolveReal(path.join(NEWTAB, args.path.slice(2)));
            if (!abs) return; // 交给 esbuild 报正常错
          } else if (args.path.startsWith(".")) {
            abs = resolveReal(path.resolve(path.dirname(args.importer), args.path));
            if (!abs) return;
          } else {
            return; // bare module(node_modules),默认解析
          }
          const stub = PATH_STUBS.get(abs);
          return stub ? { path: abs, namespace: "stub" } : { path: abs };
        });
        builder.onLoad({ filter: /.*/, namespace: "stub" }, (args) => ({
          contents: PATH_STUBS.get(args.path),
        }));
      },
    },
  ],
});

const m = await import(
  `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
);

const def = (type, over = {}) => ({
  type,
  title: `组件${type}`,
  summary: "测试用组件",
  sizes: ["small", "medium"],
  settings: [],
  configSchema: [],
  defaultConfig: {},
  ...over,
});
const inst = (type, id, over = {}) => ({
  id,
  type,
  size: "small",
  position: { right: 0, top: 0 },
  config: {},
  ...over,
});

/** AC:屏归属归一 —— 缺省/非法值一律回落首屏,且只有两屏 */
function assign() {
  assert.equal(m.SCREEN_COUNT, 2);
  assert.equal(m.LINK_SCREENS_KEY, "homeLinkScreens");

  // 归一:合法值保留,缺省/非法/越界回落 0
  assert.equal(m.normalizeScreen(0), 0);
  assert.equal(m.normalizeScreen(1), 1);
  assert.equal(m.normalizeScreen(undefined), 0);
  assert.equal(m.normalizeScreen(null), 0);
  assert.equal(m.normalizeScreen(""), 0);
  assert.equal(m.normalizeScreen("1"), 1);
  assert.equal(m.normalizeScreen(2), 0);
  assert.equal(m.normalizeScreen(-1), 0);
  assert.equal(m.normalizeScreen(1.5), 0);
  assert.equal(m.normalizeScreen(NaN), 0);

  // 实例归属:没有 screen 字段的旧实例视为首屏
  assert.equal(m.instanceScreen(inst("a", "1")), 0);
  assert.equal(m.instanceScreen(inst("a", "1", { screen: 1 })), 1);
  assert.equal(m.instanceScreen(inst("a", "1", { screen: 9 })), 0);
  assert.equal(m.instanceScreen(null), 0);

  // createInstance 落 screen,非法值归一
  m.__setRegistry([def("a")]);
  const [s0] = m.addInstance([], def("a"), "small", { right: 0, top: 0 });
  assert.equal(s0.screen, 0);
  const [s1] = m.addInstance([], def("a"), "small", { right: 0, top: 0 }, 1);
  assert.equal(s1.screen, 1);
  const [sBad] = m.addInstance(
    [],
    def("a"),
    "small",
    { right: 0, top: 0 },
    "bogus"
  );
  assert.equal(sBad.screen, 0);
}

/** AC:实例按屏过滤 —— 只渲染所属屏,旧数据全归首屏 */
function filter() {
  const instances = [
    inst("a", "1"),
    inst("b", "2", { screen: 1 }),
    inst("c", "3", { screen: 1 }),
    inst("d", "4", { screen: 5 }),
  ];

  const home = m.instancesForScreen(instances, 0);
  assert.deepEqual(
    home.map((i) => i.id),
    ["1", "4"],
    "无字段与越界的实例都应归首屏"
  );

  const second = m.instancesForScreen(instances, 1);
  assert.deepEqual(
    second.map((i) => i.id),
    ["2", "3"]
  );

  // 非数组入参返回空数组而不是抛错
  assert.deepEqual(m.instancesForScreen(undefined, 0), []);
  assert.deepEqual(m.instancesForScreen(null, 1), []);

  // listInstances 读出的实例带 screen 字段原样保留(不被读取路径吃掉)
  m.__setRegistry([def("a"), def("b")]);
  const item = { widgets: instances };
  const listed = m.listInstances(item);
  assert.equal(listed.find((i) => i.id === "2").screen, 1);

  // updateInstance 可以改屏归属
  const moved = m.updateInstance(listed, "1", { screen: 1 });
  assert.equal(moved.find((i) => i.id === "1").screen, 1);
}

/** AC:书签分组按屏过滤与移动 —— 稀疏映射,缺项即首屏,归首屏删键 */
function group() {
  // 键缺失 → 首屏
  assert.equal(m.linkGroupScreen({}, "g1"), 0);
  const item = { homeLinkScreens: { g2: 1, g3: 7 } };
  assert.equal(m.linkGroupScreen(item, "g1"), 0);
  assert.equal(m.linkGroupScreen(item, "g2"), 1);
  assert.equal(m.linkGroupScreen(item, "g3"), 0, "越界值归一回首屏");

  // 过滤:旧数据(无该键)全部归首屏
  const keys = ["g1", "g2", "g3"];
  assert.deepEqual(m.linkGroupsForScreen({}, keys, 0), ["g1", "g2", "g3"]);
  assert.deepEqual(m.linkGroupsForScreen({}, keys, 1), []);
  assert.deepEqual(m.linkGroupsForScreen(item, keys, 0), ["g1", "g3"]);
  assert.deepEqual(m.linkGroupsForScreen(item, keys, 1), ["g2"]);

  // 移动:移副屏写键,移首屏删键,不改入参 item
  const item2 = {};
  const toSecond = m.setGroupScreen(item2, "g1", 1);
  assert.deepEqual(toSecond, { g1: 1 });
  assert.deepEqual(item2, {}, "setGroupScreen 不得改动入参 item");
  const back = m.setGroupScreen({ ...item2, homeLinkScreens: { g1: 1, g2: 1 } }, "g1", 0);
  assert.deepEqual(back, { g2: 1 }, "归首屏应删键而不是写 0");
  // 非法屏号归一首屏 → 删键
  assert.deepEqual(m.setGroupScreen({ homeLinkScreens: { g1: 1 } }, "g1", 9), {});
}

/** AC:既有实例函数行为回归 —— 屏字段不改变原有语义 */
function regression() {
  assert.equal(m.WIDGETS_KEY, "widgets");
  const A = def("a");
  m.__setRegistry([A]);

  // addInstance 同类型栅栏仍生效(不因新参数绕开)
  const added = m.addInstance([], A, "small", { right: 0, top: 0 });
  const again = m.addInstance(added, A, "small", { right: 99, top: 99 }, 1);
  assert.strictEqual(again, added);
  assert.equal(again.length, 1);
  assert.equal(again[0].screen, 0, "被拦截的重复添加不得改屏");

  // 读取:非数组与空输入;未知 type 过滤(现状)
  assert.deepEqual(m.listInstances(undefined), []);
  assert.deepEqual(m.listInstances({}), []);
}

const sections = {
  assign,
  filter,
  group,
  regression,
};

const requested = process.argv[2];
if (requested && !sections[requested]) {
  console.error(`unknown section: ${requested}`);
  process.exit(2);
}
for (const [name, run] of Object.entries(sections)) {
  if (requested && name !== requested) continue;
  await run();
  console.log(`ok - ${name}`);
}
