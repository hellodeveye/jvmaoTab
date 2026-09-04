---
name: css-layout-traps
description: CSS 裁剪窗、滚动容器与包含块的陷阱。症状:元素莫名不显示或被裁掉、页面自己滚动或跳位、transform 之后量到的坐标对不上。做轮播滑轨、用 transform 把面板移出屏幕、用 overflow 裁剪时也先看这里。
---

# CSS 裁剪、滚动与包含块的陷阱

共同点:**决定元素怎么显示的那个盒子,和 DOM 树上的父子关系不是一回事**。症状对上就先量那个盒子,再改代码。

## overflow 和 transform 同在一个元素上 → 溢出内容被永久裁掉

`overflow` 剪的是元素**自己的 padding box**,而 `transform` 会连同这个盒子和里面的内容一起搬走,裁剪窗和内容的相对关系恒定不变。所以两者放在同一个元素上时,超出那一格的内容**无论 translate 多少都在窗外**。

轮播、滑轨、分屏要两层:外层不动、只负责 `overflow: hidden`;内层带 `transform`,在窗里滑。

## overflow: hidden 仍是滚动容器 → 焦点会把它滚起来

`hidden` 只是不给滚动条,容器**仍可被程序滚动**;浏览器把焦点元素滚进视野时照滚不误。

配上"用 transform 把面板移出屏幕"就出事:transform 撑出的区域会计入可滚动溢出,面板的 DOM 还在、还能拿焦点,焦点一落进去(弹窗关闭后交还焦点、Tab、方向键的默认滚动都会),面板就被滚回画面里 —— 而组件状态还以为它是隐藏的,依赖那个状态的浮层、遮罩、快捷键于是全部错位。

要"只裁剪、永不滚动"用 `overflow: clip`,它不建立滚动容器。

```js
el.scrollHeight > el.clientHeight   // true = 它能被滚,不管有没有滚动条
```

## 绝对定位找不到定位祖先 → 落到初始包含块

`position: absolute` 找不到定位祖先时,包含块是**初始包含块**。它于是钉在视口上:外面那个容器内部滚动时它不跟着走,看起来像"浮在内容上不动"。

给预期的那个祖先补 `position: relative`,把包含块钉明确。

反过来也要留意:`transform`、`filter`、`will-change` 会让一个元素成为后代 **fixed** 定位的包含块 —— 祖先加了 transform 之后,`position: fixed` 的子元素不再相对视口。

## 量坐标:rect 含 transform,offset 不含

- `getBoundingClientRect()` —— 视口坐标,**含自身与所有祖先的 transform**。祖先在做位移动画或轨道平移时,量到的值带着那份偏移。
- `offsetLeft` / `offsetTop` —— 相对 `offsetParent` 的**布局**坐标,不含任何 transform。

要的是"我在自己这层布局里的位置"(例如按坐标反向偏移一张背景图做对齐),用 offset:它不受祖先动画和自身拖拽位移影响,于是也不需要"等动画结束再重测"那套补丁 —— 那种补丁本身就是选错了测量方式的信号。
