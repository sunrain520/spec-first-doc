# TMA1 v2：让 Coding Agent Loop 转起来，对 spec-first 升级 Loop 与 LSF/LFG Skill 结合的判断

> 来源：https://mp.weixin.qq.com/s/uXSB3tL9rCGt4izHEyIyCQ
> 原文标题：TMA1 v2：让 Coding Agent Loop 真的转起来
> 归档日期：2026-06-15
> 归档主题：Agent Loop / Coding Loop / Observability / Context Injection / Skill / spec-first / LFG

## 1. 项目概述

这篇文章介绍的是本地 AI Coding Agent 可观测性工具 **TMA1 v2**。它的核心不是“再做一个 Agent”，也不是“再做一个工作流命令”，而是把 Coding Agent 在真实开发中的运行信号重新注入下一轮行动，让 Agent Loop 从“人肉同步上下文”升级为“自动观测、自动归因、自动注入、跨 Agent 共享上下文”的闭环。

文章给出的基础 Coding Loop 是：

```text
feature → plan → code → verify/test → review
                      ↑______________↓
```

TMA1 v2 的增量在于：在这个 loop 外面加一层持续运行的观测与上下文注入层：

```text
observe → attribute → summarize → inject → act
```

它观测的不是单一 prompt，而是完整工程现场：session、tool call、LLM 调用、文件变更、build 状态、外部 human changes、peer Agent session、异常模式和上下文长度。然后通过 hooks、MCP server、`tma1-peer` skill / slash command，把这些信息给到 Claude Code、Codex 等 Coding Agent。

对 spec-first 的关键启发是：**Loop 升级不是把流程改成全自动，而是把 spec、plan、code、verify、review、build、peer session 和 external changes 变成每轮行动前可感知、可注入、可回源的运行时上下文。**

关于用户问题“是否跟 LSF skill 结合”：文章正文没有出现 LSF，也没有出现 spec-first。当前目录中也没有稳定的 `LSF` 知识链，只有 Compound Engineering 中的 `lfg` skill（全自动工程工作流）以及一组 `ce-* / spec-*` skill 入口。因此本文按两个口径判断：

- 如果你说的是 **LSF 作为某种 Skill 层框架**：可以结合，但应把它定位为 Loop 的结构化动作接口，而不是全自动主控。
- 如果你说的是现有知识链中的 **LFG skill**：不建议直接把 spec-first 升级为 LFG 式全自动端到端工作流；更适合先吸收 TMA1 的“观测注入层”和 `peer session` 能力，再把 LFG 降级为实验入口。

---

## 2. 架构分析

### 2.1 TMA1 v2 的 Loop 架构

文章里的 TMA1 v2 可以抽象成四层：

```text
┌─────────────────────────────────────────────┐
│ Coding Agents                                │
│ Claude Code / Codex / Human                  │
└───────────────────┬─────────────────────────┘
                    │ act
┌───────────────────▼─────────────────────────┐
│ Coding Workflow                              │
│ feature → plan → code → verify/test → review │
└───────────────────┬─────────────────────────┘
                    │ emits
┌───────────────────▼─────────────────────────┐
│ TMA1 Observation Layer                        │
│ session / tools / llm / fs / build / peer     │
│ external changes / anomalies / token usage    │
└───────────────────┬─────────────────────────┘
                    │ injects / exposes
┌───────────────────▼─────────────────────────┐
│ Context Injection + MCP + Skill               │
│ <tma1-context> / tma1.get_peer_sessions        │
│ tma1-peer / build watch / anomaly hints        │
└─────────────────────────────────────────────┘
```

它的核心能力包括：

1. **MCP Server**：让 Agent 查询 build、环境、peer sessions。
2. **Hooks 注入**：在 `UserPromptSubmit`、`PostToolUse`、`SessionStart`、`Stop`、`PreCompact` 等节点注入 `<tma1-context>`。
3. **Peer Skill**：通过 `tma1-peer` 读取另一个 Agent 最近 session 的审查结论、修改文件、工具调用和上下文摘要。
4. **Build Watch**：将人类或外部命令运行的构建状态纳入 Agent Loop。
5. **文件变更归因**：通过 fsnotify + hook event 时间窗口判断文件变更来自 Agent 还是 human/external。
6. **异常检测**：识别“反复改同一文件但错误不变”“context 超过 100k”“human 修改了 session 文件”等模式，提示 Agent 调整策略。

这些能力共同说明：Loop 真正转起来，不只是有 `plan → code → test → review` 的流程图，而是每一轮行动都能感知真实工程状态。

### 2.2 与 spec-first 当前架构的关系

spec-first 已经有一条清晰的纵向流程：

