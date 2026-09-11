# Edge Add-ons 上架材料 — NewTab v1.5.0

Edge 上架**不需要注册费**（Chrome 的 5 美元不用交）。上传、审核需要你本人登录账号完成，下面的字段可以直接复制粘贴。

---

## 0. 你需要亲自做的

1. 注册 Partner Center 的 Edge 程序（免费，用 Microsoft 账号）：<https://partner.microsoft.com/dashboard/microsoftedge/>
2. 上传 zip、粘贴下面的字段、提交、等审核（通常几天）
3. 支持邮箱填你自己的

---

## 1. 上传用的包

```
new-tab-v1.5.0-edge.zip      # 仓库根目录，内容 = dist/（MV3 构建，Edge 直接可跑）
```

zip 根目录下就是 `manifest.json`，`version` 为 `1.5.0`，与 `src/manifest.js` 一致。

---

## 2. 商店资产

| 用途 | 文件 | 尺寸 | 必填 |
| --- | --- | --- | --- |
| Store logo | `docs/store/edge/store-logo-300.png` | 300×300 | ✅ |
| 截图 1 | `docs/store/edge/screenshot-01-home-1280x800.png` | 1280×800 | ✅ |
| 小图 | 未生成 | 440×280 | 可选，留空 |

截图 1 是从你给的那张 3840×2100 首屏截图裁掉浏览器标签栏/地址栏后，居中放在模糊底上的。**建议再补 2–3 张**（首选项、小组件库、抽屉分组）：全屏截图后按 1280×800 裁即可，我可以帮你批量处理。

---

## 3. 字段（可直接粘贴）

### 名称

`NewTab` —— 从 manifest 读取，商店页里改不了。

> 建议：这个名字搜不到你（「新标签页」这个词完全没出现）。把 `src/manifest.js` 的 `name` 改成 `NewTab · 极简新标签页` 之类（≤ 45 字符）再重新打包，商店名会跟着变，中文搜索才有入口。要改跟我说。

### 简短描述（≤ 132 字符）

```
极简新标签页：壁纸 + 搜索，分组链接抽屉，首屏小组件（天气 / 待办 / AI 余额用量），数据本地优先，可选 WebDAV 与 Gist 同步。
```

### 详细描述

```
NewTab 把浏览器默认的新标签页换成一块安静的工作台：壁纸打底、搜索框居中，常用链接和轻量小组件随手可及。

■ 首屏
· 沉浸式壁纸 + 搜索框，圆角、上下位置、是否始终居中都可调
· 首屏小组件，可拖拽摆放，支持小 / 中 / 大三档尺寸：
  - 天气（Open-Meteo 数据源，留空城市自动定位，定位失败时显示西安）
  - 待办清单
  - AI 余额与用量：DeepSeek、Kimi Code、Factory、Antix
· 壁纸支持 Bing 每日图（可切换）与自定义壁纸

■ 搜索
· 内置 Google、百度、必应、DuckDuckGo、哔哩哔哩、知乎、豆瓣等
· 也可选豆包、元宝、ChatGPT、Gemini 等 AI 引擎；对不支持 URL 参数的引擎，会自动把关键词填进它的输入框
· 支持自定义搜索引擎，搜索框内可切换引擎与翻译源（Shift + Alt + 数字）

■ 链接
· 抽屉分组管理、拖拽排序，首屏快捷方式自由摆放
· 任意网页右键「收藏到抽屉」
· 图标自动抓取、缓存、懒加载，支持批量重新获取

■ 数据
· 本地优先（IndexedDB），支持导出 / 导入
· 可选 WebDAV 与 GitHub Gist 两条同步通道

■ 隐私
· 没有开发者服务器，不做任何统计埋点，开发者拿不到你的数据
· 链接、小组件配置、API Key 只存在你自己的浏览器里
· 不配置同步与 API Key 时，扩展完全本地运行

■ 其他
· 开源：https://github.com/postdare/new-tab
· 基于 mumingfang/jvmaoTab（MIT License）二次开发
· 使用中遇到问题或想要的功能，欢迎到 GitHub Issues 反馈
```

### 分类

`Productivity / 生产力`。如果下拉里同时有 `Search Tools / 搜索工具`，按你偏好二选一即可。

### 搜索词（最多 7 个，每个 ≤ 30 字符）

```
新标签页
极简新标签页
新标签页替换
书签抽屉
小组件
待办 天气
new tab
```

⚠️ 不要用其他产品或品牌名当搜索词（Chrome、Edge 等竞品名），会违反商店政策。

### 支持与隐私

| 字段 | 填什么 |
| --- | --- |
| 支持邮箱 | 你自己的邮箱 |
| 网站 / 支持页面 | `https://github.com/postdare/new-tab` |
| 隐私政策 URL | `https://github.com/postdare/new-tab/blob/main/docs/privacy.md` |

