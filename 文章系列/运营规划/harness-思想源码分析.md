---
name: harness-thought-source-analysis
description: Harness 思想如何在文章系列中展示——结合 spec-first 项目源码（docs/contracts、skills、src/cli）对六层 Harness + 核心边界的深度分析与源码取证，作为枢纽文（02 从 Workflow 到 Harness）与第三季细节季的权威素材底座。
metadata:
  type: reference
---

# Harness 思想如何展示：结合 spec-first 源码的深度分析

> 本文回答两个问题：**Harness 思想在文章系列里如何展示？** 以及 **它在 spec-first 源码里到底怎么落地？** 全部结论附真实源码出处（`docs/contracts/`、`skills/`、`src/cli/`），不是二手转述。素材来源仓库：`/Users/kuang/xiaobu/spec-first`。

---

## 〇、为什么 Harness 是整个系列的内核

第一季 02 篇把 spec-first 重新定位为 **AI Coding Harness**。这个词是整个系列的承重墙——后面每一篇（无论实操还是细节）本质都在展开六层 Harness 中的某一层。

但"Harness"极易被讲空。讲空的版本是："它是一套让 AI 更可靠的工程框架。"——正确但没有信息量，读者记不住。

**真正立得住的展示方式，是回到源码：** Harness 不是一个抽象理念，它是 56 行的 `docs/contracts/ai-coding-harness.md` 契约 + 33 个 skill 源码 + 一批 schema 和脚本共同固化下来的**可验证边界**。把这些源码细节摆出来，"Harness" 才从形容词变成名词。

权威定义只有一处，且极短（这本身就是 spec-first "light contract" 哲学的体现）：

```text
docs/contracts/ai-coding-harness.md（全文 56 行）
核心链路：Codebase → Spec → Plan → Tasks → Code → Review → Knowledge
六层：Context / Execution / Evidence / Evaluation / Governance / Knowledge
6 条边界规则 + 5 条 Direct Evidence Lanes
```

---

## 一、贯穿全系列的展示主线：一句话内核

无论讲哪一层，都回到同一句话——它是 Harness 思想的真正内核，也是源码里反复出现的那条边界：

> **Scripts prepare deterministic facts；LLM workflows decide semantic meaning.**
> 脚本只产确定性事实（路径、schema 有效性、hash、readiness、reason_code、退出码）；
> LLM 只做语义判断（scope、架构取舍、finding 是否成立、root cause、降级证据够不够）。

这一条不是口号——它被脚本输出的字段语义 + SKILL.md 的禁令**共同强制执行**。源码铁证（来自 `skills/spec-mcp-setup`）：

- `scripts/provider-readiness-renderer.cjs` 把 provider 自报的 `fresh` **强制降级为 `unknown`**，每条记录挂 `source_read_required: true` 和 `limitations: ['provider readiness is advisory; fresh self-reports map to unknown until confirmed by source/test/log evidence']`。
- 脚本只判断可机器验证的事实：命令在不在 `PATH`、版本是否匹配 pin、`graphify-out/` 文件存不存在、git hook 装没装、退出码。它**从不判断"索引内容对不对"**。
- `SKILL.md` 第 23 行写死边界：`scripts prepare deterministic readiness facts; LLM workflows decide how to use those facts. Setup must not make semantic code-understanding judgments`。

> **展示要点：** 这是整个系列最该反复敲的一根钉子。脚本廉价、可重复、不幻觉，干"装没装/匹不匹配/存不存在"；LLM 不可替代，干"够不够/成不成立/算不算根因"。Harness 把 LLM 装进可靠工程框架的方式，就是**精确切分这两类计算的归属**——这正是 harness（承载框架）和 engine（中心化引擎）的根本区别。

---

## 二、六层 Harness：逐层的源码落地与展示角度

每一层给出：核心一句 → 源码铁证（killer example）→ 文章怎么展示。

### 2.1 Context Harness · 上下文层

**核心：** 给 LLM 有界、相关、可追溯的上下文，不广播整个 repo / generated runtime / raw dump。边界由脚本（算 path/budget/reason_code）和 LLM（算语义相关性）分工固化。

