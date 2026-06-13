# 文章系列

spec-first 微信公众号文章运营目录。后续所有微信文章的规划、写作、配图、发布都在这里进行。

## 目录结构

```text
文章系列/
├── README.md                 # 本导航
├── 运营规划/                  # 系列规划、内容路线图（先读这里）
├── 第一季-harness认知/        # 第一季：建立 AI Coding Harness 认知框架
├── 第二季-skill深度剖析/      # 第二季：逐个 skill 深度剖析，覆盖完整开发链路
├── 分享讲稿/                  # 技术中心等内部分享讲稿
├── pic/                       # 全系列共享配图（SVG 源 + PNG 输出）
└── .skills/                   # 微信发布流水线 skill（spec-wechat-publish）
```

约定：

- 正文与对应的 `-outline.md` 提纲同放在所在季目录。
- 配图统一放顶层 `pic/`，正文用相对路径 `../pic/xxx.png` 引用。
- 新文章按季归入对应目录；新开季时新建 `第N季-xxx/` 目录。

## 运营规划

- `运营规划/2026-05-27-003-spec-first-wechat-series-requirements.md` — 系列整体规划（分层框架、三大内容流、标题池）
- `运营规划/2026-05-27-004-spec-first-wechat-series-content-roadmap.md` — 第一季内容路线图（12 篇最小叙事包）
- `运营规划/2026-05-31-005-spec-first-wechat-series-s2-roadmap.md` — 第二季内容路线图（总分结构）

## 第一季 · Harness 认知

主线：Prompt 问题 → Workflow 问题 → Harness 问题 → Evidence / Review / Knowledge 闭环。

| 篇 | 正文 | 提纲 |
|---|---|---|
| 01 | `01-spec-first.md` | — |
| 02 | `02-ai-coding-harness.md` | — |
| 03 | `03-why-you-cannot-delegate-to-ai.md` | `03-why-you-cannot-delegate-to-ai-outline.md` |
| 04 | `04-context-harness.md` | `04-context-harness-outline.md` |
| 05 | `05-graph-decision-input.md` | `05-graph-decision-input-outline.md` |
| 06 | `06-source-of-truth.md` | `06-source-of-truth-outline.md` |

## 第二季 · skill 深度剖析

总分结构：先用一篇总览串起完整开发链路，再逐个 skill 深度剖析。

| 篇 | 主题 | 正文 | 提纲 |
|---|---|---|---|
| s2-00 | 全链路总览 | `s2-00-full-journey.md` | `s2-00-full-journey-outline.md` |
| s2-01 | runtime setup | `s2-01-runtime-setup.md` | `s2-01-runtime-setup-outline.md` |
| s2-02 | brainstorm | `s2-02-brainstorm.md` | `s2-02-brainstorm-outline.md` |
| s2-03 | spec / prd | `s2-03-spec-prd.md` | `s2-03-spec-prd-outline.md` |
| s2-04 | plan | `s2-04-plan.md` | `s2-04-plan-outline.md` |
| s2-05 | doc-review | `s2-05-doc-review.md` | `s2-05-doc-review-outline.md` |
| s2-06 | write-tasks | `s2-06-write-tasks.md` | `s2-06-write-tasks-outline.md` |
| s2-07 | work | `s2-07-work.md` | `s2-07-work-outline.md` |
| s2-08 | debug | `s2-08-debug.md` | `s2-08-debug-outline.md` |
| s2-09 | code-review | `s2-09-code-review.md` | `s2-09-code-review-outline.md` |
| s2-10 | compound | `s2-10-compound.md` | `s2-10-compound-outline.md` |
| s2-11 | optimize | 待写 | `s2-11-optimize-outline.md` |

## 分享讲稿

- `分享讲稿/2026-06-04-tech-center-six-harness-capabilities.md` — 技术中心分享：六层 AI Coding Harness 能力详解

## 发布流水线

`.skills/spec-wechat-publish/` 是项目本地的微信公众号发布 skill（封面生成、配图 SVG→PNG、草稿上传）。内部路径约定已校准为本仓的 `文章系列/`，选题扫描已适配按季归档的子目录结构。
