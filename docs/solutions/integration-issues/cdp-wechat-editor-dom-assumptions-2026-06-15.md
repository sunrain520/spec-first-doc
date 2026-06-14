---
title: CDP 自动化新版微信公众号编辑器的三类 DOM/交互假设过时坑
date: 2026-06-15
category: docs/solutions/integration-issues
module: spec-wechat-publish
problem_type: integration_issue
component: development_workflow
symptoms:
  - "正文用 document.querySelector('.ProseMirror') 取到第一个实例(标题框),整篇正文灌进标题字段、图片占位符找不到、正文验证假阳性(日志报 Body verified OK 但正文实际为空)"
  - "标题只写隐藏 #title.value,新版数据流是可见 ProseMirror→隐藏 #title 单向,反向赋值无效,编辑器标题显示空"
  - "摘要 #js_description 是受控组件,直接 el.value=x 被前端框架虚拟状态忽略,保存时为空,微信用正文开头自动填充污染摘要"
  - "封面裁剪弹窗的下一步/确认按钮对 JS element.click() 无响应,封面上传长期超时(选图、按钮文案都对,只是点击方式无效)"
root_cause: wrong_api
resolution_type: code_fix
severity: high
domain: wechat-mp-article-publishing
pattern: "CDP 自动化成熟前端框架应用:按真实 DOM 收窄选择器 + native setter 写受控组件 + 真实输入事件替代合成 click"
rejected_alternatives:
  - "裸 document.querySelector('.ProseMirror') —— 新版编辑器有标题/正文两个实例,永远命中第一个"
  - "el.value = x 直接赋值受控组件 —— 被前端框架虚拟状态拦截,保存时丢失"
  - "element.click() 触发微信弹窗按钮 —— 弹窗按钮只认真实鼠标事件,合成 click 静默失效"
  - "手改 baoyu 上游源码 —— 会在 baoyu 升级时冲突;改用项目内幂等补丁脚本"
applicable_versions:
  - "微信公众号图文编辑器 新版(双 ProseMirror 实例 + 受控摘要框),2026-06 观测"
  - "baoyu-post-to-wechat v1.24.0"
invalidation_condition: "微信公众号编辑器再次改版:ProseMirror 实例结构变化、标题/摘要数据流改回直接赋值、或弹窗按钮开始响应合成 click 时,本修法的选择器与事件假设全部失效,需按新版真实 DOM 用 CDP 重新探测研判"
source_refs:
  - "文章系列/.skills/spec-wechat-publish/scripts/patch-wechat-editor-selectors.mjs"
  - "文章系列/.skills/spec-wechat-publish/scripts/upload-wechat-cover.ts"
tags:
  - cdp-automation
  - wechat-editor
  - prosemirror
  - controlled-component
  - native-setter
  - dispatchmouseevent
  - baoyu-post-to-wechat
---

# CDP 自动化新版微信公众号编辑器的三类 DOM/交互假设过时坑

## Problem

用 baoyu-post-to-wechat skill 经 Chrome DevTools Protocol（CDP）自动化新版微信公众号图文编辑器推送文章时，三处对 DOM 结构与交互模型的过时假设导致连锁故障：正文灌进标题、标题显示空、摘要被污染、封面上传长期超时。根因都是"对一个用前端框架构建的成熟第三方 web 应用，沿用了过于天真的自动化 API"。

## Symptoms

- 整篇正文（约 1.5 万字）灌进了标题字段；图片占位符在标题里找不到无法替换；正文验证误报通过（`Body content verified OK`，但正文区其实为空）。
- 标题栏显示为空，即使脚本日志显示"标题已填"。
- 摘要框内容变成正文开头一段（如"先选地图…导读第一季…"），而非 frontmatter 里的 description，且常被截断成半句。
- 封面上传脚本在"等封面预览非空"步骤超时；反复重试无效，但封面区选择器、按钮文案探测都正常。

## What Didn't Work

- **正文**：直接重推、调整聚焦时序——无效，因为 `querySelector('.ProseMirror')` 始终命中标题框，问题不在时序。
- **摘要**：CDP 写入 `#js_description.value` 并派发 `input` 事件——填充时验证通过（`Summary verified OK`），但保存草稿后又被微信用正文开头覆盖。误以为是"填得太晚"，实为受控组件没认账。
- **封面**：把裁剪确认按钮文案从「完成」改为兼容「确认/完成/下一步」——仍超时；因为真因不是文案匹配，是 `element.click()` 对微信弹窗按钮根本不触发。
- **整体**：一度想直接手改 baoyu 上游 `wechat-article.ts`——放弃，因为上游升级会冲突，改走项目内幂等补丁脚本。

## Solution

三类坑分别用项目内幂等补丁修复（`patch-wechat-editor-selectors.mjs` 改 baoyu 的 `wechat-article.ts`，`upload-wechat-cover.ts` 是 skill 自有脚本）。

### 坑 1：双 ProseMirror 实例 → 正文选择器必须收窄

CDP 实测确认新版编辑器有两个 `.ProseMirror`：

- `pm[0]` = `.title-editor__input .ProseMirror`（标题）
- `pm[1]` = `.rich_media_content .ProseMirror`（正文）

