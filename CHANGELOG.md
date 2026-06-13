# Changelog

- 记录格式：`- v版本号 YYYY-MM-DD HH:MM:SS 作者: 变更摘要 [(user-visible)]`
- 说明：
  - `v版本号` 使用本次变更对应的发布版本
  - 日期时间必须使用 `YYYY-MM-DD HH:MM:SS`
  - `作者` 填写提交人或变更责任人
  - `变更摘要` 使用中文，简明说明本次改动
  - 用户可感知的变更在末尾追加 `(user-visible)`

- v1.10.0 2026-06-13 22:44:45 leokuang: docs(归档): 整理 `文章系列/` 目录结构——按内容类型归档为 `运营规划/`(003/004/005)、`第一季-harness认知/`(01-06 正文+outline)、`第二季-skill深度剖析/`(s2-00~s2-11)、`分享讲稿/`(tech-center) 四个子目录，`pic/` 与 `.skills/` 保持顶层共享；用 `git mv` 保留仓内历史（37 rename）；同步把 16 个子目录正文的 84 处 `](pic/` 图片引用改写为 `](../pic/`（0 断链）、修正文档交叉引用与 `.skills/spec-wechat-publish` 内 54 处旧仓 `docs/11-文章系列/` 路径为本仓 `文章系列/`、选题扫描改为递归 `**/*.md` 以适配按季归档；新增 `文章系列/README.md` 导航 (user-visible)
- v1.10.0 2026-06-13 22:25:04 leokuang: docs(迁移): 从 `spec-first` 主仓迁入 `文章系列/` 微信文章运营目录（含 `.skills/spec-wechat-publish` 发布技能、`pic/` 配图与 SVG/PNG 资产、s1/s2 系列正文与 outline 共 262 个文件），作为本仓后续微信文章运营的工作目录 (user-visible)
- v1.10.0 2026-06-09 19:40:54 leokuang: 使用 spec-first 初始化项目
