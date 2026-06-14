---
title: 需求分析归档中的业界分析文档迁移计划
type: refactor
status: completed
date: 2026-06-14
spec_id: 2026-06-14-002-docs-industry-learning-requirements-migration
target_repos:
  - spec-first-doc
  - spec-first
---

# 需求分析归档中的业界分析文档迁移计划

## Summary

本计划将 `spec-first:docs/01-需求分析/` 中混杂的业界分析、竞品对标、外部方法借鉴和能力映射类文档，二次迁入 `spec-first-doc:业界学习/`。执行阶段需要先冻结迁移清单，再移动文件、删除 `spec-first` 中已迁移的源文件、修正导航和活跃链接，并在两个仓库分别更新 `CHANGELOG.md`。

---

## Decision Brief

- **推荐方案：** 先做保守分类，再执行迁移。只迁移主旨为外部研究、业界学习、竞品比较、方法借鉴或能力映射的文档；纯内部需求、实现方案、任务清单和治理史料留在 `spec-first`。
- **关键决策：** 在 `业界学习/02-对标研究/` 和 `业界学习/03-机制分析/` 下按主题补充子目录，不把 40+ 候选文档平铺到已有目录；同时在 `99-历史归档/` 保存 old path 到 new path 的迁移清单。
- **验证重点：** 核对 manifest、目标文件存在、源文件删除、README 覆盖、相对链接可解析，以及两个仓库不再有指向已删除源路径的活跃 Markdown 链接。
- **主要风险：** 误迁内部实现历史。执行阶段必须把候选列表当作“待复核集合”，对边界文件做内容抽样后再决定迁移或保留。

---

## Problem Frame

上一轮已经把 `spec-first:docs/09-业界借鉴/` 迁入 `spec-first-doc:业界学习/`，并按 `01-外部文章`、`02-对标研究`、`03-机制分析`、`04-能力映射`、`99-历史归档` 建立了目标目录。`spec-first:docs/01-需求分析/` 仍保留了一批以业界分析和外部方法借鉴为主的历史材料，这些文档继续留在需求归档中会削弱 `业界学习/` 作为长期学习资料入口的完整性。

用户明确要求“先规划，后执行”。本文件只完成规划；迁移动作需要用户确认后进入 `$spec-work` 执行。

---

## Requirements

- R1. 识别并迁移 `docs/01-需求分析/` 中主旨为业界学习、竞品分析、外部方法比较或能力映射的文档。
- R2. 不迁移主旨为内部实现计划、需求捕获、source-of-truth 设计历史、任务验收清单或当前治理史料的文档。
- R3. 迁移后的资料必须在 `spec-first-doc:业界学习/` 下可发现，并沿用已有分类体系。
- R4. 迁移完成后删除 `spec-first` 中对应源文件，并修正活跃链接，避免当前文档指向已删除路径。
- R5. 用迁移清单保留旧路径到新路径的可追踪关系，并记录边界文件的迁移/保留理由。
- R6. 两个仓库的文档变更都必须更新根 `CHANGELOG.md`；作者使用 `leokuang`，用户可见迁移记录追加 `(user-visible)`。
- R7. 执行完成后必须通过文件数量核对、链接检查、旧路径搜索、源文件删除检查和 `git diff --check`。

---

## Assumptions

- A1. “迁移”沿用上一轮约定：把选中文档迁入 `spec-first-doc` 后，删除 `spec-first` 中被迁移的源文件。
- A2. changelog 和历史归档中的旧路径可以作为历史记录保留；当前 README、导航和活跃 Markdown 链接需要更新到新位置。
- A3. 执行阶段不做全文可移植性改造；只修正指向已移动文件的链接、当前导航链接和明显失效路径。
- A4. 候选文件的最终分类允许在执行阶段根据内容抽样调整。

---

## Scope Boundaries

