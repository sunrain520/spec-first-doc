<!-- spec-first:lang:start -->
## 语言与治理策略

**语言设置：** `Chinese / 中文`

- 默认用中文生成回复、状态更新、澄清、生成文档、需求/计划/任务、评审、总结、变更说明和 commit/PR 文案；用户明确要求翻译、双语或其他语言时例外。
- 输入、工具输出或引用材料可保留原文；新生成的说明和结论仍按语言设置输出。
- 代码标识符、命令、路径、配置键、环境变量、API/协议名保持原文；常见英文技术术语可混用。
- 新增代码注释使用中文，只说明非显然意图。

### Changelog
- 任何项目 source 新增、删除或修改，都必须同步更新根目录 `CHANGELOG.md`；记录格式以仓库现行格式为准。
- `作者` 使用全局 developer profile：统一读 `~/.spec-first/.developer`；缺失时先运行 `spec-first init` 并按引导选择开发者姓名与语言。
- 用户可见变更追加 `(user-visible)`；缺少对应记录时，拒绝生成 source 变更。
<!-- spec-first:lang:end -->

<!-- spec-first:bootstrap:start -->
## Workflow 入口治理

- 本 block 是 using-spec-first 的最小入口锚点(随会话启动注入,启动即在场);完整路由表、边界细节和例外仍在 `skills/using-spec-first/SKILL.md`
- **何时进入 workflow**:substantial work（改代码/docs/config/runtime asset、启动 implementation/debug/review/plan/setup/update/optimization/知识沉淀、运行改状态命令、架构/prompt/workflow/contract 决策、durable knowledge 增删）前先判断是否进入公开 spec-first workflow
- **何时直接做**:轻量事实问答、当前上下文解释、窄定位查询（where is X used）、当前对话/用户给定单文档整理可直接回答或 bounded read;workflow-first 不等于 brainstorming-first
- **何时不重新分流**:已在公开 workflow 内（按其 SKILL 继续,仅在用户改目标/显式 handoff/明显越界时重路由）或作为 bounded subagent/worker 被派遣（完成 bounded 任务即可,不重启路由)
- **如何路由**:意图优先于关键词与主题域;用户显式调用当前 host 公开 workflow 时优先尊重;否则只选一个入口并说明一个理由,不默认进入 `spec-brainstorm`,不自动串联多个 workflow
- **常见入口锚点**:setup/runtime→`/spec:mcp-setup` 或终端 `spec-first update`;失败→`/spec:debug`;评审→`/spec:code-review`/`/spec:doc-review`;定义→`/spec:ideate`/`/spec:brainstorm`/`/spec:prd`;优化→`/spec:optimize`;计划/执行→`/spec:plan`/`/spec:work`;知识→`/spec:compound`/`/spec:compound-refresh`;完整 map 查 SKILL
- 用户可见输出语言以本文件的 `spec-first:lang` managed block 为准；skill/agent/template 原文语言和当前会话惯性不得覆盖该策略，除非用户明确要求其他语言
- 父级多仓 workspace：写入、修复、测试、review autofix 或 commit 前必须有明确 `target_repo` / per-child scope；只读定位也应使用 bounded direct reads 并说明目标 repo 假设
- Runtime context 默认排除 `.spec-first/audits/**`、`.spec-first/governance/**` 和 generated mirrors（`.claude/**`、`.codex/**`、`.agents/skills/**`）;只有 setup/update/runtime-drift/audit/governance-health 等明确运行时任务按需读取
- 架构/prompt/workflow/contract 或 source/runtime 判断前按需读取 `docs/10-prompt/结构化项目角色契约.md`;scripts/tools 只产 deterministic facts,LLM 做语义路由判断
- **反合理化红旗**(出现这些念头即停):「先改个文件就好」→ 先判断是否 work/debug/update/compound-refresh;「只是个快速架构/prompt 改动」→ 架构/prompt/workflow/contract 改动算 substantial;「得先看一堆文件再决定」→ 只做最小事实核查,已清晰则直接路由;「该评审但我口头答就行」→ 评审目标具体时用 code-review/doc-review;「helper skill 存在所以该暴露」→ 只有公开 workflow 是用户入口,internal helper 隐藏
- Claude workflow 入口使用 `/spec:*`
- 不要把 `using-spec-first` 本身当作 command-backed workflow；不要直接暴露 internal-only skills,例如 `git-worktree`

