/** 中文相对时间文案。放在展示层：这些是成品 UI 文案，不属于取数/缓存层。 */

/** 已过去多久：用于「数据是什么时候拿的」 */
export function formatAge(updatedAt) {
  if (!updatedAt) return null;
  const minutes = Math.floor((Date.now() - updatedAt) / 60000);
  if (minutes < 1) return "刚刚更新";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

/** 还剩多久：接口给的是绝对时间戳，展示成倒计时才对得上「还能不能继续写」 */
export function formatCountdown(isoTime) {
  if (!isoTime) return null;
  const target = Date.parse(isoTime);
  if (!Number.isFinite(target)) return null;

  const minutes = Math.floor((target - Date.now()) / 60000);
  if (minutes <= 0) return "即将重置";

  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days} 天 ${hours} 小时后重置`;
  if (hours > 0) return `${hours} 小时 ${minutes % 60} 分后重置`;
  return `${minutes} 分后重置`;
}