- 不迁移整个 `docs/01-需求分析/`。
- 不重写迁移文档正文，除非是必要的相对链接或旧路径修正。
- 不修改代码、运行时产物、generated mirrors、skills、agents 或测试。
- 不提交 commit、不建分支、不创建 PR，除非用户另行要求。
- 不回滚两个工作区中已有的无关 dirty 变更。

### Deferred to Follow-Up Work

- `spec-first:docs/01-需求分析/` 在业界材料移出后的整体清理，另起 docs-maintenance 任务。
- 历史研究文档中绝对本地路径的全面可移植性整理，另起 portability 任务。

---

## Direct Evidence Readiness

- target_repo: 本计划产物写入 `spec-first-doc`；执行阶段会同时触达 `spec-first-doc` 和 `spec-first`。
- path_notation: 本计划中的 `spec-first:path` 和 `spec-first-doc:path` 表示“仓库名 + 仓内相对路径”。
- evidence_sources: 直接读取、`find`、`rg`、`git status`、`git rev-parse`、目标 README 检查、`task-governance-signals`。
- source_refs:
  - `spec-first:docs/01-需求分析/README.md`
  - `spec-first:docs/01-需求分析/03.brainstorm-optimization/`
  - `spec-first:docs/01-需求分析/05.spec-graph-bootstrap/`
  - `spec-first:docs/01-需求分析/12.consistency-analysis/`
  - `spec-first:docs/01-需求分析/13.scale-integration/`
  - `spec-first:docs/01-需求分析/14.code-review/`
  - `spec-first:docs/01-需求分析/14.harness-engineering/`
  - `spec-first:docs/01-需求分析/14.prd-skill/`
  - `spec-first-doc:业界学习/README.md`
  - `spec-first-doc:业界学习/02-对标研究/README.md`
  - `spec-first-doc:业界学习/04-能力映射/README.md`
- current_revision:
  - `spec-first-doc`: `88762f0`
  - `spec-first`: `59d4bd15`
- worktree_status:
  - `spec-first-doc`: 规划前已存在上一轮迁移和文章系列相关 dirty 变更。
  - `spec-first`: 规划前已存在上一轮 `docs/09-业界借鉴/` 删除与链接更新相关 dirty 变更。
- confidence: 目标分类和候选目录判断为 medium-high；单个边界文件迁移判断为 medium，需要执行阶段抽样确认。
- limitations: 本轮未使用 subagents，因为用户未显式授权 subagents/personas/parallel reviewers；未做外部研究，因为任务是本地文档分类和迁移。

---

## Direct Evidence

- repo_scope:
  - `spec-first-doc`: 在 `业界学习/` 下创建或更新目标目录、README、迁移清单和 `CHANGELOG.md`。
  - `spec-first`: 删除已迁移源文件，更新 `docs/01-需求分析/README.md`、活跃链接和 `CHANGELOG.md`。
- source_reads_completed:
  - 已列出 `spec-first:docs/01-需求分析/` 下 Markdown 文件。
  - 已读取 `spec-first:docs/01-需求分析/README.md`，确认该目录定位为历史需求分析和探索材料。
  - 已读取目标 `业界学习` 相关 README，确认现有分类可承接本次迁移。
  - 已基于标题和关键词筛出业界、竞品、外部方法、SCALE、Harness、CodeGraph、Graphify、PRD、OpenSpec、Superpowers、Compound Engineering 等候选。
- source_reads_required:
  - 迁移前抽样阅读边界候选文件。
  - 修改 README 前读取对应目标段落的最新内容。
- commands_or_tools_used:
  - `find docs/01-需求分析 -type f -name '*.md'`
  - `find docs/01-需求分析 -maxdepth 3 -type d`
  - `rg` 业界分析相关关键词
  - `spec-first internal task-governance-signals --source plan-declared`
  - `git status --short`
  - `git rev-parse --short HEAD`