<!-- spec-first:bootstrap:end -->

<!-- spec-first:coding-guidelines:start -->
## 编码执行准则

### 1. 编码前思考

**不要假设。不要隐藏困惑。呈现权衡。**

LLM 经常默默选择一种解释然后执行。这个原则强制明确推理：

- 明确说明假设：如果不确定，询问而不是猜测。
- 呈现多种解释：当存在歧义时，不要默默选择。
- 适时提出异议：如果存在更简单的方法，说出来。
- 困惑时停下来：指出不清楚的地方并要求澄清。

### 2. 简洁优先

**用最少的代码解决问题。不要过度推测。**

对抗过度工程的倾向：

- 不要添加要求之外的功能。
- 不要为一次性代码创建抽象。
- 不要添加未要求的“灵活性”或“可配置性”。
- 不要为不可能发生的场景做错误处理。
- 如果 200 行代码可以写成 50 行，重写它。

检验标准：资深工程师会觉得这过于复杂吗？如果是，简化。

### 3. 精准修改

**只碰必须碰的。只清理自己造成的混乱。**

编辑已有代码时：
- 不要“改进”相邻的代码、注释或格式。
- 不要重构没坏的东西。
- 匹配现有风格，即使你更倾向于不同的写法。
- 如果注意到无关的死代码，提一下，不要删除它。

当你的改动产生孤儿代码时：
- 删除因你的改动而变得无用的导入 / 变量 / 函数。
- 不要删除预先存在的死代码，除非被要求。

检验标准：每一行修改都应该能直接追溯到用户的请求。

### 4. 目标驱动执行

**定义成功标准。循环直到验证通过。**

将指令式任务转化为可验证的目标：

- “添加验证” → “为无效输入编写测试，然后让它们通过”
- “修复 bug” → “编写重现 bug 的测试，然后让它通过”
- “重构 X” → “确保重构前后测试都能通过”

对于多步骤任务，说明一个简短的计划：
```
1. [步骤] → 验证: [检查]
2. [步骤] → 验证: [检查]
3. [步骤] → 验证: [检查]
```

强有力的成功标准让 LLM 能够独立循环执行。弱标准（“让它工作”）需要不断澄清。
<!-- spec-first:coding-guidelines:end -->

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- Use Graphify first only for architecture relationships, cross-file relationships, impact analysis, broad codebase navigation, or questions about how one project area connects to another, when `graphify-out/graph.json` exists and a Graphify CLI is runtime-visible. Resolve the command as `graphify` from `PATH`, or `$HOME/.local/bin/graphify` (`.exe`/`.cmd` on Windows) when that executable exists. Then run `"<resolved-graphify>" query "<question>"`; use `path "<A>" "<B>"` for relationships and `explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Do not use Graphify by default for simple factual Q&A, current conversation or context summaries, user-provided single-document summarization/editing, or already-scoped file reads; answer directly, use `rg`, or perform bounded source reads.
- If `graphify-out/graph.json` exists but no Graphify CLI is visible, do not treat the artifact as runtime readiness. Use bounded direct source reads and mention `/spec:mcp-setup --only graphify` as the setup repair path when Graphify would help.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- Treat Graphify/code-graph output as `provider_untrusted` advisory navigation; confirm important conclusions from source/test/log/doc evidence and record limitations when confirmation is unavailable.
- Ordinary workflows do not refresh project graphs after code changes. Treat graph freshness as a setup/readiness advisory from `docs/contracts/project-graph-consumption.md`; confirm conclusions from source/test/log evidence and use `/spec:mcp-setup --only graphify` when setup repair would help.