**源码铁证：** `src/cli/helpers/context-bundle.js` 的 `classifyPath()`——同一个函数里，一条路径要么进 `included[]`（带 source + reason + tokens_estimated），要么进 `excluded[]`（带 kind + reason_code + reason），**绝不被静默丢掉**。`.claude/settings.json` 这种 generated mirror 不是"搜不到"，而是被显式打上 `generated_runtime_mirror_excluded` 拦在门外；预算超限也不静默截断，而是把溢出路径转成 `context_budget_exceeded` 的 excluded 条目，并把整个 bundle 标 `degraded / confidence=low`。`tests/unit/context-bundle-contracts.test.js` 用 contract test 把 `excluded_context[0].reason_code === 'runtime_audit_artifact_excluded'` 锁死，防止有人把 runtime artifact 重新描述成普通上下文。

**展示角度（对比 + 失败场景）：** naive agent 用 `rg --files` 把整个 repo 灌进 prompt，又贵又被 generated 噪声带偏；spec-first 先用确定性脚本把这些路径打 reason_code 拦门外。失败场景：generated mirror 是 source 的镜像，模型若读 mirror 去改 bug 会改错地方。落点——"有界"不靠模型自觉（模型会偷偷读全量），而靠脚本算确定性事实、LLM 只做语义相关性。

### 2.2 Execution Harness · 执行交接层

**核心：** 在 Spec→Plan→Tasks→Code→Review 间传递 scope、task identity、handoff evidence，**但不变成状态机**。

**源码铁证：** `spec_id` 与 `source_plan_hash` 的"分工切割"（`skills/spec-write-tasks/references/task-pack-schema.md`）——两个 frontmatter 字段、两套正交语义、两种拒绝码。`spec_id` 答"是不是同一条 spec 链"（从 source plan 复制下来，明确 `is not part of freshness`）；`source_plan_hash` 答"是不是还派生自当前 plan 正文"（规范化 body hash 算 sha256）。于是 spec-work 拿到 task pack：spec_id mismatch 报 `wrong_chain`（链错，重建），hash mismatch 报 `stale`（链对但过期，重编）。`spec-id-traceability.md` 纲领句：`It is not a workflow state, approval marker, progress database... it carries identity across Spec→Plan→Tasks→Code without becoming workflow state`。

**展示角度（对比）：** 先画开发者脑中默认会建的"中心化进度数据库/状态机"（谁审批了、跑到第几步），再展示 spec-first 故意不建它。失败场景最有力：一个 task pack hash 对得上但 spec_id 对不上（从另一条需求线复制改出来的），状态机会因"看起来很新"放行，而 spec-first 因身份与新鲜度分离直接判 wrong-chain 拒绝。落点——"传递连续性" ≠ "持久化状态"。

### 2.3 Evidence Harness · 证据层

**核心：** 每条证据带"出处 + 新鲜度 + 可信等级"，结论默认不可信；advisory 候选只能指路、不能定论。

**源码铁证：** 同一份 project-graph，`readiness_status=stale` 时被**精确切成两半**（`docs/contracts/project-graph-consumption.md`）——指路的那半（exploration-tier，决定先看哪个文件）还活着，定论的那半（conclusion-tier，review finding / root-cause / 合并结论）被吊销，后者无论如何要从源码重新落地。配套 Relay Chain 硬规则封死唯一漏洞：`no skip-layer elevation`——候选证据不经下层（源码/测试/日志）确认，不允许跳级进结论。freshness 绑 `generated_at` 而非文件存在性；finding envelope 强制写 `confidence` / `requires_verification` / `limitations`；`verification-evidence.schema.json` 强制 `captured_at` + `status`。

**展示角度（信任分级 + 不可跳级）：** 把同一份代码图在 fresh / stale / unknown 三种新鲜度下"能做什么、不能做什么"画成分级表（证据可信度是连续光谱而非二值）。失败场景：AI 拿 call-graph 的"看起来很对"的输出直接写进 root-cause（skip-layer elevation），展示 spec-first 如何在合同层堵死。落点——不是"让 AI 更准"，而是"让 AI 的话天然带可信标签，人一眼分清哪些可质疑、哪些已验证"。

### 2.4 Evaluation Harness · 评估层

**核心：** 用聚焦检查 + advisory quality gate + decision-linked metric 记录系统是否真变好，**而非只看使用次数**。