- impact_on_plan:
  - 工具判断本任务为 `candidate_level=deep`，原因是跨仓文档迁移、分类、链接修复、验证、评审和 changelog 更新。
  - 目标 taxonomy 已有 `harness-engineering`、`crg-graph`、`compound-engineering`、`prd-host-agent-os` 等锚点；只在无法准确承接时新增小目录。
- key_findings:
  - 强候选集中在 `03.brainstorm-optimization`、`05.spec-graph-bootstrap`、`12.consistency-analysis`、`13.scale-integration`、`14.code-review`、`14.harness-engineering` 和 `14.prd-skill`。
  - `docs/01-需求分析/` 中仍有大量纯内部实现计划和历史需求文档，必须保留在 `spec-first`。
- limitations:
  - 本计划只给出候选范围；最终迁移数量由执行阶段 manifest 冻结。

---

## Context & Research

### Relevant Structure and Patterns

- `spec-first-doc:业界学习/02-对标研究/` 已用于承接外部工具、方法和系统的对标资料。
- `spec-first-doc:业界学习/03-机制分析/` 已用于承接流程、评审、质量门禁等机制材料。
- `spec-first-doc:业界学习/04-能力映射/` 已用于承接 skill、agent、commit matrix 等映射材料。
- `spec-first-doc:业界学习/99-历史归档/` 适合存放旧索引、迁移说明和 old-to-new path 清单。
- `spec-first:docs/01-需求分析/README.md` 已说明该目录是历史设计材料，不是当前 source-of-truth。

### External References

- 本计划未使用新的外部资料；依据本地仓库证据和现有目标目录结构制定。

---

## Key Technical Decisions

- KTD1. **按文档主旨分类，不按关键词自动迁移。** 关键词只用于找候选；最终迁移决策看文档是否主要服务业界学习或外部方法借鉴。
- KTD2. **最小扩展目标 taxonomy。** 优先复用 `harness-engineering`、`crg-graph`、`prd-host-agent-os`、`03-机制分析` 和 `04-能力映射`；仅在主题明显不适配时新增 `scale-engine`、`workflow-systems`、`review-testing` 等小目录。
- KTD3. **`13.scale-integration` 作为候选组复核，不整目录盲迁。** 其中很多文件是 SCALE 外部研究，但 `Runtime-Setup` 和集成技术方案类文档可能更接近内部实现计划。
- KTD4. **先写迁移清单，再移动文件。** 清单应记录 old path、title、decision、target bucket 和 rationale，包括保留在源仓的边界文件。
- KTD5. **修正活跃链接，不重写所有历史提及。** 当前 README 和 Markdown 链接应指向新位置；changelog 和历史归档中的旧路径可作为历史证据保留。

---

## Open Questions

### Resolved During Planning

- 是否清理整个 `docs/01-需求分析/`？不清理。本次只迁移业界分析相关文档。
- 是否删除迁移后的源文件？是。用户前一轮已确认迁移后删除源目录，本次继续沿用迁移语义。
- 是否需要外部研究？不需要。本次是本地文档工程。

### Deferred to Implementation

- 最终迁移文件数：由执行阶段抽样和 manifest 决定。
- `13.scale-integration/Runtime-Setup目标.md`、`13.scale-integration/CodeGraph技术方案.md`、`13.scale-integration/spec-first内化集成scale-project-scaffold技术方案.md` 是否迁移：执行阶段按“业界派生分析”还是“内部技术计划”抽样判断。

---

## Output Structure

预期在 `spec-first-doc:业界学习/` 下新增或更新：

```text
业界学习/
  02-对标研究/
    crg-graph/
    harness-engineering/
    prd-host-agent-os/
    scale-engine/
    workflow-systems/
  03-机制分析/
    review-testing/
  04-能力映射/
  99-历史归档/
    01-需求分析-业界分析迁移清单.md
```

执行者可以在抽样后微调目录名，但最终 README 必须解释采用的分类口径。

---

## Implementation Units

### U1. 分类并冻结迁移集合

**Goal:** 在移动任何文件前，产出精确的迁移、保留和目标路径清单。