隐私政策 URL 需要先有线上地址：把 `docs/privacy.md` 推到 `main` 分支后，上面的链接就是可访问的。

### 审核备注 / Notes for certification

```
这是一个开源的新标签页扩展（https://github.com/postdare/new-tab），没有任何后端服务，不收集用户数据。

测试方式：
1. 安装后打开任意新标签页，即为扩展的主界面。
2. 首屏右下 / 左下角有设置入口，可打开「首选项」，里面有系统 / 壁纸 / 搜索 / 抽屉 / 数据 / 同步六个分页。
3. 「首选项 → 数据」可导出、导入、清空数据。
4. 首屏小组件默认就能用「天气」与「待办清单」，不需要任何配置；AI 余额 / 用量卡片需要用户自备对应服务的 API Key（首选项 → AI），不配置则不会显示。
5. 右键菜单「收藏网址到抽屉」可添加当前页面。

权限说明：
· storage：把链接、分组、小组件配置、壁纸偏好、API Key、同步凭据保存在用户本地浏览器中。
· tabs：读取当前标签页的 URL 与标题，用于右键「收藏到抽屉」。
· contextMenus：提供右键收藏菜单。
· favicon：显示链接对应的站点图标。
· 站点访问权限（<all_urls>）：内容脚本只做两件事——① 在豆包、Gemini 等不支持 URL 参数的 AI 搜索页面上，把关键词填进它的输入框；② 读取当前页面的 <link rel="icon"> 以获得更高质量的图标。不读取、不保存、不上传任何页面内容。

其他：
· 不使用远程代码，所有 JS / CSS 均打包在扩展内（manifest CSP 为 script-src 'self'）。
· 所有第三方请求（搜索引擎、Open-Meteo 天气、Bing 壁纸、AI 用量接口、用户自己配置的 WebDAV / Gist）均由其浏览器直接发出，不经过开发者。
```

---

## 4. 提交步骤（Partner Center）

1. 注册 Edge 程序（免费）
2. **Create new extension** → 上传 `new-tab-v1.5.0-edge.zip`，系统会自动扫描 manifest，没有红色报错就继续
3. **Availability**：市场全选；Visibility 选 **Public**
4. **Properties**：分类、支持信息、网站
5. **Privacy**：逐条勾选权限用途（第 5 节的文案）、远程代码选 **No**、数据收集认证为**不收集**、填隐私政策 URL
6. **Store listings**：至少一种语言填全（名称、简短描述、详细描述、搜索词、logo、截图），状态从 Incomplete 变成可提交
7. **Certification notes**：粘贴第 3 节的审核备注
8. **Submit** → 审核通常几天；通过后 Edge 会自动更新用户版本，不用再手动发包

---

## 5. 权限逐条说明（Privacy 步骤要用）

| 权限 | 用途 |
| --- | --- |
| `storage` | 保存链接、分组、小组件配置、壁纸偏好、API Key、同步凭据于本地 |
| `tabs` | 读取当前标签页 URL 与标题，用于「收藏到抽屉」 |
| `contextMenus` | 右键「收藏网址到抽屉」 |
| `favicon` | 显示站点图标 |
| `<all_urls>` | 内容脚本：把关键词填进 AI 搜索页的输入框；读取当前页 favicon 链接。不读取 / 保存 / 上传页面内容 |

---

## 6. 审核可能卡住的点（提前处理）

- **`host_permissions: ["*://*/*"]` 是最大风险点**：安装时会提示「读取你在所有网站上的数据」，审核也会追问。审核备注里主动解释（第 3 节已写好）；后续如果想彻底降下来，得把内容脚本改成 `optional_host_permissions` + `chrome.scripting.registerContentScripts`，属于要测的改动，别在上架前动。
- **不要把描述写成竞品比较**（如「替代 Chrome 新标签页」）。
- **`dist/manifest.json` 里那段 `sandbox` CSP 带 `unsafe-eval`** 是历史遗留，当前没有任何 sandbox 页面用它。留着可能引起误判，删掉更干净——要删跟我说，一行的事。
- **描述里引用的外部链接**（GitHub）要保证可访问。

---

## 7. 上架之后

- [ ] 补 2–3 张截图（首选项 / 小组件库 / 抽屉），我可以按 1280×800 批处理
- [ ] 考虑改 manifest `name` 加入「新标签页」关键词
- [ ] 把 Edge 版 zip 也挂到 GitHub Release（现在 workflow 只出 Chrome 包）
- [ ] 拿这同一套文案发 Chrome Web Store（那边多一步 5 美元注册费）