```text
spec-brainstorm / spec-ideate
  → spec-plan
  → spec-work
  → spec-code-review / spec-doc-review
  → spec-debug
  → spec-compound
```

这条流程解决的是“从需求到实现再到知识沉淀”的方法论结构。但它天然容易遇到 TMA1 文章指出的问题：

- `spec-work` 不一定知道最新 build/test 状态；
- `spec-code-review` 不一定知道前一个 Agent 的完整 session；
- `spec-debug` 可能重复修同一处但错误不变；
- 多 Agent 之间可能靠人复制 review 结论；
- human 或另一个 Agent 修改文件后，当前 Agent 仍基于旧上下文继续工作；
- 长会话上下文膨胀后，Agent 没有结构化 compact / new session 提醒。

因此，spec-first 升级 Loop 的方向不是新增一个更大的“超级 workflow”，而是在现有 workflow 外加一个 **Loop Context Layer**：

```text
spec-first workflow = 决策与交付骨架
Loop Context Layer  = 运行时感知、归因、注入、跨 Agent handoff
Skill / MCP         = 标准化读取和写入上下文的接口
```

### 2.3 与 LSF / LFG Skill 的关系

文章只明确提到 `tma1-peer skill / slash command`，没有展开 LSF。当前知识库中更接近的是 Compound Engineering 的 `lfg`：一个实验性“全自动工程工作流”。已有 `ce-exposed-skill-commands-2026-04-26.md` 对它的定位是：

```text
lfg = 全自动工程工作流，实验入口，不默认展示
```

这给 spec-first 一个重要边界：

- TMA1 式 Loop 升级强调 **observe / inject / peer context**；
- LFG 式入口强调 **端到端自动执行**；
- 二者不是同一层能力。

更合理的结合方式是：

```text
不要：spec-first → 直接接 LFG → 全自动跑完
应该：spec-first workflow → 引入 Loop Context Layer → 让各 skill 按需消费上下文
```

如果未来有 LSF Skill，它应该更像 `tma1-peer`：成为 Loop 中的上下文接口和标准动作，而不是替代 spec-first 的主 workflow。

---

## 3. 对照矩阵

| 维度 | TMA1 v2 文章做法 | spec-first 当前状态 | 升级建议 |
| --- | --- | --- | --- |
| Loop 定义 | feature → plan → code → verify/test → review | brainstorm / plan / work / review / debug / compound | 保持 spec-first 阶段骨架，不新增大而全流程 |
| Observe | 观测 session、tools、LLM、build、fs、peer | 主要依赖 workflow artifact、run artifact、人工说明 | 新增运行时观测摘要和注入层 |
| Context Injection | hooks 自动注入 `<tma1-context>` | 主要靠 prompt prose、README、artifact-summary | 引入 `<spec-loop-context>` 或同类上下文块 |
| Peer Agent 协作 | `tma1-peer` 查询其他 Agent session | 已有 session 相关 skill / agent 分析，但非实时 loop 注入 | 先做 peer session summary skill，而非群聊式 multi-agent |
| Build/Test 状态 | `tma1 build --watch` 纳入 Loop | spec-work 有验证产物，但实时性和自动注入不足 | 将 build/test summary 纳入 loop context |
| 文件变更归因 | 判断 human vs Agent 修改 | 当前更多靠 git diff / 人工读取 | 增加 external change 提醒：相关文件需重读 |
| 异常检测 | 反复 patch、context 过长等 pattern | spec-debug 有 root-cause 纪律，但缺运行时 pattern detector | 先做轻量规则，不做复杂行为评分 |
| Skill 作用 | `tma1-peer` 是跨 Agent 上下文读取接口 | spec-first skill 多为 workflow 入口 | 增加 loop-facing skill，封装上下文读取 / 同步动作 |
| LFG / 全自动 | 文章不讨论全自动 LFG | LFG 在现有知识链中是实验入口 | 不默认结合；只作为受控实验 |
| 人的位置 | 人不再手动复制上下文，但仍做最终判断 | spec-first 有人工闸门 | 保留人工审查，不因 Loop 自动化删除 gate |

---

## 4. 关键差异

### 4.1 TMA1 是 Loop 感知层，不是 workflow 替代品

TMA1 的价值不在于重新定义 `plan/code/test/review`，而在于让这些阶段之间的状态不再靠人手动搬运。

这点对 spec-first 很关键：spec-first 已经有较完整的 workflow；如果直接新增一个“更自动的 LFG/LSF 工作流”，很容易造成入口膨胀和语义重叠。正确吸收点是 TMA1 的感知层：

```text
谁刚刚改了什么？
测试现在是什么状态？
另一个 Agent review 过什么？
当前 session 是否已经过长？
是否有人类在中途改了文件？
是否出现重复失败模式？
```

