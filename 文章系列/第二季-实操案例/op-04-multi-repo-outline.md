---
name: op-04-multi-repo-outline
title: Spec-First：管着好几个仓库，怎么不让 AI 把代码写错地方
description: 第二季（项目实操）op-04 大纲：多仓 advisory 现状下多个仓库怎么协作才不写错地方。讲清父 workspace 是 advisory 控制面、每个 child repo 独立 setup/plan/work、写入前必须人工确认 target_repo；含多端 actors 维度小节。
metadata:
  type: article-outline
  series: op
  series_index: "op-04"
---

# Spec-First：管着好几个仓库，怎么不让 AI 把代码写错地方

**状态：** 大纲
**层：** 骨架篇（场景案例，难度最高、排在骨架最后）
**坐标：** 任意需求模式 × 多仓工作区（advisory 现状）
**目标读者：** 一个父目录下挂着多个独立 repo、经常跨仓协作的开发者/小团队（**主受众单一 = 多仓协作者**；多端 actors 只是顺带示范的一个维度，不引入"多端团队"次受众）

## 定位（⚠️ advisory 降格，必读）

- spec-first 的多仓 workspace 当前是 **advisory 级实现，不是 first-class feature**：父 workspace 只能写 `.spec-first/workspace/*summary.json` 这类 advisory summaries，每个 child repo 仍各自独立 setup/plan/work；`target_repo` 是必须由人显式指定的约束，不是工具自动解析的成熟能力。
- 因此本篇**不写成"成熟多仓能力的实操演示"**，而写成"**在 advisory 现状下，多仓的正确用法与必须人工把守的边界**"。读者若按"全自动多仓"预期上手会撞到 advisory 限制，落差大——本篇的价值正是讲清现状边界、给出不踩坑的工作方式。
- **写作前提醒：** 复查 spec-first 多仓实现是否已升级为 first-class（若已成熟可相应提格）；当前按 advisory 现状写。
- **发布序定位（关键）：** 锁定发布顺序第 7 篇——**上一篇是 op-03（存量改造），下一篇是 op-07（上线信心，压轴）**。上集回顾承接 op-03，下篇预告指 op-07。可引用已发案例：前 6 篇全部。

**运营基调（写作约束，本篇最关键）：**
- ⚠️ 这是全季吸引力最弱的一篇——advisory 现状若写成"功能还不成熟"的免责声明，读者会觉得"原来多仓不能用"直接划走。**基调必须从"道歉/局限"翻转为"老手避坑心法"**：把"工具不替你自动选 repo"讲成"正因为多仓最容易写错地方，聪明的做法是显式把守 target_repo"——边界清楚是优势不是缺陷。
- 情感弹药前置：第 1 节就用"AI 把代码写对了、却 commit 进了错误的 repo，CI 全绿但功能跑在错地方"这种真实事故画面感开场，让被多仓坑过的人立刻代入。
- 价值定位：本篇卖的是"多仓协作不翻车的工作心法"，不是"多仓功能演示"。读者带走的是一套不踩坑的纪律，这本身稀缺、值得转发给同样管多仓的人。
- 不夸大：任何"自动多仓"措辞都核对源码事实；但也不自我贬低，advisory 是"需要人把关"不是"残缺"。

## 结构（约 15 节）

1. 开场：金句即痛点 + 真实事故画面感（"AI 把代码写对了，CI 全绿，却 commit 进了错误的 repo，功能跑在了错地方"）；一句上集回顾承接 op-03（"上一篇在一个老系统里小心翼翼地改，这篇把场景放大到好几个仓库——错的不再是改哪行，是改哪个仓"）；导读 blockquote 后置
2. 案例定位：一个父目录挂多个 child repo 的真实工作区 + 在拓扑地图上的位置
3. 反面放大：以为多仓是"自动的"——让 cwd 或 graph 替你选 repo，结果改到了错误的 child
4. 正面反驳"advisory 是不是就等于不能用"：不是。advisory 控制面 = 父 workspace 能跨 repo 概览、选 bounded candidate repos，但**故意不替你做权威**——正因多仓最易写错，把决定权留给人是对的，这是设计取舍不是残缺
5. advisory facts 的正确读法：`.spec-first/workspace/*summary.json` 是参考、不是任何 child repo 的 canonical truth
6. 心法一·每个 child 独立就绪：`mcp-setup --repo <name>` 或 `--all-repos` 批量
7. 心法二·每个 child 独立链路：plan / work / review 各自按 repo root 为边界
8. 心法三·target_repo 是人把守的闸：**每步写入/测试/commit 前必须人工确认 `target_repo`**，不让 cwd/graph 替你选——这是不写错地方的核心纪律
9. `--repo` / `--all-repos` / `--folder` 的用法与适用边界（`--folder` 处理父级非 Git 普通目录的 advisory 行为）
10. 顺带说多端（单节讲完三件事）：多端（Web/iOS/Android/backend）是 **actors 维度，与仓库拓扑正交**——可发生在单仓多 target 也可发生在多仓；brainstorm 拆 actors、plan 列各端文件边界；**别把"多端=多仓"混为一谈**（主受众仍是多仓协作者，这只是顺带的一个判断）
11. 多仓主线强化·写错 repo 的连锁代价：写错 repo 不只是改错文件，还会污染那个 repo 的 git 历史、CI、review 范围——所以闸要前置
12. 跨仓协作的现实建议：什么适合现在用多仓、什么先别指望自动化（诚实但不贬低，给一个"现在就能稳的工作流"）
13. 收尾复盘（全季固定动作）：多仓最容易出的事故（写错 repo），以及"显式 target_repo + advisory 现状认知"怎么挡住它
14. 小结 + 结尾 CTA 四件套（**主 CTA = 阅读原文去 GitHub**；转发钩子瞄准"同样管多仓的人"，关注为次级）+ 下一篇 blockquote 预告 **op-07（上线信心，压轴）** 点名具体问题不剧透

## 与第三季分工（防重叠，必写）

- op-04 讲**实操边界**（advisory 现状下怎么不写错）；三种开发模式的机制交 007 development-modes 专题。
- 篇末引向 development-modes 专题（模式机制）与 s3-04 plan（多仓 plan 的 target_repo 标注机制）。
- 不复述三模式机制定义，只给"在现状下怎么安全协作"的判断。

## 配图（7 张，op-04-* 前缀，blueprint 风格，封面待作）

- op-04-cover（封面，待作）
- op-04-wrong-repo（多仓事故：代码写对了但写错 repo，连锁污染 git/CI/review）
- op-04-advisory-plane（advisory 控制面边界：父 workspace 不是超级 repo）
- op-04-target-repo-gate（正确工作方式：每 child 独立 + target_repo 人工闸）
- op-04-repo-flags（--repo / --all-repos / --folder 用法与边界）
- op-04-actors-orthogonal（多端 actors 与仓库拓扑正交，不是"多端=多仓"）
- op-04-takeaway（**传播资产**：多仓协作不踩坑的核心约束全景卡，可截图独立转发给管多仓的人）

## 质量标准

- 正文 ≥1.5 万字、配图 6-10 张、frontmatter title 全角冒号开头、正文无 H1。
- 文风对齐 op-01：加粗金句开场 + 导读 blockquote + 超短段 + 章节 NN 编号 + H3 用 NN.x + 结尾 CTA 四件套（主次分明）+ 下一篇 blockquote 预告。
- **诚实边界优先：** 全篇基调是"讲清 advisory 现状 + 给安全工作方式"，不夸大多仓能力；任何"自动多仓"的措辞都要核对源码事实。
