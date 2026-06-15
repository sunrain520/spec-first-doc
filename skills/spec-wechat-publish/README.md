# spec-wechat-publish 使用说明

`spec-wechat-publish` 是 `文章系列/` 的项目本地微信公众号发布流水线 skill，不属于 `spec-first init` 会分发的 bundled skill。

它用于把一篇文章从选题推进到微信编辑器草稿，串联：

```text
选题 -> 写作检测 -> 封面图 -> 正文配图 -> SVG 转 PNG -> 图片完整性 -> frontmatter 检查 -> 排版预览 -> 技术博文版式 gate -> 润色 -> 推送并上传封面
```

## 直接使用

在当前仓库中（工作目录为仓库根 `spec-first-doc/`），把下面这段作为任务发给 agent：

```text
使用 skills/spec-wechat-publish/SKILL.md，发布 文章系列/第一季-harness认知/02-ai-coding-harness.md
```

文章路径写到具体 `.md`（已归档为按季子目录，注意带上 `第一季-harness认知/` 等子目录段）。如果还没有确定文章文件，可以说：

```text
使用 skills/spec-wechat-publish/SKILL.md，进入选题步骤
```

进入选题时，agent 会递归列出 `文章系列/` 下的候选文章（自动排除 skill 自身、运营规划、`pic/` 配图文档、README 与台账），并按 `已发布台账.md` 标注已发布状态，再用 `AskUserQuestion` 让你选。

执行时，agent 应先读取 `SKILL.md`，再按其中的 Prerequisites、Progress Checklist 和 Step 1 → Step 7（含子步 2.5/4.5/4.6/4.7/5.5/6.5）继续。关键决策点（选题、封面、是否润色、发布前确认）会用 `AskUserQuestion` 问你；**skill 只推到微信编辑器草稿，不会自动点「发表」**。

## 执行位置

本 skill 是 `文章系列/` 的仓库内运营资产，所有命令路径都相对仓库根目录。**始终从仓库根（`spec-first-doc/`）执行**，用上面「直接使用」的自然语言任务触发即可。不要复制到 runtime skill 目录使用（原因见末尾「边界」）。

## 依赖

必需：

- `baoyu-post-to-wechat`
- 本机 Chrome（SVG 转 PNG 与微信编辑器自动化都需要）
- `~/.spec-first/.developer` 中有 `name=`（Step 7 推送时作者名从这里读，缺失会中止并提示先跑 `spec-first init`）

默认图片流程不需要外部图片 API：agent 直接生成 SVG，使用 `scripts/svg-to-png.mjs` 转 PNG。

只有选择 AI raster image 生成时才需要：

- `baoyu-cover-image`
- `baoyu-article-illustrator`
- `baoyu-image-gen`
- `~/.baoyu-skills/.env` 中配置 `GOOGLE_API_KEY` 或 `OPENAI_API_KEY`

SVG 转 PNG 默认使用本 skill 自带的 `scripts/svg-to-png.mjs`，通过 Chrome headless 渲染，不依赖 Bun 或 npm 下载。微信草稿推送和封面上传依赖 Chrome CDP。`baoyu-post-to-wechat` 会处理 Chrome 启动与登录交互；本 skill 的 `scripts/upload-wechat-cover.ts` 会在正文推送后走微信图片库链路自动上传并选择封面图。如果遇到登录、焦点、可见标题为空、文章卡片无封面或编辑器写入问题，按 `SKILL.md` Troubleshooting 索引表的「症状 → 问题号」定位，再查 `references/troubleshooting.md`（12 条真实事故根因与修复）。

排版默认使用 `baoyu-post-to-wechat` 的 `tech-blog` 主题。发布前必须通过 `SKILL.md` 的专业技术博文版式 gate：**正文 ≥1.5 万字（去空白字符数）、正文配图 6-10 张（不含封面）**、无正文 H1、不直接引用 SVG、H2/H3 层级有清晰编号、发布 HTML 含 H2/H3 inline style、列表不手写 `•`、图片上下有过渡文案。字数与配图是硬门槛，不达标 gate 会 FAIL。

如果本机 `baoyu-post-to-wechat` 还没有 `tech-blog` 主题，运行：

```bash
node skills/spec-wechat-publish/scripts/install-tech-blog-theme.mjs \
  --skill-dir "$HOME/.claude/skills/baoyu-post-to-wechat"
```

Codex 用户级 runtime 也可以安装到：

```bash
node skills/spec-wechat-publish/scripts/install-tech-blog-theme.mjs \
  --skill-dir "$HOME/.agents/skills/baoyu-post-to-wechat"
```

## 边界

- 它是 `文章系列/` 的运营资产，收纳在 `skills/spec-wechat-publish/`（与其他 skill 统一管理）。脚本按 `skills/spec-wechat-publish/...`、正文与配图按 `文章系列/...` 的仓库根相对路径引用，**执行前确保当前工作目录是仓库根**。
- 不要纳入 spec-first 的 skill 治理清单，也不要期待 `spec-first init` 分发它——它不是 spec-first 核心 workflow/runtime delivery 资产。
- 不要 `cp -R` 到 `~/.claude/skills/` 或 `~/.agents/skills/` 当通用 skill：SKILL.md 里的相对路径在 runtime 目录下会全部失效。

它是文章运营资产，只在本仓库内、从仓库根目录执行。