这些信息应该服务于 `spec-work`、`spec-code-review`、`spec-debug`，而不是替代它们。

### 4.2 多 Agent 协作不是群聊，而是结构化 handoff

文章明确反对群聊式 multi-agent coding。原因是成本高、噪声大、无效对话多。

spec-first 应吸收这个判断：多个 Agent 之间不应通过长对话同步，而应通过结构化 handoff：

```text
Agent A：plan / work / test
  ↓ 写入 session summary / touched files / verification / open questions
Agent B：通过 peer-context skill 读取最小必要上下文
  ↓ review / debug / audit
Agent C：按 review 结论继续 work 或 compound
```

这与 spec-first 的 artifact-summary、run artifact、docs/solutions 方向一致，但 TMA1 提醒要进一步贴近运行时：session、build、file change、tool call 也应成为 handoff 输入。

### 4.3 Loop 的核心是“可验证目标”，不是“更自动”

已有 `25.loop-harness-fde-analysis.md` 已经总结 Loop 工程的两个核心元素：触发器和可验证目标。TMA1 文章进一步说明：即使有了 workflow，如果 verify/test/review 的结果没有回流到下一轮行动，也不算真正闭环。

因此 spec-first 升级 Loop 时要避免两个反模式：

1. **目标模糊的自动循环**
   例如“帮我优化一下项目”，没有终止条件、预算上限和验证信号。

2. **没有观测注入的伪 Loop**
   虽然流程上写了 review → work，但 Agent 不知道 review 的具体结论、最新文件状态或测试结果。

真正的 Loop 应该满足：

```text
触发条件明确
目标可验证
运行状态可观测
结果能注入下一轮
失败能改变策略
终止条件和预算清晰
```

### 4.4 LSF/LFG Skill 不应成为默认全自动入口

如果用户说的 LSF 指的是某种 Skill 体系，那么结合方向是合理的：Skill 可以封装 repeatable loop actions，比如读取 spec、同步 peer session、检查测试状态、生成 drift summary。

但如果指的是当前知识链中的 LFG skill，则不建议直接默认结合。原因：

- LFG 是“全自动工程工作流”，已有文档中明确为实验入口；
- spec-first 的优势是 staged workflow + evidence governance + human gate；
- 直接 LFG 化可能绕过 spec-first 的阶段纪律；
- 自动化越强，越需要成本上限、可观测性和人工审查，否则会引入认知负债。

所以推荐路线是：**先做 Loop Context Skill，再讨论是否让 LFG 消费这些上下文做受控实验。**

---

## 5. 知识链收束

### 5.1 与 #25 Loop / Harness / FDE 报告的关系

已有 #25 报告把 Loop 定义为 Harness 之上的自驱动系统，核心构件包括：

- 自动化触发；
- 创作者-检验者分离；
- 连接器；
- 隔离工作区；
- 持久化记忆。

TMA1 v2 给这套理论补上一个非常具体的工程形态：

```text
连接器：MCP server / build watch / peer session
持久化记忆：session log / tool call / touched files
创作者-检验者分离：Claude Code work + Codex review
自动化触发：hook events / build watch / context injection
隔离与归因：external changes / human vs Agent file attribution
```

因此 TMA1 可作为 #25 的“Loop 运行时观测层”案例。

### 5.2 与 Compound Engineering skill 体系的关系

`ce-exposed-skill-commands-2026-04-26.md` 已指出 CE / spec-first 的默认入口应收敛为：

```text
setup → brainstorm → plan → tasks → work → review → ship → learn
```

TMA1 不要求新增一个并列入口，而是要求这些入口之间共享运行时上下文。

可对应为：

| 主入口 | 可消费的 Loop Context |
| --- | --- |
| spec-plan | 当前 spec、历史 plan、peer ideation、约束、open questions |
| spec-work | 当前 task、recent files、external changes、build/test status |
| spec-code-review | touched files、verification summary、peer work session、diff impact |
| spec-debug | last error、重复失败模式、recent patches、test history |
| spec-compound | final outcome、失败-修复链路、可复用经验、待沉淀规则 |

### 5.3 与 CodeGraph / Graphify 的关系

前两篇已归档文章给出两条相关链路：

- CodeGraph：降低代码库探索 Token，作为代码导航雷达；
- code-to-spec：从代码中反向提取规范，形成 reverse spec 候选。

TMA1 则补上第三条链路：

- Loop Context：把运行时事实、Agent 行为和外部变化注入下一轮行动。

三者组合后，spec-first 的升级方向可以表达为：

