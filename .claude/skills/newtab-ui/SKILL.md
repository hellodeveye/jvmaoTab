---
name: newtab-ui
description: new-tab 扩展的界面约定——中性色同源、控件描边式、antd v5 主题覆盖的坑。改本项目的按钮、弹窗、勾选框、表单控件、主题 token、CSS 变量或任何可见样式时使用,review UI 改动时也用。
---

# new-tab 界面约定

改动碰到的每个控件,都对着下面每一条过一遍再动手。

## 单一来源

配色值只住在两个地方,组件里取 token 或 CSS 变量:

- `src/newtab/theme.js` —— `APP_COLORS` 是浅色/深色两套中性色的唯一出处,`getAppTheme` 把它们喂给 antd token。
- `src/newtab/view/Tower.jsx` —— 把值挂成 `--workspace*`、`--primaryInk`、`--btnPrimaryBorder` 等 CSS 变量,供 styled-components 和 `app.scss` 消费。

## 同源

中性色只用一套灰系,墨色(文字、描边、按钮、叠加层)和它所在的底色**同源**:

- 浅色:底色是暖灰,墨色也走暖灰(stone)。
- 深色:底色是纯中性灰,墨色也走中性灰(neutral)。

这是这套配色最容易犯的错。zinc 带蓝调、stone 带黄调,小面积文字看不出,一到主按钮那种整块实底,色偏就被放大成"发冷"。加新颜色时先认它属于当前模式的哪一族,要新色阶就在同族里取。

## 描边式

主按钮和勾选态**不填实底**:透明底 + 更重的描边 + 更深的文字来分主次;次级控件用更浅的描边和更淡的文字。全项目没有强调色、没有实心色块,这是刻意的,新控件跟着这套走。

破坏性操作用描边式 danger(红字红描边):`okType: "default"` + `okButtonProps: { danger: true }`。

## antd v5 的坑

这三个都踩过,改控件样式前先看:

1. **`okType` 只接受 `primary` / `default` / `dashed` / `link` / `text`。** 传 `"danger"` 时 `ButtonTypeMap` 查不到,`color-*` 和 `variant-*` 两个类都不会加,按钮只剩 `.ant-btn` 基础样式,和"取消"看不出区别。danger 走 `okButtonProps`。
2. **`colorPrimary` 一个 token 管两件事。** 主按钮的背景、勾选态的背景与描边都来自它,靠 token 拆不开。要透明底就在 `components.Button` / `components.Checkbox` 里做**组件级覆盖**——只在该组件内生效,全局 `colorPrimary` 保持原值,焦点环等不受影响;剩下压不掉的部分补 `app.scss` 规则,颜色仍从 `theme.js` 出、经 Tower 挂成 CSS 变量。
3. **solid 变体不设 `border-color`,也没有对应 token。** 描边只能由 CSS 规则给。

`app.scss` 里覆盖 antd 的规则一律加 `body` 前缀:antd 的样式是运行时注入的,注入顺序不保证,靠多一级选择器压过去比赌先后可靠。

## 验证

改完量 computed style —— 色偏和"规则有没有压过 antd"这两件事,截图上都看不准:

```js
getComputedStyle(document.querySelector('.ant-checkbox-checked .ant-checkbox-inner')).backgroundColor
// 描边式勾选态应为 rgba(0, 0, 0, 0)
```

浅色和深色两套都要量,`--primaryInk` 可以确认当前在哪套。
