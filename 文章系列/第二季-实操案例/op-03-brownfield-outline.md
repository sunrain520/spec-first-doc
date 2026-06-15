---
name: op-03-brownfield-outline
title: Spec-First：在有历史包袱的老系统上改代码，怎么不改崩
description: 第二季（项目实操）op-03 大纲：在一个有历史包袱的老系统上安全做增量（10-100 × 单仓多模块），用 spec-prd 写 current-state evidence + change delta，让 plan 不用猜既有约束。
metadata:
  type: article-outline
  series: op
  series_index: "op-03"
---

# Spec-First：在有历史包袱的老系统上改代码，怎么不改崩

**状态：** 大纲
**层：** 骨架篇（场景案例）
**坐标：** 10-100 存量系统 × 单仓多模块
**目标读者：** 手上是有年头、多模块、谁也不敢乱动的老系统的开发者

## 定位

- 骨架篇第三个坐标，难度最高的场景之一。核心问题：**在一个有历史包袱的老系统上，怎么安全地改？**
- 存量场景翻车的最大来源不是不会写代码，是**不知道既有约束**——改一处，崩三处。
- 核心动作前移到 `spec-prd`：写 current-state evidence（先把"系统现在是什么样"取证清楚）+ change delta（这次的变化是 keep/extend/replace/remove 哪一种），让 plan 不用猜 WHAT、不用猜既有行为。
- 拓扑是单仓多模块：不拆多套 `.spec-first`，由 plan / write-tasks / work / review 按 module 边界拆分。
- 案例建议：给一个已有多模块系统（如订单+库存+通知三模块的后台）加一个跨模块的小增量，且必须保留某个既有行为。
- **发布序定位（关键）：** 锁定发布顺序第 6 篇——**上一篇是 op-06（换人换 AI 接力），下一篇是 op-04（多仓）**。上集回顾承接 op-06，下篇预告指 op-04。可引用已发案例：op-00/01/05/02/06（前 5 篇）。

**运营基调（写作约束）：**
- 痛点前置：第 1 节金句即痛点 + 一个"改一处、崩三处"的真实事故画面感缩影（如改了订单状态、库存对不上了），先让读者代入；导读 blockquote 后置。
- 防机制越界（关键）：第 6-9 节讲 spec-prd 时，**用"案例里这个增量怎么写 current-state、怎么标 delta"叙述，不罗列字段/标签清单**。读者读完得到"会用"，机制定义（5 级证据标签、delta 词汇表全集）交 s3-03。每节最多带一个真实例子，不做机制科普。
- CTA 四件套 + 主次分明：导流期篇目，**主 CTA = 阅读原文去 GitHub**（动词+收益+"开源已能用"降风险句），次级关注/转发；下篇预告独立 blockquote。

## 结构（约 15 节）

1. 开场：金句即痛点（"老系统最可怕的不是难写，是你不知道动了它会牵连什么"）+ 一个改一处崩三处的事故缩影；一句上集回顾承接 op-06（"上一篇讲了换人换 AI 怎么靠 docs 接力，这篇换个更硬的场景——接手的是一个谁都不敢乱碰的老系统"）；导读 blockquote 后置
2. 案例定位：一个多模块老系统的真实增量 + 两张地图坐标（10-100 × 单仓多模块）
3. 反面放大：让 AI 在老系统上"自由发挥"的翻车——它读不到既有约束、看不见模块耦合，改一处崩三处
4. 为什么 0-1 的 brainstorm 不够用了：存量场景要先"描述现状"，不是"探索方向"——引出 spec-prd
5. 第零步 环境就绪（与 op-01 相同，指回不复述）
6. spec-prd 第一件事（案例叙述非机制）：current-state evidence——这个增量动到的订单/库存模块"现在到底怎么跑"，怎么取证而不是凭记忆
7. 证据要分轻重：source/test 确认的 vs 只是口述/假设的——案例里哪条现状被坐实、哪条还存疑（机制全集交 s3-03）
8. spec-prd 第二件事（案例叙述非机制）：change delta——这次对既有行为是保留/扩展/替换/移除/还是尚不确定（keep/extend/replace/remove/unknown，与源码一致的五种；用案例把变化说死，存疑的标 unknown 而非默认 keep）
9. 为什么"和以前一样""复用原逻辑"是危险词：既有行为和 delta 不显式，plan 就会猜
10. 单仓多模块的拆法：plan 按 module 边界拆 implementation units，不为每个模块拆一套 .spec-first
11. 这次为什么**不能跳 write-tasks**（与 op-01"这次跳过"镜像对照）：存量多模块跨 ≥3 实现单元、有跨模块依赖，正落在 op-01 判断表的"该用"一侧——用任务包锁住执行波次与 source_plan_hash，防止改到一半链路过期
12. doc-review 在存量场景不能省：影响面大、跨模块依赖，计划层的错比代码层贵得多
13. work + code-review：review 按变更文件和影响面分组，重点盯"会不会冲掉既有行为"
14. compound：把"这个模块有个不能动的既有约束"这种坑沉淀下来，下次改它的人直接读到
15. 收尾复盘（全季固定动作）：存量场景为什么 doc-review 和 write-tasks 通常不能省（呼应第 11 节，对照 op-01 跳过的判断）
16. 小结 + 结尾 CTA 四件套（主 CTA = 阅读原文去 GitHub）+ 下一篇 blockquote 预告 **op-04（多仓工作区）** 点名具体问题不剧透

## 与第三季分工（防重叠，必写）

- 本篇是"存量场景实战跑一遍 brownfield 链路"，**不复述** current-state / change delta 的机制定义。
- 篇末引向 s3-03 spec-prd 机制深挖（证据 5 级标签、delta 词汇表的完整定义）。
- 写作前交叉检查 s3-03 已讲机制，确保 op-03 只给"场景+判断"，机制交 s3-03。
- 事实锚点（来自源码取证，写作时确认）：spec-prd 是 brownfield 专用；产物落 `docs/brainstorms/*-requirements.md`，`artifact_kind: prd-requirements`；delta 词汇 keep/extend/replace/remove/unknown。

## 配图（7-8 张，op-03-* 前缀，blueprint 风格，封面待作）

- op-03-cover（封面，待作）
- op-03-legacy-breaks（存量翻车：改一处崩三处，看不见的既有约束）
- op-03-current-state（current-state evidence：取证分轻重，确认 vs 口述 vs 假设）
- op-03-change-delta（change delta：keep/extend/replace/remove/unknown 五种变化，与源码一致）
- op-03-module-split（单仓多模块：plan 按 module 边界拆 units + write-tasks 锁波次）
- op-03-review-by-impact（code-review 按影响面分组，盯既有行为）
- op-03-takeaway（**传播资产**：存量改造链路全景 + 哪步不能省，可截图独立转发）

## 质量标准

- 正文 ≥1.5 万字、配图 6-10 张、frontmatter title 全角冒号开头、正文无 H1。
- 文风对齐 op-01：加粗金句开场 + 导读 blockquote + 超短段 + 章节 NN 编号 + H3 用 NN.x + 结尾 CTA 四件套（主次分明）+ 下一篇 blockquote 预告。
- 与 op-01 防重叠：环境就绪/work/compound 的通用机制指回 op-01，篇幅集中在 spec-prd 的 current-state/delta 与多模块拆分这两个存量特有难点。