```text
CodeGraph / Graphify：让 Agent 知道代码结构
Code-to-Spec：让 Agent 知道代码背后的规范候选
TMA1-style Loop：让 Agent 知道刚刚发生了什么、下一步该注意什么
spec-first：负责阶段纪律、证据治理和知识 promotion
```

### 5.4 推荐的 spec-first Loop Context 模型

建议引入一个抽象产物或上下文块，暂名：

```text
<spec-loop-context>
```

包含：

```yaml
project: ...
session:
  id: ...
  duration: ...
  token_usage: ...
current_workflow:
  name: spec-work | spec-code-review | spec-debug
  current_spec: ...
  current_task: ...
recent_files:
  touched: []
  reviewed: []
  external_changed: []
verification:
  build_status: pass | fail | running | unknown
  test_status: pass | fail | not-run | unknown
  last_error: ...
peer_context:
  source_agent: claude_code | codex | cursor
  latest_summary: ...
  open_findings: []
anomalies:
  - type: repeated_patch_same_error
    severity: medium
    recommendation: change_strategy
next_recommended_action:
  - reread_external_changed_files
  - run_targeted_test
  - ask_human_for_scope_decision
```

这个上下文块不应替代 `spec-work-run-artifact`、`verification-run-summary` 或 `docs/solutions`，而应作为运行时 handoff / injection 的摘要层。

---

## 6. 分级建议

### P0：立即采纳的判断

1. **不要把 Loop 升级理解为直接接入 LFG 全自动工作流**
   spec-first 的主线仍应是 staged workflow + evidence governance。LFG / LSF 若存在，应先作为受控实验或内部能力，不默认替代 `spec-plan/spec-work/spec-review`。

2. **先补 Loop Context，而不是新增主入口**
   当前最缺的是运行时上下文自动回流：build/test、peer session、external changes、anomalies。新增一个大 workflow 解决不了这个问题。

3. **跨 Agent 协作走 peer context，不走群聊**
   参考 `tma1-peer`，做结构化 session summary / latest review / touched files / open findings，而不是让多个 Agent 互相长对话。

4. **保留人工闸门**
   Loop 自动化不应删除 spec-first 的关键人工审查节点。文章解决的是上下文同步，不是最终责任归属。

### P1：建议设计的能力

1. **新增 `spec-loop-context` 摘要层**
   聚合当前 workflow、spec/task、recent files、verification、peer context、external changes 和 anomalies。

2. **新增 peer session skill / primitive**
   类似 `tma1-peer`，但抽象为能力类别，例如：读取最近 Claude/Codex/Cursor session 的结构化摘要、review 结论和 touched files。

3. **将 build/test 状态注入 `spec-work` 与 `spec-debug`**
   当测试失败或错误未变化时，提示重新分析根因，而不是继续机械 patch。

4. **将 review 结论注入下一轮 work**
   `spec-code-review` 输出的 open findings 应成为下一轮 `spec-work` 的显式输入，而不是靠人复制。

### P2：后续实验方向

1. **让 LFG / LSF 消费 Loop Context 做受控实验**
   在限定任务、限定预算、限定验证目标下，让 LFG/LSF 尝试自动完成小型闭环任务。不得默认用于高不确定性需求。

2. **建立 anomaly rule catalog**
   例如 repeated_patch_same_error、context_too_long、external_change_unread、review_findings_unaddressed、test_not_run_but_claimed。

3. **建立 Loop 成本与认知负债指标**
   记录 token、tool calls、自动化轮次、人工介入次数、review 漏判、重复失败次数，避免“自动化看起来很爽，但没人知道系统在干什么”。

4. **对接 CodeGraph / reverse spec**
   当 Loop Context 中出现影响面不清或 spec drift 时，可调用 code-graph 能力获取候选，再用 code-to-spec / reverse spec 做偏差分析。

### 最终建议

**spec-first 应该升级 Loop，但不应直接 LFG 化。**

正确路径是三步：

```text
第一步：补 Runtime Observation / Loop Context
第二步：用 Skill/MCP 暴露 peer session、build/test、external change、anomaly 等接口
第三步：让 spec-work / spec-review / spec-debug 按需消费这些上下文
```

如果未来要跟 LSF/LFG Skill 结合，建议定位为：

```text
LSF/LFG Skill = Loop 中的可调用动作或受控实验入口
spec-first = Loop 的目标、边界、证据和人工闸门
Loop Context = 二者之间的运行时事实接口
```

一句话收束：

> spec-first 升级 Loop 的关键，不是让 Agent 更自动地跑，而是让每一轮自动行动都看见真实工程现场；LSF/LFG Skill 可以参与，但只能做受控动作接口，不能替代 spec-first 的阶段纪律和证据治理。