`document.querySelector('.ProseMirror')` 永远取 `pm[0]`。修法：所有正文操作的选择器收窄为 `.rich_media_content .ProseMirror`（点击聚焦、占位符替换、正文非空验证共 5 处）。

### 坑 2：标题填可见框 + 摘要用 native value setter

**标题**：新版数据流是"可见 ProseMirror 标题框 → 同步隐藏 `#title`"，单向。baoyu 只写隐藏 `#title.value` 反向无效。修法填可见框：

```js
const pm = document.querySelector('.title-editor__input .ProseMirror');
pm.innerHTML = '<p>' + title.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</p>';
pm.dispatchEvent(new Event('input', { bubbles: true }));   // 微信据此同步隐藏 #title
```

**摘要**：`#js_description` 是受控组件（React/Vue 类框架管理），直接 `el.value=x` 被框架虚拟状态忽略，保存时用框架里的空值，微信遂用正文开头自动填充。修法用 native value setter 绕过受控拦截 + 完整事件链：

```js
const el = document.querySelector('#js_description');
const proto = el.tagName === 'TEXTAREA'
  ? HTMLTextAreaElement.prototype
  : HTMLInputElement.prototype;
const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
setter.call(el, summary);                                  // 关键:绕过受控组件的 value 拦截
el.dispatchEvent(new Event('input',  { bubbles: true }));
el.dispatchEvent(new Event('change', { bubbles: true }));
el.dispatchEvent(new Event('blur',   { bubbles: true }));  // blur 让框架坐实该值,保存不被覆盖
```

### 坑 3：微信弹窗按钮需真实鼠标事件，不是 `element.click()`

封面裁剪流程里，微信弹窗按钮（下一步/确认）对 JS `element.click()` 静默无响应。必须用 CDP 取按钮中心坐标后派发真实鼠标事件：

```js
// 用 JS 只取坐标,不点击
const r = btn.getBoundingClientRect();
const x = r.x + r.width / 2, y = r.y + r.height / 2;
// 用 CDP 派发真实鼠标事件
await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed',  x, y, button: 'left', clickCount: 1 }, { sessionId });
await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }, { sessionId });
```

附带：图片上传后微信会**自动选中**目标图，脚本不能再 `click()` 那个图项（会 toggle 取消选中，导致"下一步"无可选图而卡住）；应先判断选中态、仅未选中时才点。

## Why This Works

三类坑是同一个根因的三个面：**对一个用前端框架构建的成熟第三方 web 应用做自动化时，不能假设 DOM 唯一、不能用裸 `value`/`click`**。

- 选择器收窄：解决"同名元素多实例"——真实 DOM 有两个 ProseMirror，必须用祖先容器类名（`.rich_media_content` / `.title-editor__input`）区分。
- native setter：受控组件的 `value` 属性被框架用 setter 劫持，原生 `value=` 不触发框架状态更新；调用 `HTMLInputElement.prototype` 上未被劫持的原始 setter 才能让框架"看见"赋值。
- 真实鼠标事件：框架/控件常监听完整指针事件序列（pointerdown/mousedown→mouseup），合成的 `element.click()` 只派发单个 click，被忽略；CDP `Input.dispatchMouseEvent` 注入的是浏览器层真实事件。

## Prevention

- **自动化前先 CDP 探测真实 DOM**：用 `Runtime.evaluate` 打印 `document.querySelectorAll('<selector>').length` 和每个匹配的祖先链，确认选择器唯一性，再写自动化脚本。永远不要假设 `querySelector` 命中的是你想要的那个。
- **写表单值默认用 native setter + 完整事件链**：面对任何可能是受控组件的输入框（现代 web 应用几乎都是），用 `Object.getOwnPropertyDescriptor(proto,'value').set.call(el, v)` 而非 `el.value=v`，并派发 `input`/`change`/`blur`。
- **点击 UI 控件默认用真实鼠标事件**：CDP 自动化里点击按钮/弹窗，用 `Input.dispatchMouseEvent`（取 `getBoundingClientRect` 中心坐标）而非 `element.click()`，尤其是第三方应用的对话框按钮。
- **验证逻辑要查"正确的元素"**：本案中 baoyu 的"正文非空验证"查的是标题框（恒非空）形成假阳性。自动化的成功判定必须 assert 目标元素的真实状态，不能用宽松选择器。
- **改第三方上游用幂等补丁，不手改源**：对 baoyu 这类会升级的上游 skill，把修复写成项目内幂等补丁脚本（精确字符串锚点 + 已打过则跳过），避免升级冲突；升级后补丁失败能明确报"锚点缺失"提示重新适配。
- **每次推送后用 CDP 独立核验真实状态**：不信任脚本自报的 OK，单独读 `pm[0]`/`pm[1]`/`#js_description`/封面 backgroundImage 的真实值做终态校验。

## Related Issues

- 修复载体：`文章系列/.skills/spec-wechat-publish/scripts/patch-wechat-editor-selectors.mjs`（坑 1+2）、`文章系列/.skills/spec-wechat-publish/scripts/upload-wechat-cover.ts`（坑 3）
- skill 文档：`文章系列/.skills/spec-wechat-publish/SKILL.md` Prerequisites #4.5 调用该补丁；Step 7 推送链路
- 同源样式修复（不同主题）：`install-tech-blog-theme.mjs` 的 inline 样式后处理（代码块/引用块/横向滚动）
