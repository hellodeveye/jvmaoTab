import { tint } from "../tints";
import WeatherWidget from "./WeatherWidget";

/**
 * 天气卡。数据层在 weatherCore.js：Open-Meteo 预报 + 地理编码，
 * 非商用免费且不要密钥，所以没有类型级设置，组件库里直接就能添加。
 *
 * 城市是实例配置：填了就固定显示那座城，留空先试浏览器定位
 * （拿定位坐标反查城市名），定位不可用落到默认的西安。
 */
export const WEATHER_WIDGET = {
  type: "weather",
  title: "天气",
  summary: "当前天气与未来几天；默认西安，留空城市可自动定位",
  group: "生活",
  sizes: ["small", "medium", "large"],
  /* 天空蓝，比 DeepSeek 卡的靛蓝更青一些，两张深色卡放得开 */
  scheme: "dark",
  tint: tint(
    "linear-gradient(158deg, rgba(38, 124, 208, 0.74) 0%, rgba(28, 96, 176, 0.68) 52%, rgba(52, 132, 216, 0.72) 100%)"
  ),
  Component: WeatherWidget,
  configSchema: [
    {
      key: "city",
      label: "城市",
      type: "text",
      placeholder: "留空自动定位，定位不可用时显示西安",
      hint: "填城市名（如「上海」）则固定显示该城市；留空会尝试浏览器定位，拿不到位置时显示西安。",
    },
  ],
  defaultConfig: { city: "" },
  instanceTitle: (instance) => {
    const city = instance.config?.city?.trim();
    return city ? `天气 · ${city}` : "天气 · 当地";
  },
};
