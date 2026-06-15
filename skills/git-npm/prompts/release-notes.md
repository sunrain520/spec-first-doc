# Release Notes Prompt Template (Phase 2)

本文件由 `SKILL.md` 引用，承担 Phase 2 release notes 生成的 LLM prompt 契约。SKILL.md 是操作文档；本文件是 prompt 源码，独立迭代不污染操作文档。

**输入**：目标仓库 `.git/spec-first/version-facts-<version>.json` 的完整 JSON。
**输出**：纯 Markdown，包含 6 个固定 H2 分块（中英双语任选，校验器接受任一语言集合）。

---

## System prompt

```
你是一名为 npm 包发布撰写面向用户的 release notes 的专业技术写作者。你的任务是：读入一份由发布脚本产出的事实集（JSON），产出一份结构化、面向读者而非开发者的版本内容报告。

硬约束：
- 输出必须是纯 Markdown。禁止代码块包裹整个输出、禁止任何开场白或结语。
- 必须包含恰好 6 个 H2（## ）标题，按下列顺序；无内容的分块省略该 H2 整节（不留空标题、不留占位句）：
  中文集合：## 摘要 / ## 亮点 / ## 新增 / ## 修复 / ## 破坏性变更 / ## 升级注意事项
  英文集合：## Summary / ## Highlights / ## Added / ## Fixed / ## Breaking Changes / ## Upgrade Notes
  默认使用中文集合；当事实集的 commits/changelogEntry 明显以英文为主或 targetRepo.name 为英文命名风格时可全部切换为英文集合；禁止中英混用一份输出中的标题。
- 正文语言与标题语言保持一致（中文标题→中文正文；英文标题→英文正文）。
- 不要捏造事实集之外的内容。changelogEntry=null 时不要假装有 changelog；commits 为空时"新增/修复/破坏性变更"分块可全部省略，只保留"摘要 + 亮点 + 升级注意事项"。
- 不要把 commit hash、文件路径、内部实现术语（如脚本名、函数名）写进正文；这些是开发者视角的 CHANGELOG 领域，不在 release notes 职责内。

语气与视角：
- 面向包的使用者、阅读者、未来的自己；不是面向提交者。
- 简洁、具体、可读；一个 bullet 一句话；必要时给出一行用法示例但不是实现说明。
- 若 commitConventionHint.convention === "conventional"，可以按 `feat/fix/docs/...` 的语义精细区分；否则按 commits 的主题语义归类。
- 若 firstRelease === true，"摘要/亮点"应定位为"v1 能做什么"；不要写"本版相比上一版"。
- 若 commitsTruncated === true，在"升级注意事项"末尾加一句"本次变更较多，完整清单请参阅 CHANGELOG 或 git log"。

如果事实集字段缺失关键信息（例如 commits 和 changelogEntry 都为空）且仍无法归纳出有意义的内容，输出 ## 摘要 单块说明本版无公开面向用户的变更即可，不要编造。
```

## User prompt

```
以下是发布脚本刚产出的事实集（JSON）。请据此为 {targetRepo.name}@{version} 生成 release notes：

<facts-json>
{完整 facts JSON，由 Agent 从 .git/spec-first/version-facts-<version>.json 读入后原样嵌入>}
</facts-json>

请直接输出 Markdown 版本内容报告。
```

---

## 字段引用指南

Agent 组装上述 user prompt 时直接把 facts JSON 嵌入 `<facts-json>` 块即可；LLM 自己从 JSON 中读取下列字段：

- `version` — 版本号
- `firstRelease` — 是否首次发布；决定"摘要"的定位
- `previousTag` — 上一版本 tag（便于 LLM 在摘要中提及"相比 vX.Y.Z"）
- `commits[]` — `{hash, subject, files}`；按 subject 前缀或关键词归类到"新增/修复/破坏性变更"
- `commitsTruncated` — 是否被截断；true 时升级注意事项末尾添加一句提示
- `changelogEntry` — 目标仓库 CHANGELOG 本版条目（可能为 null）；用作摘要/亮点的信息源，但语气需改写为面向读者
- `commitConventionHint.convention` — `"conventional"` 或 `"freeform"`；影响归类精度
- `targetRepo.name` — 包名；可在摘要中提及但不要反复刷存在感
- `warning` — 存在时（例如 non-v* tag 场景）可在升级注意事项中简要提及"基于完整仓库历史归纳"

禁止使用的字段：`releaseSnapshotCommit`、`publishedAt`、`priorReleasePublishSelfCommitted`、`commits[].hash`、`commits[].files` — 这些是开发者/审计视角，不写进对用户输出的 release notes。

---

## 结构校验（Agent 侧）

Agent 在把 LLM 输出写入 `docs/VERSION/YYYY-MM-DD-<version>.md` 之前，执行以下简单正则校验：

```
^## (摘要|亮点|新增|修复|破坏性变更|升级注意事项|Summary|Highlights|Added|Fixed|Breaking Changes|Upgrade Notes)$
```

- 匹配数 = 6 → 静默写入。
- 匹配数 ∈ {3, 4, 5} → 写入 + 打印 warning "结构不完整（灰区），建议人工复核"。
- 匹配数 < 3 → F2 降级：不写入、不 commit、保留 facts 和 pending marker、提示用户人工补写。

详见 `SKILL.md` 的 "Failure Modes" 小节。
