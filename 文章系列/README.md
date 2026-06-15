# 文章系列

spec-first 微信公众号文章运营目录。后续所有微信文章的规划、写作、配图、发布都在这里进行。

> 想快速了解 spec-first 怎么用？看 `运营规划/spec-first-使用说明.md` —— 用一个贯穿案例从安装串到经验沉淀的端到端实操教程。

## 目录结构

```text
文章系列/
├── README.md                 # 本导航
├── 运营规划/                  # 系列规划、内容路线图（先读这里）
├── 第一季-harness认知/        # 第一季 · 设计思想：建立 AI Coding Harness 认知框架
├── 第二季-实操案例/           # 第二季 · 项目实操：真实项目案例走完整条链路
├── 第三季-skill深度剖析/      # 第三季 · 细节设计：逐个 skill / 概念机制深挖
├── 分享讲稿/                  # 技术中心等内部分享讲稿
└── pic/                       # 全系列共享配图（SVG 源 + PNG 输出）
```

> 微信发布流水线 skill 已收纳到仓库根 `skills/spec-wechat-publish/`（与其他 skill 统一管理），仍按仓库根相对路径操作 `文章系列/` 内容。

> 系列采用「设计思想 → 项目实操 → 细节设计」三季弧线，详见 `运营规划/006-顶层总规划.md`。

约定：

- 正文与对应的 `-outline.md` 提纲同放在所在季目录。
- 配图统一放顶层 `pic/`，正文用相对路径 `../pic/xxx.png` 引用。
- 新文章按季归入对应目录；新开季时新建 `第N季-xxx/` 目录。

## 发布状态

- `已发布台账.md` — 已发布文章台账（序号、文档、标题、发布时间），发布状态以此为单一事实来源。

## 运营规划

详细导航见 `运营规划/README.md`。核心文档：

- `运营规划/006-顶层总规划.md` — **顶层总规划**（思想/实操/细节三季骨架、编号对账表、第一季演化说明）；先读这里建立全局视角
- `运营规划/003-系统总框架.md` — 系列整体框架（分层框架、三大内容流、标题池）
- `运营规划/004-第一季路线图.md` — 第一季 · 设计思想路线图（历史规划，实际收窄为 5 篇）
- `运营规划/008-第二季实操路线图.md` — 第二季 · 项目实操路线图（场景矩阵，真实项目案例）
- `运营规划/009-运营策略与发布日历.md` — 运营策略：发布节奏、短钩子拉新流、BIP 排期、增长指标
- `运营规划/005-第二季路线图.md` — 第三季细节季 · skill 剖析编号细节（历史"第二季"规划，重构后归细节季）
- `运营规划/007-第三季路线图.md` — 第三季细节季 · 进阶/治理专题选题池
- `运营规划/spec-first-使用说明.md` — spec-first 端到端实操教程（贯穿案例，op-01 种子；参考类，不在编号序列内）

## 第一季 · 设计思想（Harness 认知）

主线：Prompt 问题 → Workflow 问题 → Harness 问题 → Evidence / Review / Knowledge 闭环。

| 篇 | 正文 | 提纲 |
|---|---|---|
| 01 | `01-spec-first.md` | — |
| 02 | `02-ai-coding-harness.md` | — |
| 03 | `03-why-you-cannot-delegate-to-ai.md` | `03-why-you-cannot-delegate-to-ai-outline.md` |
| 04 | `04-context-harness.md` | `04-context-harness-outline.md` |
| 05 | `05-graph-decision-input.md` | `05-graph-decision-input-outline.md` |

## 第二季 · 项目实操

7 篇 = 总览 + 3 个场景案例（0-1/1-10/10-100 × 单仓/多模块/多仓）+ 3 个高价值切面（调试、协作接力、上线信心）。路线图见 `运营规划/008-第二季实操路线图.md`。

| 篇 | 场景 | 正文 | 提纲 |
|---|---|---|---|
| op-00 | 全链路总览（两张地图） | `op-00-full-journey.md` | `op-00-full-journey-outline.md` |
| op-01 | 日常增量（1-10 单仓） | `op-01-daily-increment.md` | `op-01-daily-increment-outline.md` |
| op-02 | 从 0 到 1 新产品 | 待写 | — |
| op-03 | 存量系统改造（10-100 多模块） | 待写 | — |
| op-04 | 多仓/团队协作（含多端） | 待写 | — |
| op-05 | 出错了怎么办（调试实战） | 待写 | — |
| op-06 | 换人换 AI 怎么接（协作接力） | 待写 | — |
| op-07 | 上线敢不敢信（质量门） | 待写 | — |

## 第三季 · 细节设计（skill 深度剖析）

逐个 skill 机制深挖。正文已完成 10 篇，仅 s3-11 待写；进阶/治理专题选题见 `运营规划/007-第三季路线图.md`。

| 篇 | 主题 | 正文 | 提纲 |
|---|---|---|---|
| s3-01 | runtime setup | `s3-01-runtime-setup.md` | `s3-01-runtime-setup-outline.md` |
| s3-02 | brainstorm | `s3-02-brainstorm.md` | `s3-02-brainstorm-outline.md` |
| s3-03 | spec / prd | `s3-03-spec-prd.md` | `s3-03-spec-prd-outline.md` |
| s3-04 | plan | `s3-04-plan.md` | `s3-04-plan-outline.md` |
| s3-05 | doc-review | `s3-05-doc-review.md` | `s3-05-doc-review-outline.md` |
| s3-06 | write-tasks | `s3-06-write-tasks.md` | `s3-06-write-tasks-outline.md` |
| s3-07 | work | `s3-07-work.md` | `s3-07-work-outline.md` |
| s3-08 | debug | `s3-08-debug.md` | `s3-08-debug-outline.md` |
| s3-09 | code-review | `s3-09-code-review.md` | `s3-09-code-review-outline.md` |
| s3-10 | compound | `s3-10-compound.md` | `s3-10-compound-outline.md` |
| s3-11 | optimize | 待写 | `s3-11-optimize-outline.md` |

## 分享讲稿

- `分享讲稿/2026-06-04-tech-center-six-harness-capabilities.md` — 技术中心分享：六层 AI Coding Harness 能力详解

## 发布流水线

`skills/spec-wechat-publish/` 是项目本地的微信公众号发布 skill（封面生成、配图 SVG→PNG、草稿上传）。内部路径约定已校准为本仓的 `文章系列/`，选题扫描已适配按季归档的子目录结构。