**源码铁证：** `scripts/run-ai-dev-quality-gate.js` 一行 `const blockingChecks = checks.filter((check) => check.advisory !== true)`——gate 的 `passed` 只看非 advisory 的 blockingChecks。benchmark fixtures 整套挂在 gate 上，但 schema（`quality-gates/ai-dev-benchmark-fixtures-result.schema.json`）把它的 `advisory` 写成 `const: true`、`validation_commands_status` 写成 `const: 'declared_only'`。**即便所有 benchmark fixture 失败，gate 仍 pass**，失败只被 `quality-feedback.js` 转成带 `scope_hint` + `artifact_path` 的 `candidate_topic`（source 固定 `passive-quality-feedback`），等下游 self-reflection workflow 认领。`spec-optimize` 那句 `more clusters does not mean better clusters` 直接戳破代理指标幻觉。

**展示角度（对比 + 失败场景）：** 传统 dashboard 记"gate 跑了 N 次 / 通过率 95%"，spec-first 根本不存使用次数——它存"哪条 check 失败（check_id）、reason_code、证据 artifact 在哪、谁该接手（scope_hint）"。失败场景：benchmark 全挂但 gate 照样绿灯，读者第一反应"那要它干嘛"，再揭示——失败被转成可行动的议题进入下一轮升级输入。落点：metric → reason_code → 决定（merge/revert/route/upgrade），一条可追溯因果链。

### 2.5 Governance Harness · 治理层

**核心：** 同一份能力交付给 Claude 和 Codex 两个宿主，用"source 拥有行为、generated runtime 只镜像投递、provider 只供证据"的**单向边界**消除双真相源和手改 mirror 的漂移。

**源码铁证：** 同一个 workflow skill `spec-doc-review` 在 `src/cli/contracts/dual-host-governance/skills-governance.json` 里只是一条 `entry_surface=workflow_command` 的源层事实，但 `host_delivery` 写着 `{claude: "command", codex: "skill"}`：于是 `spec-first init` 在 Claude 生成 `.claude/commands/spec/doc-review.md`（slash command），在 Codex 只生成 `.agents/skills/spec-doc-review/`（**绝不生成 `.codex/commands/spec/*`**）。同一份源码，两份截然不同的 generated mirror，全由一条 JSON 记录决定。想改 Codex 入口形态，手改 `.codex/` 无效，必须改这条记录再 `init` 重建。`source-runtime-customization-boundary.md`：drift report `is evidence that source and runtime may need reconciliation; it is not permission to patch the mirror directly`。

**展示角度（失败场景 + 机制对比）：** 失败线——开发者手改 `.claude/commands/spec/xxx.md` 修 bug，下次别人 `spec-first init` 改动被覆盖回滚（读者立刻 get"为什么 mirror 不能当 source"）。机制线——拿 `spec-doc-review` 一条记录 → 两宿主不同产物的分叉图。落点：source 拥有行为、runtime 只镜像、provider 只供证据（advisory），三条单向边界合起来就是 mutation gate。

### 2.6 Knowledge Harness · 知识沉淀层

**核心：** 只沉淀"已验证、可复用、可失效"的经验进 `docs/solutions/`，通过结构化 frontmatter + grep/summary-first 按需检索 + **非命令式可发现性提示**让它"被发现而非被强制预读"。

**源码铁证：** `spec-compound` 的 Discoverability Check 给 `AGENTS.md`/`CLAUDE.md` 加的注释，**刻意写成描述式** `relevant when implementing or debugging in documented areas` 而非命令式 `check before implementing`——SKILL.md 明确解释原因：`Imperative directives... cause redundant reads when a workflow already includes a dedicated search step`。配套：promote 必填 `invalidation_condition`（可失效）+ `source_refs`（可回源）；recall 命中只是 advisory candidate，必须回 `source_refs` 确认才升 confirmed；Related Docs Finder 用 grep-first 先过滤 frontmatter（`module`/`tags`/`applies_when`）再读全文，不预加载整个知识库。

