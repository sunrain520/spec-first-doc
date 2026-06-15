# skills/

本仓库的项目本地 skill 收纳目录，统一管理。这些 skill **不是** spec-first 公开 workflow 入口，也不通过 `using-spec-first` 路由推荐；按各自 SKILL.md 的触发词显式调用。

> 说明：仓库根 `skills/` 并非 Claude Code 的 skill 自动发现路径（自动发现为 `.claude/skills/`），此处仅作统一存放与版本管理。

## 清单

| skill | 作用 | 触发词 |
|---|---|---|
| [`git-push/`](git-push/SKILL.md) | 自动化 git 提交并推送到**所有**远程仓库（支持 GitHub + Gitee 多远程） | "提交并推送"、"git push"、"推送到所有仓库" |
| [`git-npm/`](git-npm/SKILL.md) | 更安全的 git + npm 发版流程：发布新版本、dry-run、release/publish | "发布 npm 版本"、"release"、"publish" |
| [`spec-wechat-publish/`](spec-wechat-publish/SKILL.md) | 微信公众号文章运营全流程流水线（选题→写作检测→封面→配图→SVG 转换→排版→润色→推送） | "发布公众号文章"、"发文"、"走发布流程" |

## 约定

- **执行前确保当前工作目录为仓库根**（`spec-first-doc/`）。各 skill 命令里的脚本路径（如 `skills/spec-wechat-publish/scripts/…`）与内容路径（如 `文章系列/…`）均为仓库根相对路径。
- `spec-wechat-publish` 是 `文章系列/` 的内容耦合运营资产：脚本在 `skills/` 下，但操作的正文与配图在 `文章系列/`。不要 `cp -R` 到 `~/.claude/skills/` 当通用 skill 用——相对路径会失效。
- `git-push` / `git-npm` 为通用自包含 skill，脚本对当前仓库操作、无内容路径硬编码。
