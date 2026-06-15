# 发布流水线 Troubleshooting

spec-wechat-publish 在真实发布中踩过的坑与修复方案。SKILL.md 主流程跑顺时用不到本文件；遇到推送/封面/标题/图片异常时，按 SKILL.md Step 7 的「症状 → 查哪条」索引表定位到对应问题号，再来这里看完整修复。

> 多数问题的根因在第三方 skill `baoyu-post-to-wechat`，本仓库已对其应用过修复（见问题 1/3/6/8/9/10）。如果换了一台没应用这些修复的机器，症状会重现，按对应条目重新打补丁或升级上游。

---

## 问题 1：正文内容被填到了标题字段

**症状：** 推送后微信编辑器里标题字段长达几千字符（应是文章标题），正文区为空。

**根因：** 微信公众号编辑器有**两个 `.ProseMirror` 元素**：
- `index 0` = 标题编辑器（父元素 `.title-editor__input`）
- `index 1` = 正文编辑器（父元素 `.rich_media_content`）

老版 `wechat-article.ts` 用 `document.querySelector('.ProseMirror')` 默认选中第一个 = 标题编辑器，所有内容粘到了标题。

**修复：** 本仓库的 `~/.claude/skills/baoyu-post-to-wechat/scripts/wechat-article.ts` 已修复，关键是把所有 `.ProseMirror` 选择器改为：

```javascript
const editor = Array.from(document.querySelectorAll('.ProseMirror'))
  .find(el => !el.closest('.title-editor__input'));
```

并给正文编辑器临时加 `id="wechat_body_editor_pm"` 给后续 `clickElement` 用。

**如果你的 baoyu-post-to-wechat 没修复：** 检查 `~/.claude/skills/baoyu-post-to-wechat/scripts/wechat-article.ts` 是否包含 `wechat_body_editor_pm` ID 标记和 `el.closest('.title-editor__input')` 过滤；如果没有，需要应用上述补丁，或建议作者升级。

---

## 问题 2：正文配图被截断 / 拉伸成正方形

**症状：** PNG 图片是 2000×2000 正方形，但 SVG viewBox 是其他比例（如 1200×620）。

**根因：** SVG → PNG 转换器（如 sharp 默认配置）强制方形输出。

**修复：** 用 skill 自带 `scripts/svg-to-png.mjs`（推荐）或 `scripts/svg-to-png.ts` 重转，详见 Step 4.5。

---

## 问题 3：osascript Cmd+V 把内容粘到标题（旧版本）

**症状：** baoyu-post-to-wechat 用 osascript 模拟系统级 Cmd+V，但 macOS 系统焦点不在编辑器上，paste 进了标题输入框。

**修复：** 本仓库的 `wechat-article.ts` 已改用 ClipboardEvent + DataTransfer 直接派发到 ProseMirror，绕开 macOS 系统剪贴板/焦点。

---

## 问题 4：API key 未配置导致图片生成失败

**症状：** `baoyu-image-gen` 报 "No API key found. Set GOOGLE_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY."

**修复：** 编辑 `~/.baoyu-skills/.env`，取消注释并填入真实 key：

```
GOOGLE_API_KEY=your_key_from_https://aistudio.google.com/apikey
```

或用 OpenAI key。

**绕过方案：** 如果暂时拿不到 key，跳过图片生成步骤，使用已有的 PNG/SVG 图片走后续流程。

---

## 问题 5："Home page menu did not load"

**症状：** `wechat-article.ts` 启动时报这个错。

**根因：** Chrome 里残留着一个未关闭的微信编辑器 tab（`appmsg_edit` URL），脚本试图从首页跳转失败。

**修复：** Step 7 的 Chrome 状态预检查脚本会自动关掉这些 tab。手动也可以在 Chrome 里直接关掉编辑器 tab，回到 `mp.weixin.qq.com/cgi-bin/home`。

---

## 问题 6：标题隐藏字段有值但 UI 不显示

**症状：** CDP 检查 `textarea#title` 有标题，但微信编辑器可见标题为空；左侧文章列表或草稿卡片看起来像”标题没有”。