**Requirements:** R1, R2, R3, R5

**Dependencies:** 无

**Files:**
- target_repo: `spec-first`
  - Read: `docs/01-需求分析/**/*.md`
- target_repo: `spec-first-doc`
  - Create: `业界学习/99-历史归档/01-需求分析-业界分析迁移清单.md`

**Approach:**
- 从以下候选组开始分类：
  - `docs/01-需求分析/03.brainstorm-optimization/2026-05-29-spec-brainstorm-竞品调研与质量提升报告.md`
  - `docs/01-需求分析/03.brainstorm-optimization/spec-brainstorm-能力升级方案.md`
  - `docs/01-需求分析/05.spec-graph-bootstrap/code-review-graph-MCP能力对照表.md`
  - `docs/01-需求分析/05.spec-graph-bootstrap/graphify借鉴方案.md`
  - `docs/01-需求分析/05.spec-graph-bootstrap/业界方案调研.md`
  - `docs/01-需求分析/05.spec-graph-bootstrap/竞争力分析.md`
  - `docs/01-需求分析/05.spec-graph-bootstrap/阶段0-核心算法实现参考.md`
  - `docs/01-需求分析/06.project-knowledge-base/spec-graph-bootstrap/胶水编程对spec-graph-bootstrap-v2的设计启发.md`
  - `docs/01-需求分析/07.project-knowledge/spec-first-harness-engineering-改造技术方案.md`
  - `docs/01-需求分析/07.project-knowledge/spec-first-harness-engineering-改造技术方案-最终审查报告.md`
  - `docs/01-需求分析/12.consistency-analysis/*.md`
  - `docs/01-需求分析/13.scale-integration/**/*.md`
  - `docs/01-需求分析/14.code-review/*.md`
  - `docs/01-需求分析/14.harness-engineering/*.md`
  - `docs/01-需求分析/14.prd-skill/*.md`
- 每个候选记录：old path、title、decision (`migrate`/`keep`)、target bucket、rationale。
- 对主旨为内部实现计划且没有长期外部学习价值的文档执行 keep 规则。

**Patterns to follow:**
- `业界学习/99-历史归档/README.md`
- 既有 `业界学习/README.md` 中上一轮迁移说明口径

**Test scenarios:**
- 无代码测试；以 manifest 完整性和后续文件/链接检查作为验证。

**Verification:**
- manifest 覆盖每个迁移文件，并覆盖每个被保留的边界文件及理由。

---

### U2. 按目标分类移动文档

**Goal:** 把选中文档迁入 `业界学习/` 对应 bucket，并删除 `spec-first` 中的源文件。

**Requirements:** R1, R3, R4, R5

**Dependencies:** U1

**Files:**
- target_repo: `spec-first-doc`
  - Create/Modify: `业界学习/02-对标研究/**`
  - Create/Modify: `业界学习/03-机制分析/**`
  - Create/Modify: `业界学习/04-能力映射/**`
  - Create/Modify: `业界学习/99-历史归档/01-需求分析-业界分析迁移清单.md`
- target_repo: `spec-first`
  - Delete: `docs/01-需求分析/` 下 manifest 标记为 `migrate` 的文件

**Approach:**
- 目标路径规则：
  - Brainstorm、OpenSpec、Superpowers、Kiro、gstack、Agent OS workflow 对比 -> `02-对标研究/workflow-systems/`
  - Graphify、CodeGraph、CRG、code-review-graph -> `02-对标研究/crg-graph/`
  - SCALE 与 project-scaffold 研究/比较 -> `02-对标研究/scale-engine/`
  - Harness Engineering 方法和对标 -> `02-对标研究/harness-engineering/`
  - PRD、PM skills、AI Coding R&D system、Compound Engineering 方法分析 -> `02-对标研究/prd-host-agent-os/`；矩阵式映射文档放入 `04-能力映射/`
  - Review、testing decision、brooks-lint、discipline/gate 分析 -> `03-机制分析/review-testing/`
