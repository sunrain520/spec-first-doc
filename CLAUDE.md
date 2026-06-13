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

- 本 block 是 using-spec-first 的核心决策集(随会话启动注入,启动即在场);完整路由策略与细节仍在 `skills/using-spec-first/SKILL.md`
- **何时进入 workflow**:substantial work（改代码/docs/config/runtime asset、启动 implementation/debug/review/plan/setup/update/optimization/知识沉淀、运行改状态命令、架构/prompt/workflow/contract 决策、durable knowledge 增删）前先判断是否进入公开 spec-first workflow
- **何时直接做**:轻量事实问答、窄定位查询（where is X used）、无 workflow 增益的简短解释可直接回答;workflow-first 不等于 brainstorming-first,不强制每个任务走 workflow
- **何时不重新分流**:已在公开 workflow 内（按其 SKILL 继续,仅在用户改目标/显式 handoff/明显越界时重路由）或作为 bounded subagent/worker 被派遣（完成 bounded 任务即可,不重启路由)
- **如何路由**:意图优先于关键词与主题域;选一个入口并说明一个理由,不默认进入 `spec-brainstorm`,不自动串联多个 workflow;用户显式调用某 workflow 时优先尊重;用户询问下一步时用 `using-spec-first` guide mode 给一个入口、一个理由、一个动作
- **优先级(高→低)**:显式 route > 安全/修复(setup/update/缺 runtime) > 诊断(debug 先于 work,针对失败) > 评审(code/doc review 先于实现) > 定义(brainstorm/ideate/prd 先于 plan/work,WHAT 不清时) > 优化(可度量实验) > 执行(plan 先于 work) > 知识(compound/compound-refresh)
- 父级多仓 workspace：写入、修复、测试、review autofix 或 commit 前必须有明确 `target_repo` / per-child scope；只读定位也应使用 bounded direct reads 并说明目标 repo 假设
- Runtime context 默认排除 `.spec-first/audits/**` 和 generated mirrors（`.claude/**`、`.codex/**`、`.agents/skills/**`）;只有 setup/update/runtime-drift/audit 等明确运行时任务按需读取
- **反合理化红旗**(出现这些念头即停):「先改个文件就好」→ 先判断是否 work/debug/update/compound-refresh;「只是个快速架构/prompt 改动」→ 架构/prompt/workflow/contract 改动算 substantial;「得先看一堆文件再决定」→ 只做最小事实核查,已清晰则直接路由;「该评审但我口头答就行」→ 评审目标具体时用 code-review/doc-review;「helper skill 存在所以该暴露」→ 只有公开 workflow 是用户入口,internal helper 隐藏
- Claude workflow 入口使用 `/spec:*`
- 不要把 `using-spec-first` 本身当作 command-backed workflow；不要直接暴露 internal-only skills,例如 `git-worktree`
- 入口映射(意图→入口):环境/MCP/host readiness→`/spec:mcp-setup`;版本检查/刷新 runtime→终端运行 `spec-first update`;bug/失败/栈→`/spec:debug`;代码/PR/diff 评审→`/spec:code-review`;需求/计划/markdown 文档评审→`/spec:doc-review`;skill/agent 资产审计→`/spec:skill-audit`;app/PRD 一致性审计→`/spec:app-consistency-audit`;0-1 产品想法/要选项→`/spec:ideate`;定义 WHAT/问题框定→`/spec:brainstorm`;存量系统 PRD 撰写/校验→`/spec:prd`;可度量优化实验→`/spec:optimize`;目标清晰需执行计划→`/spec:plan`;计划拆任务→`spec-write-tasks`;计划/任务就绪可执行→`/spec:work`;沉淀已解决问题→`/spec:compound`;刷新/订正既有 docs/learnings→`/spec:compound-refresh`;过往 session 检索→`/spec:sessions`;发布说明→`/spec:release-notes`
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