**展示角度（对比）：** (A) 强制每个 workflow 启动预读整个 `docs/solutions/`——context 爆炸、冗余读、把陈旧经验当真理；(B) spec-first——沉淀端 verified gate 只收高质量经验，检索端 grep-first 精确命中，信任端命中标 advisory 必须回源，可发现端非命令式提示让 agent 自己决定何时查。最杀的细节就是那行"刻意不写成命令式"的注释——它证明设计者真正想清楚了"可发现 ≠ 强制预读"。落点呼应系列主线：让每次任务都让下一次任务更容易，靠的是 awareness 触发而非硬性预读指令。

---

## 三、在系列里怎么编排（不是六篇平铺）

Harness 思想已经分散落在三季里，不需要也不应该单开"六层逐篇讲"——那会变成枯燥的契约朗读。正确的编排是**一篇立骨架，其余篇做侧面印证**：

| 位置 | 怎么承载 Harness 思想 |
|---|---|
| 第一季 02（枢纽） | **立骨架**：定义六层 + 核心边界（Scripts/LLM），给全系列统一坐标系。这是唯一系统讲六层的地方。 |
| 第一季 04/05 | 已下沉 Context（04）与 Evidence（05）两层的输入地基。 |
| 第二季实操（op-01~07） | **侧面印证**：每个 skill 跑链路时，自然踩到对应层（work→Execution、code-review→Evaluation/Evidence、compound→Knowledge）。不点破"这是第 N 层"，让读者在实操里体感。 |
| 第三季细节（s3-xx） | **逐层深挖**：每个 skill 剖析正是某一层的源码级展开（s3-01 setup→Governance/边界、s3-09 review→Evidence/Evaluation、s3-10 compound→Knowledge）。这里才是放本文源码细节的地方。 |

> **核心编排判断：** 六层不是六篇，而是一根贯穿三季的坐标轴。02 篇立轴，实操篇给体感，细节篇填源码。本文是细节篇的素材底座。

---

## 四、可复用的展示套路（每层通用）

从上面六层提炼出的、可直接套用到任何一篇的展示三步：

1. **先抛 naive 做法的失败**：开发者/普通 agent 默认会怎么做，会怎么翻车（读全量上下文、建状态机、拿图谱直接下结论、看通过率、手改 mirror、强制预读知识库）。
2. **再给 spec-first 的源码事实**：一个具体到字段/函数/reason_code 的机制（`classifyPath` 的 included/excluded、`spec_id` vs `hash` 双拒绝码、stale 图的两半切割、`advisory const:true`、`host_delivery` 一条记录两份产物、描述式注释）。
3. **最后落到同一句内核**：Scripts prepare facts, LLM decides——这一层是这条边界在某个维度的具体兑现。

三步走完，"Harness" 就从一个读者记不住的形容词，变成了一个有源码、有边界、有 reason_code 的工程名词。

---

## 五、给写作者的取证清单（写到对应主题时直接查源）

- 六层权威定义：`docs/contracts/ai-coding-harness.md`（56 行，全文精读）
- Context：`src/cli/helpers/context-bundle.js`、`docs/contracts/context-governance.md`、`context-bundle.md`、`tests/unit/context-bundle-contracts.test.js`
- Execution：`docs/contracts/workflows/spec-id-traceability.md`、`skills/spec-write-tasks/references/task-pack-schema.md`、`spec-work-run-artifact.schema.json`
- Evidence：`docs/contracts/project-graph-consumption.md`、`workflows/review-finding.md`、`verifiers/verification-evidence.schema.json`
- Evaluation：`scripts/run-ai-dev-quality-gate.js`、`src/verification/quality-feedback.js`、`quality-gates/ai-dev-benchmark-fixtures-result.schema.json`、`skills/spec-optimize`
- Governance：`docs/contracts/source-runtime-customization-boundary.md`、`dual-host-governance/README.md`、`src/cli/contracts/dual-host-governance/skills-governance.json`
- Knowledge：`docs/contracts/knowledge/knowledge-harness.md`、`skills/spec-compound/SKILL.md`、`skills/spec-compound/references/schema.yaml`
- 核心边界：`skills/spec-mcp-setup/scripts/provider-readiness-renderer.cjs` + `SKILL.md`、`skills/spec-code-review/scripts/resolve-base.sh` + `SKILL.md`

> 所有引用写进正文前，按 `docs/contracts/ai-coding-harness.md` 第 31 条做 redaction：raw diff、credentialed URL、token、internal hostname、完整 private route dump 不进文章。
