---
name: spec-first-usage-walkthrough
description: spec-first 端到端使用说明——用一个贯穿案例（给待办应用加标签过滤功能），从安装初始化到经验沉淀，串起完整开发链路的每一步：命令、产物、何时跳过。
metadata:
  type: reference
---

# spec-first 使用说明：用一个项目跑完整条链路

这份文档用**一个贯穿始终的小项目**，把 spec-first 从零到经验沉淀的完整流程串起来。每一步都给出：跑什么命令、产出什么文件、什么时候可以跳过。

> **贯穿案例：** 给一个已有的待办应用（todo-app），加一个「按标签过滤任务」的功能。
> **场景定位：** 已有产品 + 增量功能（1-10 模式）、单仓单项目。这是最常见的日常开发场景。

读完你会知道：一个需求从一句话到上线、再到沉淀成下次能复用的经验，spec-first 的每个节点各自做什么、把什么交给下一步。

---

## 全链路一览

```text
环境就绪一次性          每个需求循环
─────────────          ──────────────────────────────────
install                brainstorm   需求收敛   → requirements
  ↓                       ↓
doctor                 plan         计划形成   → plan
  ↓                       ↓
init                   doc-review   计划审查   → findings
  ↓                       ↓
mcp-setup              work         受控执行   → 代码 + 验证
                          ↓
                       code-review  代码审查   → findings
                          ↓
                       compound     经验沉淀   → solution
```

左边三件事每个项目只做一次；右边的循环每个需求走一遍，小需求可以跳过其中几步（后面会说哪些能跳）。

---

## 第零步：环境就绪（每个项目一次）

在跑任何 workflow 之前，先让 runtime 就绪。这三件事有顺序依赖，缺一不可。

### 1. 安装并初始化宿主

```bash
npm install -g spec-first
spec-first doctor          # 体检：检查 Node、宿主、依赖
spec-first init --claude -u yourname --lang zh
# 用 Codex 就换成：spec-first init --codex -u yourname --lang zh
```

`init` 之后**重启宿主**（Claude Code 或 Codex），让生成的 runtime assets 生效。

### 2. 安装并验证 MCP / helper runtime

重启后，在宿主里跑：

```text
/spec:mcp-setup          # Claude Code
$spec-mcp-setup          # Codex
```

它负责安装和验证 required MCP servers、可选 graph providers、helper tools，并把配置写进 `.spec-first/config/`。

**这一步产出：** `.spec-first/config/tool-facts.json`、`.spec-first/config/runtime-capabilities.json`。

> **为什么有顺序：** `init` 先从 source 生成 host runtime → `mcp-setup` 依赖 init 的产物装 MCP/provider。装反了后面会报 runtime 不一致。

环境就绪后，下面进入针对「标签过滤」这个需求的循环。

---

## 第一步：需求收敛 —— brainstorm

需求还没完全说清时，先用 `brainstorm` 把模糊意图收敛成可审查的需求文档。

```text
/spec:brainstorm "给 todo-app 加一个按标签过滤任务的功能"
$spec-brainstorm "给 todo-app 加一个按标签过滤任务的功能"
```

brainstorm 不是闲聊，它会逼你回答几个关键问题：

- **谁在用？** —— 用标签管理大量任务的用户
- **当前卡在哪？** —— 任务一多就找不到，只能滚动翻
- **成功标准？** —— 能按一个或多个标签筛选，结果实时更新
- **不做什么？** —— 这轮不做标签的增删改管理，只做过滤

**产出物：**

```text
docs/brainstorms/2026-06-14-001-tag-filter-requirements.md
```

这份文档回答 WHAT，是后面所有步骤的需求来源。

> **如果是存量系统的复杂增量需求（10-100 模式）**，这里改用 `spec-prd`——它会先记录系统当前状态（current-state evidence），再描述这次改动的 delta，让 plan 不用猜 WHAT。产出同样在 `docs/brainstorms/`，但 frontmatter 标 `artifact_kind: prd-requirements`。

---

## 第二步：计划形成 —— plan

需求稳定后，进入 plan。它把 WHAT 转成可执行的工程决策（HOW）。

```text
/spec:plan
$spec-plan
```

plan 读取上一步的 requirements，产出：

```text
docs/plans/2026-06-14-001-feat-tag-filter-plan.md
```

一份好的 plan 包含：

- 实施目标和**非目标**
- 大致改哪些文件、依赖关系（如：过滤逻辑层、任务列表组件、状态管理）
- 风险点和**验证方式**（如：多标签组合、空结果、性能）
- 留给实现期的决策空间

> **plan 不是逐行指令。** 它约束 scope、验证、风险和交接，具体实现细节留给 work 阶段的 LLM 判断。这正是"约束边界、不约束步骤"。

---

## 第三步：计划审查 —— doc-review

plan 写完**立即** review，这时发现问题的成本最低（还没写一行代码）。

```text
/spec:doc-review
$spec-doc-review
```

doc-review 从多个角度审查 plan：

- **coherence**：需求和计划一致吗？
- **feasibility**：计划可行吗？
- **scope**：范围合理吗，有没有遗漏或过度？
- **adversarial**：有没有明显风险或盲点？

它给出 findings 指出要改的地方。改完再确认，进入下一步。

> **何时可以轻量化：** 改动小、plan 简单清晰时可以略过细审。但大需求、跨模块、高风险时**不建议跳过**——需求和计划的错，比代码的错贵得多。

---

## 第四步：任务切片 —— write-tasks（可选）

如果 plan 大、跨模块、有明确依赖关系，用 `write-tasks` 把它编译成可确定性交接的任务包。

```text
/spec:write-tasks
$spec-write-tasks
```

**产出物：**

```text
docs/tasks/2026-06-14-001-feat-tag-filter-tasks.md
```

