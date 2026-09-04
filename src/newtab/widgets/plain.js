/**
 * 深度转纯对象。
 *
 * option.item 取回的是 MobX observable，数组元素、position、config 全是 Proxy；
 * 带着 Proxy 写 IndexedDB 会因为无法结构化克隆而整次写入失败——现象是
 * 「拖完刷新，位置又变回去了」，而且控制台安静得像什么都没发生。
 * 所有写回 option 的路径都必须先过这里。
 *
 * 单独成文件（不放 instances.js）是为了断开一条循环依赖：
 * storage → instances → registry → todo → storage。这里没有任何 import，
 * 谁都可以放心引它。
 */
export function toPlain(value) {
  if (Array.isArray(value)) return value.map(toPlain);
  if (value && typeof value === "object") {
    const plain = {};
    Object.keys(value).forEach((key) => {
      plain[key] = toPlain(value[key]);
    });
    return plain;
  }
  return value;
}