**根因：** 微信新编辑器同时维护隐藏 `textarea#title` 和可见 `.title-editor__input .ProseMirror`。只写隐藏字段不足以刷新可见 UI。

**本仓库已修复：** `wechat-article.ts` 的标题写入逻辑已同时写入两个字段（见问题 9）。如果仍然出现此症状，说明 `wechat-article.ts` 的修复未生效，参考问题 9 的修复方案。

**手动修复（应急）：**

```javascript
const title = '文章标题';
const hidden = document.querySelector('#title');
if (hidden) {
  hidden.value = title;
  hidden.dispatchEvent(new Event('input', { bubbles: true }));
  hidden.dispatchEvent(new Event('change', { bubbles: true }));
}
const editor = document.querySelector('.title-editor__input .ProseMirror');
if (editor) {
  editor.focus();
  document.execCommand('selectAll', false);
  document.execCommand('delete', false);
  document.execCommand('insertText', false, title);
  editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: title }));
  editor.blur();
}
```

修复后重新验证：`title` 与 `visible_title` 必须一致。

---

## 问题 7：文章卡片没有封面

**症状：** 封面区域显示“拖拽或选择封面”，或 CDP 检查 `.js_appmsg_thumb_new` 的 `background-image` 是 `url("")`；保存时可能出现“必须插入一张图片”。

**根因：** `wechat-article.ts` 只负责正文图片，不直接设置微信的封面/文章卡片。直接给封面区隐藏 file input 设文件有时会卡在 loading，必须走微信图片库选择和封面裁剪确认链路。

**注意：** 不要对页面里的所有 `input[type=file]` 批量 `setFileInputFiles`。微信页面同时有正文图片上传和图片库上传 input，误设正文 input 会把封面图插进正文开头。

**修复：** 优先运行自动封面脚本：

```bash
npx -y bun skills/spec-wechat-publish/scripts/upload-wechat-cover.ts \
  --cover 文章系列/pic/{slug}-cover.png \
  --force
```

脚本会点击封面区「从图片库选择」，在图片库上传 `文章系列/pic/{slug}-cover.png`，选中新上传图片，点击「下一步」/「完成」，保存草稿，并验证 `.js_cover_preview_new` 和 `.js_appmsg_thumb_new` 都已有非空 `background-image`。

如果自动上传脚本已把图片上传到图片库但卡在封面 loading，不要重复推送正文；直接从图片库选中刚上传的封面图并完成裁剪确认。

---

## 问题 8：正文列表出现双层点

**症状：** 微信正文列表显示为 `• • 文件发现`、`• • 路径解析`。

**根因：** Markdown 渲染器在 `<li>` 内容里手写了 `• `，微信编辑器又对真实列表显示自己的项目符号，最终出现双层点。

**修复：** 检查 `~/.claude/skills/baoyu-post-to-wechat/scripts/md/render.ts` 和 `~/.agents/skills/baoyu-post-to-wechat/scripts/md/render.ts`：

```typescript
return styledContent("listitem", content, "li");
```

不要写成：

```typescript
return styledContent("listitem", `• ${content}`, "li");
```

修复后重新执行 `md-to-wechat.ts --theme tech-blog`，检查 HTML 中 `<li>` 的文本不以 `•` 开头，再重新推送。

---

## 问题 9：标题不写入可见 UI（wechat-article.ts 根因）

**症状：** 推送后微信编辑器标题区显示"请在这里输入标题"，`visible_title` 为空，但 `title_length` 可能有值（隐藏字段写入了）。

**根因：** 原版 `wechat-article.ts` 只写了隐藏的 `textarea#title`，没有同步写可见的 `.title-editor__input .ProseMirror`。微信新编辑器需要两个字段都写入才能在 UI 上显示标题。

**本仓库已修复：** `~/.claude/skills/baoyu-post-to-wechat/scripts/wechat-article.ts` 的标题写入逻辑已更新为同时写入两个字段：