task pack 记录 source plan、hash、任务图、执行波次和验证信号。它带 `spec_id` / `source_plan_hash`，**防止过期链路被静默执行**；只能重排执行切片，不能改 scope 或验收标准。

> **我们这个需求可以跳过。** 「标签过滤」就是过滤逻辑 + 列表组件 + 状态，不到 3 个 implementation unit、无跨模块依赖，直接进 work。**plan 小于 3 个单元、无跨模块依赖时跳过这步。**

---

## 第五步：受控执行 —— work

```text
/spec:work
$spec-work
```

work 读取当前请求、plan（或 task pack）、已加载的项目指令、相关源码和测试，完成最小可验证改动。它有五个控制点，确保 AI 不跑偏：

1. **scope 验证**：开工前确认边界，不做 plan 之外的事
2. **task identity**：`spec_id` / `source_plan_hash` 确保链路没过期
3. **vertical tracer bullet**：先打通一个完整行为（如先让单标签过滤跑通），再扩展（多标签）
4. **review gate**：内置质量检查点
5. **handoff evidence**：结束时留下可被下游消费的证据

**典型产出：** 代码 diff、测试或检查命令、验证记录、残余风险说明，以及 `CHANGELOG.md` 记录。

> 这一步对应第一季反复讲的——work 不是"让 AI 自由发挥"，而是在 plan 边界内的受控执行。scope 一旦想扩张，应该停下来回到 plan，而不是顺手做了。

---

## 第六步：代码审查 —— code-review

work 完成后，对改动做结构化审查。

```text
/spec:code-review
$spec-code-review
```

它先跑 `review-pre-facts` 准备证据（diff、graph evidence、测试结果），再派多个 reviewer 并行从六个维度审查：correctness、security、performance、maintainability、test、docs。

每个 actionable finding 都带：

- **evidence**：证据在哪
- **severity**：多严重
- **owner**：谁来修
- **verification**：怎么验证修好了

> code-review 看的是仓库内已有的规则（`AGENTS.md` / `CLAUDE.md` / `docs/contracts`），不是凭空的通用 baseline。规范从哪来，它就按哪审。

---

## 第七步：经验沉淀 —— compound

任务结束、上下文最新鲜时，沉淀经验的质量最高。

```text
/spec:compound
$spec-compound
```

compound 会问：这次解决的问题，值得记录吗？值得的话，它写成结构化文档存进 `docs/solutions/`：

```text
docs/solutions/frontend/tag-filter-state-management-2026-06-14.md
```

文档带 frontmatter（`applies_when`、`tags`、`component`），后续 workflow 能按需检索——下次再做类似的过滤功能，AI 就能先读到这次的解法，不用从零开始。

> 这就是 spec-first 的核心价值：**不是让 AI 更聪明，而是让每次任务都让下一次任务更容易。**

---

## 最小可用链路

不是每个需求都要走完所有步骤。单仓单项目 + 小需求的最小链路是：

```text
brainstorm → plan → work → compound
```

四步，每步都留下高质量上下文。

**哪些能跳，哪些别跳：**

| 步骤 | 能跳的情况 | 别跳的情况 |
|---|---|---|
| `ideate` | 方向已清楚 | 0-1 全新产品、方向未定 |
| `doc-review` | 改动小、plan 简单 | 大需求、跨模块、高风险 |
| `write-tasks` | < 3 个单元、无跨模块依赖 | 多模块、有依赖或并行机会 |
| 环境就绪 | —— | **永远别跳**，是所有 workflow 的前提 |
| 需求收敛 | —— | **别跳**，否则 plan 只能猜 WHAT |

---

## 换个场景，链路怎么变

我们的案例是「1-10 × 单仓单项目」。换场景时，主要变化在**需求阶段**和**边界规则**，中间的 plan → work → review → compound 基本一致。

| 场景 | 链路特点 |
|---|---|
| 0-1 全新产品 | 前面加 `ideate` 探索方向：`ideate → brainstorm → plan → work → review → compound` |
| 10-100 存量系统 | 需求换 `spec-prd` 写 delta，plan 按 module 拆：`spec-prd → plan → doc-review → write-tasks → work → code-review → compound` |
| 多仓工作区 | 每步写入前**必须有明确 target_repo**，父 workspace 只做 advisory，不替你选 repo |

---

## 产物落在哪、要不要提交

跑完一轮，仓库里会多出这些。搞清楚谁该进 Git 很重要：

| 产物 | 路径 | 要不要提交 |
|---|---|---|
| 需求 | `docs/brainstorms/*-requirements.md` | 通常提交 |
| 计划 | `docs/plans/*-plan.md` | 通常提交 |
| 任务包 | `docs/tasks/*-tasks.md` | 看团队协作需要 |
| 经验 | `docs/solutions/**` | 通常提交 |
| 变更记录 | `CHANGELOG.md` | 提交 |
| runtime 配置 | `.spec-first/` | 通常**不**提交（runtime/advisory facts） |
| 生成的宿主资产 | `.claude/` `.codex/` `.agents/skills/` | **不**提交、**不**手改，漂移用 `spec-first init` 重建 |

> 一个原则：`docs/` 下的是长期协作知识，提交；`.claude/` 等是生成物，不碰不提交，要改去改 source 再重新生成。

---

## 一句话总结

spec-first 不是一条固定流水线，而是一组可按场景组合的节点。它的价值不在多跑命令，而在把 AI coding 的关键判断显式化：**事实从哪来、scope 怎么定、计划怎么执行、review 看什么、经验如何回流**。

走一遍这条链路，你给 AI 的就不再是一句模糊的"帮我加个过滤功能"，而是一个有需求、有边界、有验证、能沉淀的工程任务。
