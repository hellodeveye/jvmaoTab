import Storage from "~/utils/storage";
import { requestJson, loadWithCache } from "~/utils/aiProviderCore";

/* 天气数据层：城市 → 坐标 → 预报。
   数据源 Open-Meteo（open-meteo.com）：非商用完全免费、不要密钥、CORS 全开，
   于是这个组件没有类型级设置，组件库里直接就能添加。
   逆地理编码用 BigDataCloud 的 client 接口，同样是免密钥的免费额度。 */

/** 浏览器定位的等待上限：新标签页的生命周期不长，等不来就落默认城市 */
const GEO_TIMEOUT_MS = 8000;

/** 城市坐标基本不变，缓存可以放很久 */
const CITY_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** 定位成功的地点：搬家 / 出差后最多半天就会重新定位 */
const LOCATED_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
/** 定位失败落到默认城市：缓存放短些，用户放开权限后能尽快跟上 */
const FALLBACK_CACHE_TTL_MS = 15 * 60 * 1000;

/** 默认城市：西安（AC 要求的兜底）。坐标取自 Open-Meteo 地理编码的返回 */
export const DEFAULT_PLACE = {
  latitude: 34.25833,
  longitude: 108.92861,
  name: "西安",
  source: "fallback",
};

const PLACE_CACHE_KEY = "weather.place";

async function readCache(key) {
  try {
    const row = await Storage.get(key);
    return row?.value || null;
  } catch (err) {
    console.error("[weather] 读取缓存失败:", err);
    return null;
  }
}

function writeCache(key, value) {
  // 缓存写失败无所谓，下次再取就是了
  return Storage.set(key, { value }).catch((err) => {
    console.error("[weather] 写入缓存失败:", err);
  });
}

function isFresh(cached, ttl) {
  return !!cached?.at && Date.now() - cached.at < ttl;
}

/** 地名 → 坐标。搜不到时抛 notfound，由卡片显示明确原因 */
export async function geocodeCity(name) {
  const params = new URLSearchParams({
    name,
    count: "1",
    language: "zh",
    format: "json",
  });
  const res = await requestJson(
    `https://geocoding-api.open-meteo.com/v1/search?${params}`
  );
  const hit = res?.results?.[0];
  if (!hit) {
    const error = new Error(`没有找到「${name}」`);
    error.type = "notfound";
    throw error;
  }
  return {
    latitude: hit.latitude,
    longitude: hit.longitude,
    name: hit.name,
    source: "city",
  };
}

/** 坐标 → 城市名。这是锦上添花的一步，拿不到名字就退回「当前位置」 */
async function reverseGeocode(latitude, longitude) {
  try {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      localityLanguage: "zh",
    });
    const res = await requestJson(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`
    );
    return res?.city || res?.locality || res?.principalSubdivision || "";
  } catch (err) {
    console.error("[weather] 逆地理编码失败:", err);
    return "";
  }
}

/** navigator.geolocation 的 Promise 封装 */
function currentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      const error = new Error("浏览器不支持定位");
      error.type = "geolocation";
      reject(error);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => {
        const error = new Error("定位不可用");
        error.type = "geolocation";
        console.error("[weather] 定位失败:", err?.message);
        reject(error);
      },
      // maximumAge 让浏览器直接给出近期定位，省一次等星历的时间
      { timeout: GEO_TIMEOUT_MS, maximumAge: 10 * 60 * 1000 }
    );
  });
}

/**
 * 决定这张卡显示哪座城市：
 * - 用户填了城市名 → 固定用它（先查缓存，城市坐标几乎不变）；
 * - 留空 → 先用缓存的定位结果，过期了再问浏览器要坐标，问到了反查城市名；
 * - 定位被拒或失败 → 落到默认城市西安。
 */
export async function resolvePlace(city, { force = false } = {}) {
  const trimmed = (city || "").trim();
  if (trimmed) {
    const key = `weather.city.${trimmed}`;
    const cached = await readCache(key);
    if (!force && isFresh(cached, CITY_CACHE_TTL_MS)) return cached.place;
    // 城市名查不到要往上抛：用户填错了就该看到原因，不能默默换成别的城市
    const place = await geocodeCity(trimmed);
    writeCache(key, { place, at: Date.now() });
    return place;
  }

  const cached = await readCache(PLACE_CACHE_KEY);
  const ttl =
    cached?.place?.source === "located"
      ? LOCATED_CACHE_TTL_MS
      : FALLBACK_CACHE_TTL_MS;
  if (!force && isFresh(cached, ttl)) return cached.place;

  try {
    const coords = await currentPosition();
    const name = await reverseGeocode(coords.latitude, coords.longitude);
    const place = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      name: name || "当前位置",
      source: "located",
    };
    writeCache(PLACE_CACHE_KEY, { place, at: Date.now() });
    return place;
  } catch (err) {
    writeCache(PLACE_CACHE_KEY, { place: DEFAULT_PLACE, at: Date.now() });
    return DEFAULT_PLACE;
  }
}

function forecastUrl(place) {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    timezone: "auto",
    forecast_days: "4",
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

/** 只留卡片要用的字段，接口字段名（snake_case）不出这一层 */
function normalizeForecast(res) {
  const current = res?.current || {};
  const daily = res?.daily || {};
  return {
    temperature: current.temperature_2m,
    apparent: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    wind: current.wind_speed_10m,
    isDay: current.is_day !== 0,
    code: current.weather_code,
    days: (daily.time || []).map((date, index) => ({
      date,
      code: daily.weather_code?.[index],
      max: daily.temperature_2m_max?.[index],
      min: daily.temperature_2m_min?.[index],
    })),
  };
}

/** 同一坐标的天气全局共用一份缓存：两张不同城市的卡互不干扰，同城的互享 */
function weatherCacheKey(place) {
  const lat = place.latitude.toFixed(2);
  const lon = place.longitude.toFixed(2);
  return `weather.point.${lat},${lon}`;
}

/**
 * 取天气预报。loadWithCache 提供 15 分钟 TTL、失败落旧数据（陈旧标记）、
 * 错误分型——天气半小时一趟已经够新鲜，直接沿用同一套缓存策略。
 */
export function loadWeather(place, options) {
  return loadWithCache(
    weatherCacheKey(place),
    () => requestJson(forecastUrl(place)).then(normalizeForecast),
    options
  );
}

/* WMO 4677 天气码 → 中文。没列出的码（理论上不会出现）显示成 — */
const WMO_TEXT = {
  0: "晴",
  1: "基本晴",
  2: "多云",
  3: "阴",
  45: "雾",
  48: "雾凇",
  51: "小毛毛雨",
  53: "毛毛雨",
  55: "浓毛毛雨",
  56: "冻毛毛雨",
  57: "冻毛毛雨",
  61: "小雨",
  63: "中雨",
  65: "大雨",
  66: "冻雨",
  67: "冻雨",
  71: "小雪",
  73: "中雪",
  75: "大雪",
  77: "雪粒",
  80: "小阵雨",
  81: "阵雨",
  82: "强阵雨",
  85: "小阵雪",
  86: "阵雪",
  95: "雷阵雨",
  96: "雷阵雨伴冰雹",
  99: "雷阵雨伴冰雹",
};

export function weatherText(code) {
  return WMO_TEXT[code] ?? "—";
}