```typescript
// 写隐藏 input
await evaluate(session, `document.querySelector('#title').value = ${JSON.stringify(effectiveTitle)};
  document.querySelector('#title').dispatchEvent(new Event('input', { bubbles: true }));`);
// 同步写可见 ProseMirror
await evaluate(session, `(function(){
  const ed = document.querySelector('.title-editor__input .ProseMirror');
  if (!ed) return;
  ed.focus();
  document.execCommand('selectAll', false);
  document.execCommand('delete', false);
  document.execCommand('insertText', false, ${JSON.stringify(effectiveTitle)});
  ed.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:${JSON.stringify(effectiveTitle)}}));
  ed.blur();
})()`);
```

**验证：** 推送后检查 `visible_title` 与 `title` 是否一致。如果不一致，说明修复未生效，检查 `wechat-article.ts` 是否包含 `title-editor__input` 和 `execCommand('insertText')`。

---

## 问题 10：blockquote 底部出现空白行

**症状：** 微信正文里每个 blockquote 底部都有一段明显空白，视觉上像多了一行。

**根因：** `md-to-wechat.ts` 的 `inlineTechBlogStyles` 函数把 `margin:0 0 24px` 注入到**所有** `<p>` 标签（包括 blockquote 内的），CSS 规则无法覆盖 inline style，导致 blockquote 内最后一个 `<p>` 的 `margin-bottom:24px` 造成底部空白。

**本仓库已修复：** `~/.claude/skills/baoyu-post-to-wechat/scripts/md-to-wechat.ts` 的 `inlineTechBlogStyles` 函数已加后处理，把 blockquote 内 `<p>` 的 margin 覆盖为 `margin:0`：

```typescript
// blockquote 内的 <p> 不应有 margin-bottom，否则底部出现空白
result = result.replace(
  /(<blockquote[^>]*>)([\s\S]*?)(<\/blockquote>)/g,
  (_match, open, inner, close) => {
    const fixed = inner.replace(/margin:0 0 24px;/g, 'margin:0;');
    return `${open}${fixed}${close}`;
  }
);
```

**验证：** 生成 HTML 后检查 blockquote 内 `<p>` 的 style 是否为 `margin:0;`（不含 `24px`）。

---

## 问题 11：推送报 `New tab not found`

**症状：** `wechat-article.ts` 点击"文章"菜单后等待新 tab 超时，报 `Error: New tab not found: mp.weixin.qq.com`。

**根因：** Chrome 当前微信 tab 停在非首页（文章预览页 `/s/...`、图片库页 `appmsgalbummgr`、发布列表页 `appmsgpublish` 等）。`wechat-article.ts` 点击"文章"菜单后，微信可能在同一 tab 内跳转而不是打开新 tab，导致 `waitForNewTab` 等不到新 tab。

**修复：** 在推送前运行 Step 7 的 Chrome 状态预检查脚本，它会自动把微信 tab 导航到首页并等待菜单加载。

**手动修复：** 在 Chrome 里手动导航到 `https://mp.weixin.qq.com/cgi-bin/home`，等待首页菜单出现后再推送。

---

## 问题 12：baoyu skills symlink 断链

**症状：** Prerequisites 检查报 `✗ baoyu-post-to-wechat 未安装`，但 `~/.claude/skills/baoyu-post-to-wechat` 目录存在（实际是断链 symlink）。

**根因：** `~/.claude/skills/baoyu-*` 是指向 `~/.agents/skills/baoyu-*` 的 symlink。如果 `~/.agents/skills/` 下的目录被移走（如清理操作把它们移到 `skills-disabled-*` 目录），symlink 就会断链，`test -d` 返回 false。

**诊断：**

```bash
ls -la ~/.claude/skills/baoyu-post-to-wechat  # 查看是否是断链 symlink
ls ~/.agents/skills-disabled-*/baoyu-post-to-wechat 2>/dev/null  # 查找被移走的目录
```

**修复：**

```bash
# 把 disabled 目录里的 baoyu skills 移回 ~/.agents/skills/
for skill in baoyu-post-to-wechat baoyu-cover-image baoyu-image-gen baoyu-article-illustrator; do
  src="$HOME/.agents/skills-disabled-*/$skill"
  dst="$HOME/.agents/skills/$skill"
  [ -d $src ] && [ ! -e "$dst" ] && mv $src "$dst" && echo "✓ moved $skill"
done
```