- 默认保留原文件名；仅在重名或迁移后语义不清时重命名。
- 如迁移文档有关联 `.assets/` 资源目录，资源目录随文档一起移动并保持相邻。

**Patterns to follow:**
- 上一轮 `业界学习/02-对标研究/` 的目录形态
- 上一轮 `业界学习/01-外部文章/` 中相邻 `.assets/` 的处理方式

**Test scenarios:**
- 无代码测试；以文件存在、源文件删除和链接检查作为验证。

**Verification:**
- 每个 manifest `migrate` 源路径在 `spec-first` 中已不存在。
- 每个 manifest `migrate` 目标路径在 `spec-first-doc` 中存在。
- 移动前后文件数量与 manifest 对齐。

---

### U3. 刷新导航和链接

**Goal:** 让迁移资料可发现，并避免活跃链接指向已删除源文件。

**Requirements:** R3, R4, R5

**Dependencies:** U2

**Files:**
- target_repo: `spec-first-doc`
  - Modify: `业界学习/README.md`
  - Modify: `业界学习/02-对标研究/README.md`
  - Modify: `业界学习/03-机制分析/README.md`
  - Modify: `业界学习/04-能力映射/README.md`
  - Modify: `业界学习/99-历史归档/README.md`
  - Create/Modify: 新增子目录的 README
- target_repo: `spec-first`
  - Modify: `docs/01-需求分析/README.md`
  - Modify: 仍在活跃使用且链接到迁移文档的 Markdown 文件

**Approach:**
- 更新目标 README，补充新目录说明和建议阅读顺序。
- 在 `spec-first:docs/01-需求分析/README.md` 加一句边界说明：业界分析材料已迁入 `spec-first-doc:业界学习/`。
- 用 `rg` 查找指向被迁移源路径的活跃 Markdown 链接，并改到新位置。
- 不改写 changelog 历史，除非某条 changelog 链接语法本身已损坏。

**Patterns to follow:**
- 现有 `业界学习` README 风格和上一轮迁移措辞
- 现有 `docs/01-需求分析/README.md` 的使用边界写法

**Test scenarios:**
- 无代码测试；以导航和链接检查作为验证。

**Verification:**
- 除 changelog/历史归档例外外，`rg` 找不到指向已删除源路径的活跃 Markdown 链接。
- 目标 README 中新增相对链接可解析。

---

### U4. 更新两个仓库的 changelog

**Goal:** 按治理规则记录本次迁移。

**Requirements:** R6

**Dependencies:** U2, U3

**Files:**
- target_repo: `spec-first-doc`
  - Modify: `CHANGELOG.md`
- target_repo: `spec-first`
  - Modify: `CHANGELOG.md`

**Approach:**
- 作者使用 `~/.spec-first/.developer` 中的 `leokuang`。
- `spec-first-doc` 记录导入、目标分类、迁移清单和 README 更新。
- `spec-first` 记录源文件删除、活跃链接修正和目标仓指针。
- 两条记录都追加 `(user-visible)`。

**Patterns to follow:**
- 两个仓库当前 `CHANGELOG.md` 的紧凑单行格式。

**Test scenarios:**
- 无代码测试；以格式和内容检查作为验证。

**Verification:**
- 两个 changelog 都有本次迁移记录。
- 记录格式符合各自仓库现有格式。

---

### U5. 运行文档迁移验证

**Goal:** 证明迁移结果内部一致，且可以交付用户复核。

**Requirements:** R7

**Dependencies:** U1, U2, U3, U4

**Files:**
- target_repo: `spec-first-doc`
  - Read: `业界学习/**`
- target_repo: `spec-first`
  - Read: `docs/01-需求分析/**`

