import { useMemoizedFn } from "ahooks";
import { db } from "~/db";
import useStores from "~/hooks/useStores";
import { toPlain } from "./plain";

/* 组件的私有业务数据（待办条目一类），与 config 分开：
   config 是「设置」，这里是「内容」。走 db.option，因此随导出与同步走——
   待办本来就该跨设备同步。 */
const dataKey = (instanceId) => `widgetData.${instanceId}`;

/**
 * 组件自己的数据读写。返回 [data, setData]，setData 接受新值或 updater。
 * 写入前深度转纯对象，理由见 instances.js 的 toPlain。
 */
export function useWidgetData(instanceId, initial) {
  const { option } = useStores();
  const key = dataKey(instanceId);
  const stored = option.item[key];
  const data = stored === undefined ? initial : stored;

  const setData = useMemoizedFn((updater) => {
    const current = toPlain(option.item[key] ?? initial);
    const next = typeof updater === "function" ? updater(current) : updater;
    option.setItem(key, toPlain(next), false).catch((err) => {
      console.error(`[${key}] save failed:`, err);
    });
  });

  return [data, setData];
}

/**
 * 实例被移除时清掉它的数据行，否则会一直躺在库里和导出文件里。
 * option 没有删除单键的 API，这里直接删 db 行并同步内存副本。
 */
export async function dropWidgetData(option, instanceId) {
  const key = dataKey(instanceId);
  delete option.item[key];
  try {
    await db.option.where("key").equals(key).delete();
  } catch (err) {
    console.error(`[${key}] drop failed:`, err);
  }
}
