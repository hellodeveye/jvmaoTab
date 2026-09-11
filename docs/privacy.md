# NewTab 隐私政策 / Privacy Policy

最后更新：2026-09-11

## 一句话

NewTab 没有开发者服务器。你的数据只存在你自己的浏览器里，以及你自己配置的同步服务里。

## 开发者收集的数据

**没有。** 本项目不运营任何后端服务，没有统计、埋点、崩溃上报或广告 SDK，开发者无法访问你的任何数据。

## 数据存在哪里

以下数据只写入浏览器本地（`chrome.storage.local` 与扩展的 IndexedDB）：

- 链接与分组、首屏快捷方式的位置
- 小组件配置：天气城市、待办内容、各服务的 API Key
- 壁纸与界面偏好（主题、搜索框位置等）
- 同步凭据（WebDAV 地址与账号密码、GitHub Token）

卸载扩展即随浏览器一并删除，开发者无法恢复。

## 会发往第三方的请求

这些请求由你的浏览器直接发出，不经过开发者：

| 场景 | 去向 | 发送内容 |
| --- | --- | --- |
| 搜索 | 你选择的搜索引擎（Google / 百度 / 必应 / DuckDuckGo / 哔哩哔哩 等） | 你输入的关键词 |
| 特殊搜索引擎 | 豆包 / 元宝 / 千问 / ChatGPT / Gemini 等，仅在你选用该引擎时 | 关键词（填入对方页面的输入框） |
| 天气小组件 | Open-Meteo（`geocoding-api.open-meteo.com`、`api.open-meteo.com`） | 城市名或坐标 |
| 定位 | 浏览器 Geolocation API，仅当你授权且天气城市留空时 | 坐标（用于查询天气） |
| 壁纸 | `cn.bing.com`（Bing 每日图） | 无个人信息 |
| 链接图标 | 各站点自身的 favicon | 无 |
| AI 余额 / 用量 | DeepSeek（`api.deepseek.com`）、Kimi（`api.kimi.com`）、Factory（`app.factory.ai`）、Antix（`portal.antigma.ai`），仅在你配置了对应 API Key 后 | 你填写的 API Key |
| 同步 | 你自己填写的 WebDAV 服务器、或 `api.github.com`（Gist） | 你要同步的数据 |

## 权限用途

- `storage`：保存上述本地数据。
- `tabs`：读取当前标签页的地址与标题，用于「收藏到抽屉」。
- `favicon`：显示站点图标（`_favicon/*`）。
- `contextMenus`：提供右键「收藏网址到抽屉」。
- 站点访问权限（`<all_urls>`）：仅用于内容脚本的两件事——① 在你不支持 URL 参数的 AI 搜索引擎页面上，把关键词填进输入框；② 读取当前页面的 `<link rel="icon">` 以取得更好的图标。**不读取、不保存、不上传页面内容。**

## 你的控制权

- 「首选项 → 数据」可导出 / 导入全部数据，也可一键清除。
- 不配置同步与 API Key 时，扩展完全在本地运行。
- 卸载扩展即清除本地数据；同步产生的副本需要你自己在 WebDAV 或 Gist 中删除。

## 其他

本项目不面向 13 岁以下儿童。政策如有变更会更新本文件并记入扩展内 Changelog。任何疑问请在 [GitHub Issues](https://github.com/postdare/new-tab/issues) 提出。

---

## English summary

NewTab has no developer-operated server and collects no data. Links, widget settings, API keys and sync credentials are stored locally in your browser only. Requests to third parties (your chosen search engine, Open-Meteo for weather, Bing for wallpapers, `api.deepseek.com` / `api.kimi.com` / `app.factory.ai` / `portal.antigma.ai` for AI usage, and your own WebDAV / GitHub Gist for sync) are made directly by your browser and are never routed through the developer. The `<all_urls>` host permission is used only to fill the search box on AI search sites and to read the current page's favicon link — page content is never read, stored, or uploaded. Uninstalling the extension deletes all local data.