**Approach:**
- 运行聚焦文档迁移的验证：
  - 两个仓库分别运行 `git diff --check`。
  - 检查 `业界学习` 下 README 的相对链接。
  - 按 manifest 检查每个 `migrate` 源路径已删除。
  - 在 `spec-first` 和 `spec-first-doc` 搜索旧活跃链接。
  - 按 manifest 对齐迁移文件数量。
- 对故意保留的旧路径提及记录历史例外。

**Patterns to follow:**
- 上一轮 `docs/09-业界借鉴` 迁移后的验证口径。

**Test scenarios:**
- 无代码测试；本任务不改变运行时行为。

**Verification:**
- 所有聚焦检查通过；若存在例外，最终交付中明确说明。

---

## System-Wide Impact

- **Interaction graph:** 仅文档工程；不改变 runtime skill、CLI、generated mirror 或代码路径。
- **State lifecycle risks:** 两个工作区执行前已 dirty；执行时只触达计划或 manifest 指定的文件，不回滚无关变更。
- **API surface parity:** 不适用；无 API 或 CLI 行为变化。
- **Surface coverage:**
  - `spec-first-doc:业界学习`: 本次迁移目标，in-scope。
  - `spec-first:docs/01-需求分析`: 删除已迁移文档、更新 README/链接，in-scope。
  - `spec-first` runtime/source code: out-of-scope。
  - generated mirrors (`.claude`、`.codex`、`.agents/skills`): out-of-scope。
- **Integration coverage:** 以链接验证和 README 导航核对替代代码测试。
- **Unchanged invariants:** `docs/01-需求分析/` 仍作为内部需求和实现历史归档存在。

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| 误迁内部实现历史 | 先写 manifest，并对边界文件抽样后再移动 |
| 删除源文件后出现断链 | 执行旧路径 `rg` 搜索和目标相对链接检查 |
| 目标 taxonomy 变臃肿 | 只在现有 bucket 不能准确承接时新增小目录 |
| dirty worktree 掩盖无关变更 | 只查看和修改计划/manifest 范围内文件，不回滚无关变更 |
| changelog 文件数量描述与实际不一致 | 最终 manifest 和文件数量核对后再写迁移 changelog |

---

## Alternative Approaches Considered

- 迁移整个 `docs/01-需求分析/`：拒绝。该目录大量内容是内部实现历史，不属于业界学习。
- 复制文件但保留 `spec-first` 源文件：拒绝。用户要求迁移，且上一轮已建立迁移后删除源文件的约定。
- 全部平铺到 `99-历史归档/`：拒绝。这样虽然保留历史，但无法达成“业界学习可发现”的目标。

---

## Documentation / Operational Notes

- 不需要生产监控或运行时观测。
- 最终交付需要说明未运行全量测试，因为本任务仅改文档。
- 如果执行阶段发现候选规模远超计划范围，先停止并向用户确认，不扩大迁移范围。

---

## Sources & References

- Source repo scope: `spec-first:docs/01-需求分析/`
- Target repo scope: `spec-first-doc:业界学习/`
- Existing target navigation: `业界学习/README.md`
- Existing source boundary note: `docs/01-需求分析/README.md`

## Completion Evidence

- 2026-06-14 执行完成：迁移清单记录 45 个 `migrate`、28 个 `keep`；45 个迁移目标均存在，源仓对应文件均已删除。
- `spec-first-doc:业界学习/` 已补充 `workflow-systems`、`scale-engine`、`review-testing` 主题目录和迁移清单，并更新相关 README。
- `spec-first:docs/01-需求分析/README.md` 已补迁移边界说明；当前可消费文档中的已删除源路径引用已改为 `spec-first-doc:` 指针。
- 验证：两个仓库 `git diff --check` 通过；旧活跃引用定向搜索无输出；`业界学习` 相对链接检查无真实断链，仅历史正则片段 `?:\.hs-repos|hs-repos` 被简易 Markdown 检查器误识别为链接。
- Review：按 `$spec-code-review` 单代理 report-only fallback 自审，发现并修复 1 个跨仓相对链接可移植性问题，剩余无 actionable finding。
