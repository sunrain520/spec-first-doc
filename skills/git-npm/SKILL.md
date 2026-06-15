---
name: git-npm
description: Safer git plus npm release workflow for real repositories. Use when the user wants to publish a new npm version, run a release dry-run, or asks to release/publish a package.
---

# Git + npm Release Workflow

面向真实仓库的更安全发布工作流，强调：
- 先预检，再发布
- 失败后不要盲目重跑 `auto`
- Access Token 优先于 OTP
- 主干 merge/push 与 tag 推送应视仓库策略显式执行，而不是默认强推
- **每次真实发布强制 `v<version>` tag**（自 v1.5.5+）
- **发布后自动产出面向用户的版本内容报告**（两阶段交接，见下文）

## Quick Start

> ⚠️ **调用前提**：脚本对**当前工作目录**操作（读 `./package.json`、跑 `git status`、调目标仓库自身的 npm scripts），它本身**不接收项目路径入参**。必须先 `cd` 到目标仓库根目录再运行。
>
> ⚠️ **脚本路径**：下文示例写作 `<git-npm>/scripts/publish.sh`。`<git-npm>` 是本 skill 实际所在目录——若已安装到 `<git-npm>` 就用该路径；否则用仓库内副本（如 `…/spec-first-doc/skills/git-npm`）。安装路径不存在时旧版示例里的 `<git-npm>/...` 会直接报 “No such file”。
>
> ℹ️ **包管理器**：按 lockfile 自动探测——`pnpm-lock.yaml`→pnpm、`yarn.lock`→yarn、否则 npm（`spec-first` 即 npm）。可用 `PM=` 环境变量覆盖。

```bash
cd /path/to/target-repo            # 例：cd /Users/kuang/xiaobu/spec-first
bash <git-npm>/scripts/publish.sh [version-type] [--dry-run]
```

**Parameters:**
- Version type (default: `auto`): `patch` / `minor` / `major` / `auto`
- `--dry-run`: 只做预检与模拟发布，不执行真实 publish、不创建 tag、不写 facts

**Phase 2 — 发布完毕后生成 release notes:**

`publish.sh` 退出成功后会在 stdout 打印 Phase 2 交接指令。在**任一 agent 会话**中触发短语：

```
继续处理 git-npm pending release notes
```

Agent 会扫描目标仓库 `.git/spec-first/pending-notes-*`，读取对应 `version-facts-<version>.json`，调用宿主 LLM 按 `prompts/release-notes.md` 约定的契约生成 `docs/VERSION/YYYY-MM-DD-<version>.md`，并以独立 commit 追加到主开发分支。不必在 publish.sh 同一会话中完成。

## Recommended Flow (Phase 1, 7 steps — deterministic bash)

1. **Step 1 Preflight**
   - 工作区是否干净
   - 当前分支是否符合仓库策略
   - `package.json` 中是否已有待发布版本漂移
   - npm 认证是否可用（推荐 Access Token）
   - 默认 npm registry 是否指向 `https://registry.npmjs.org`
   - **R19: `docs/VERSION/` 已从 `npm pack` 排除**（通过 `.npmignore` 或 `package.json#files`）；未排除 abort

2. **Step 2 Quality Gates**（`<PM>` 为自动探测到的包管理器）
   - `<PM> run typecheck`
   - `<PM> run build`

3. **Step 3 Publish**
   - 调用仓库自身 `<PM> run release:publish -- <args>` 执行 `npm publish`
   - 默认不要在失败后再次自动 bump version

4. **Step 4 Post-publish verify**
   - 校验 npm registry 上的新版本与本地 `package.json.version` 一致

5. **Step 4.5 Bump-commit alignment (R21)**
   - 检查 `git status --porcelain`：
     - 空 → 目标仓库 `release:publish` 自己做了 bump commit+push（release-it / changesets 风格），跳过
     - 非空且脏文件全在 bump allowlist（`package.json` / `CHANGELOG.md` / `package-lock.json` / `pnpm-lock.yaml` / `yarn.lock`）→ 自动生成 `chore(release): v<version>`（或 `bump:` if freeform）commit 并 push（1 次 2s 重试）
     - 非空但含非 bump 脏文件 → warn + SKIP_NOTES=true + 不 exit（publish 保留，要求人工介入）
   - 对齐目的：保证 Step 5 tag 所指 commit 与 npm tarball 内 `package.json.version` 一致（消解 1.5.4 经验"tarball ≠ git HEAD"）

6. **Step 5 Tag (R14–R18)**
   - 入口显式 `SKIP_NOTES=false`（`set -u` 防御）
   - 先采集 `PREV_TAG=$(git tag --list --sort=-v:refname 'v*' | head -n 1)`
   - `TAG="v$NEW_VERSION"`，`SNAPSHOT_COMMIT=$(git rev-parse HEAD)`
   - Tag 冲突分叉：
     - 同 commit → 幂等成功，跳过创建
     - 不同 commit → warn + SKIP_NOTES=true + 不 exit（publish 保留）
   - Tag 创建失败（hook/磁盘/权限） → warn + SKIP_NOTES=true + 不 exit
   - Lightweight `git tag "$TAG" "$SNAPSHOT_COMMIT"` + push（1 次 2s 重试，失败 warn 不回滚）

7. **Step 6 Facts + pending marker (R4, R10, R12, R20, R22)**
   - `mkdir -p .git/spec-first/`（写入失败 → fallback 到 `$TMPDIR`）
   - 事实集字段：`{version, publishedAt, previousTag, firstRelease, releaseSnapshotCommit, commits[{hash, subject, files}], commitsTruncated, changelogEntry, commitConventionHint, targetRepo, priorReleasePublishSelfCommitted, warning?}`
   - first-release 分叉：
     - `PREV_TAG` 空 + 无任何 tag → `firstRelease: true`；commits 退化为 repo 初始 commit → HEAD
     - `PREV_TAG` 空但仓库有非 v* tag → `firstRelease: false` + `warning: "no v* tag but other tags exist"`
     - `PREV_TAG` 非空 → 正常 `$PREV_TAG..HEAD`
   - CHANGELOG 两段式 fallback：先匹配 `## [?v?<version>` 标题样式；失败再匹配 `- v<version> YYYY-` 扁平 bullet；仍空 → `changelogEntry: null`
   - commits 硬上限 200 条 / 256KB；超限截断并设 `commitsTruncated: true`
   - commitConventionHint 由 bash 层产出（`git log -n 20 HEAD` + 正则），Agent 侧不再重扫
   - 事实集组装**通过环境变量传入 node -e**（禁止字符串拼接，commit subject 特殊字符安全）+ `JSON.parse` 自校验
   - 写 `pending-notes-<version>` marker 供任一后续 agent 会话识别
   - stdout 打印绝对路径 + Phase 2 trigger phrase

## Phase 2 — Release Notes Handoff (host Agent + LLM)

Phase 2 的完整契约：

### Trigger

触发条件任一满足即进入 Phase 2：

- 用户在任一 agent 会话中说 **"继续处理 git-npm pending release notes"**
- Agent 启动时主动扫描 `.git/spec-first/pending-notes-*` 并提示用户

### Input

目标仓库 `.git/spec-first/version-facts-<version>.json`，字段契约见上方 Step 6。

### Prompt template

独立文件：`<git-npm>/prompts/release-notes.md`。Agent 按该文件的 system + user 结构调用宿主 LLM（Claude Code 的 slash-command / Codex 的 subagent / 裸 API 均可），timeout 120s，重试 0 次。

### Structural validation

LLM 输出必须是纯 Markdown，包含 6 个固定双语 H2 标题（任选中/英一套）：

| 中文集合 | 英文集合 |
|---|---|
| `## 摘要` | `## Summary` |
| `## 亮点` | `## Highlights` |
| `## 新增` | `## Added` |
| `## 修复` | `## Fixed` |
| `## 破坏性变更` | `## Breaking Changes` |
| `## 升级注意事项` | `## Upgrade Notes` |

Agent 校验规则：

```
正则: ^## (摘要|亮点|新增|修复|破坏性变更|升级注意事项|Summary|Highlights|Added|Fixed|Breaking Changes|Upgrade Notes)$
```

- 匹配数 = 6 → 静默写入
- 匹配数 ∈ {3, 4, 5} → 写入 + warn "结构不完整（灰区），建议人工复核"
- 匹配数 < 3 → F2 降级（见 Failure Modes）

### Write path

- 路径硬约定：`docs/VERSION/YYYY-MM-DD-<version>.md`（date = 当前本地日期，`date +%Y-%m-%d`）
- 目录不存在 → `mkdir -p docs/VERSION/`；不放 `.gitkeep`
- 已存在同名文件 → 覆盖（R10 同日同版本重发布语义）

### Commit

Agent 直接读 `facts.commitConventionHint`（不再自己扫 git log）：

| `convention` | `taskPrefix` | commit message |
|---|---|---|
| `"conventional"` | `true` | `[TASK-RELEASE-NOTES] docs(version): v<v> release notes` |
| `"conventional"` | `false` | `docs(version): v<v> release notes` |
| `"freeform"` | * | `docs: add v<v> release notes` |

操作：`git add docs/VERSION/<file>.md` + `git commit -m '<msg>'`；push 沿用目标仓库分支策略（`master`-direct 默认 push；PR-only 见 Failure Mode F8）。

### Cleanup

Commit 成功后 `rm .git/spec-first/pending-notes-<version>`。F2 降级路径保留 marker 以便后续补写时再次进入 Phase 2。

## Release Notes Structure (output format)

示例（中文集合，实际省略无内容分块）：

```markdown
## 摘要
本版为 `@example/pkg` 的稳定性更新，重点修复 X、新增 Y，无破坏性变更。

## 亮点
- 核心路径延迟下降约 40%
- 新增对 A 的一等支持

## 新增
- A：xxx（用法略）
- B：xxx

## 修复
- 修复 C 在 Z 条件下的边界问题

## 升级注意事项
- 建议先运行一次 dry-run 验证 .npmignore 是否排除 docs/VERSION/
```

当某分块无内容（如本版无破坏性变更），整个 H2 节省略，不保留空标题。

## Failure Modes

| Code | 场景 | 行为 | 恢复路径 |
|---|---|---|---|
| F1 | 正常路径 | Phase 1 7 步全绿 → stdout 给 Phase 2 trigger → Agent 完成 Phase 2 | — |
| F2 | LLM 不可用 / 输出 < 3 分块 | Agent warn，不写 docs/VERSION/，不 commit，保留 facts + pending marker | 人工触发后续 agent 会话补写；或直接编辑 docs/VERSION/*.md 后手工 `git add/commit` 并删除 pending marker |
| F3 | LLM 输出 3–5 分块灰区 | 写入 docs/VERSION/ + warn | 视质量决定是否人工 revise 该文件 |
| F4 | Step 5 tag 冲突（同名指向不同 commit） | SKIP_NOTES=true，publish 保留，Step 6 跳过 | 人工 `git tag -d v<v>` 或 `git push --delete origin v<v>`，确认无误后再重跑 publish（从当前版本而非 auto） |
| F5 | Step 5 tag 本地创建失败（hook/磁盘/权限） | SKIP_NOTES=true，publish 保留 | 诊断 hook 失败原因或权限；手工 `git tag v<v> <commit>` 后进入 Phase 2 |
| F6 | Step 1 R19 preflight abort（docs/VERSION/ 未排除 npm pack） | 全流程未开始 | 在 `.npmignore` 追加 `docs/VERSION/`，或在 `package.json#files` 中显式不列；然后重跑 |
| F7 | Step 4.5 worktree 含非 bump 脏文件 | SKIP_NOTES=true，publish 保留 | `git stash` 非 bump 改动 → 仅对 bump 文件 `git add + commit + push` → 进入 Phase 2（约定触发短语） |
| F8 | PR-only 仓库不支持（v1 仅 master-direct） | Phase 2 commit 试图直推主分支被 remote 拒绝 | v1 不支持；Agent 应放弃 push、保留本地 commit、告知用户创建 PR |

## Real-world lessons from spec-first@1.5.4

这次 `spec-first` 从 1.5.3 继续发布到 **`1.5.4`** 时新暴露了几个坑：

### A. 默认 npm registry 可能指向 mirror，导致 `npm publish` 无法工作

- 本机 `npm config get registry` 可能是 `https://registry.npmmirror.com` 之类的镜像源
- `npm whoami --registry=https://registry.npmjs.org` 即使通过，也不代表不加 registry 的 `npm publish` 会走 npmjs.org
- 仓库内的发布脚本（如 `scripts/release-publish.cjs` 直接 `spawn("npm", ["publish"])`）如果不显式指定 `--registry`，就会走镜像源，报 `ENEEDAUTH for https://registry.npmmirror.com`

**规则：**
- preflight 阶段必须检查 `npm config get registry` 是否指向 `https://registry.npmjs.org`
- 若不是，要么临时 override，要么提示并退出
- 真正的 `npm publish` 始终显式带 `--registry=https://registry.npmjs.org`

### B. 工作区"假干净"的坑

- preflight 的 `git status --porcelain` 只反映"当前时刻"状态
- session break/resume、外部 agent、文件 watcher 等都可能在 preflight 之后改动工作区
- 这些改动会被 `npm pack` 打进 tarball，但 git HEAD 不包含它们
- 结果：**tarball 里的内容 ≠ git HEAD**，审计面出现漂移

**规则（自 v1.5.5 起由 Step 4.5 自动处理）：**
- Step 4.5 会在 publish 返回后检测 bump 残留；若目标仓库 `release:publish` 不自行 commit，脚本会自动补齐 `chore(release): v<version>` commit 并 push，保证 tag 指向 tarball 源
- 若 worktree 含非 bump 的意外改动，脚本 abort release notes 流程（不撤 publish），交由人工处理
- 大规模 rename / 迁移（~100 文件量级）期间不要触发 auto publish；preflight 的 clean 检查是必要不充分条件

### C. 大规模重命名 / 术语迁移期间不适合触发 auto publish

- 仓库正在做 `spec-bootstrap → spec-graph-bootstrap` 之类的大规模迁移时，tarball 内容会随未提交的重命名改动漂移
- 一次盲目的 `auto` 就会把半完成的迁移状态冻结成某个 npm 版本，并写入 CHANGELOG

**规则：**
- 大规模迁移未收口前，不要触发真实 publish；优先走 `--dry-run` 或手动版本
- 触发前至少确认 CHANGELOG 当前顶部条目是否对得上真实仓库意图，而不是外部 agent 塞进来的
- 警惕 CLAUDE.md 等治理文件里出现的语义反转（例如被错写成 `spec-graph-bootstrap 已退场`），宁可暂停也不要直接提交

## Real-world lessons from spec-first@1.5.3

这次 `spec-first` 真实发布最终成功版本为 **`1.5.3`**，过程中确认了以下经验：

### 1. `auto` 不是幂等操作

如果 `git-npm auto` 在 bump version 之后、publish 之前失败，直接再次运行 `auto` 会继续前滚版本，导致：
- `1.5.1 -> 1.5.2 -> 1.5.3` 连续前滚
- CHANGELOG 与真实发布版本错位
- 审计和恢复复杂度上升

**规则：**
- `auto` 失败后，不要立刻再次运行整条 `auto`
- 应先检查当前 `package.json.version`、git 状态、npm 已发布版本
- 再用"当前已 bump 的版本"继续收尾发布

### 2. 仓库 hook 可能阻断 release commit

真实仓库常有 pre-commit / commit-msg / policy hook。
在 `spec-first` 中，发布相关提交会被要求同步：
- `CHANGELOG.md`
- `CLAUDE.md`

**规则：**
- bump version 前先确认仓库是否有这类治理要求
- 若 hook 失败，先满足 hook，再继续 release
- 不要在 hook 未解决时盲目重试同一条自动发布链

### 3. `npm publish` 的 warning 也值得落回源码

这次真实发布中，npm 对以下字段做了规范化提醒：
- `bin`
- `repository.url`

虽然 warning 不一定直接阻止发布，但应优先修正到 `package.json`，避免后续版本继续告警或被更严格校验拦住。

### 4. Access Token 比 OTP 更适合自动化

OTP 浏览器认证可以用于人工交互，但在反复重试时非常不稳定。

**推荐顺序：**
1. Access Token（推荐）
2. OTP 浏览器认证（人工兜底）

**建议：**
- 自动化或半自动发布优先配置 token
- 只有人工临时发布时再走 OTP

### 5. 真实成功路径

以 `spec-first@1.5.3` 为例，最终更稳的路径是：
1. 修复仓库发布入口与 metadata
2. 收口已经前滚的版本状态
3. 推送版本提交
4. 用当前确定版本直接执行发布
5. 校验 registry 结果

## Authentication Guidance

### Preferred: Access Token

先在 npm 网站创建可用于 publish 的 token，然后在当前终端配置：

```bash
npm config set //registry.npmjs.org/:_authToken=YOUR_TOKEN
npm whoami --registry=https://registry.npmjs.org
```

如果 `npm whoami` 返回用户名，则说明 token 已生效。

### Fallback: OTP / Browser Auth

如果 `npm publish` 返回 `EOTP`：
- 打开错误输出中的 `https://www.npmjs.com/auth/cli/...` 链接
- 在浏览器完成这一次授权
- 立刻重试 publish

注意：**必须使用最新一次命令输出中的链接**，旧链接通常会失效。

## Failure and Recovery

### If publish fails after version bump

不要再次运行：

```bash
bash <git-npm>/scripts/publish.sh auto
```

而应先做以下检查：

```bash
git status --short --branch
node -p "require('./package.json').version"
npm view <package-name> version --registry=https://registry.npmjs.org
```

然后：
- 若本地 version 已前滚、registry 还没发布成功：收口 changelog / docs / version 提交
- 再直接发布当前版本，而不是再次 `auto`

### If metadata warnings appear

优先修正并重新提交：
- `package.json.bin`
- `package.json.repository.url`

### If Step 5 tag conflict aborted release notes (F4)

```bash
# 检查已有 tag 指向哪个 commit
git show v<version>

# 若确认该 tag 应被替换（例如误打）：
git tag -d v<version>
git push --delete "$REMOTE" v<version>

# 确认清理完成后，再次触发从当前版本开始的 publish（不要 auto）：
bash <git-npm>/scripts/publish.sh <current-version>
```

### If pending notes were skipped (F5/F7 SKIP_NOTES path)

```bash
# 检查是否有遗留的 pending marker
ls -la .git/spec-first/pending-notes-*

# 若有，在任一 agent 会话中触发：
#   "继续处理 git-npm pending release notes"
# Agent 会读取 .git/spec-first/version-facts-<v>.json 并完成 Phase 2
```

## Manual release commands

```bash
# Dry-run（先 cd 到目标仓库根目录；<git-npm> 为本 skill 目录）
bash <git-npm>/scripts/publish.sh auto --dry-run

# 直接发布当前仓库自己的版本类型入口（<PM> = npm/pnpm/yarn，按 lockfile 探测）
<PM> run release:publish -- auto
<PM> run release:publish -- patch --dry-run

# 若已前滚到明确版本，直接发布当前版本
<PM> run release:publish -- 1.5.3
```

## Validation Checklist

发布完成后至少确认：

```bash
npm view <package-name> version --registry=https://registry.npmjs.org
git status --short --branch
git tag --list "v$NEW_VERSION"
git show v$NEW_VERSION -- docs/VERSION/ 2>&1 | head   # 应为空：tag 不指向含 notes 的 tree
ls -la .git/spec-first/version-facts-$NEW_VERSION.json
ls -la .git/spec-first/pending-notes-$NEW_VERSION    # Phase 2 完成后应消失
ls docs/VERSION/$(date +%Y-%m-%d)-$NEW_VERSION.md    # Phase 2 成功后应存在
```

## Rollout Checklist (first adoption)

首次在一个仓库启用本 flow 时，按以下顺序执行（降低不对称风险）：

**Step 1 — Throwaway smoke（强烈推荐，不要直接在生产 target 上首试）：**

1. 准备一个低风险 target：本地 verdaccio 私有 registry 或 scoped npm package（如 `@yourname/git-npm-smoke-YYMMDD`）。
2. 在该 target 上运行：
   ```bash
   bash <git-npm>/scripts/publish.sh patch --dry-run
   ```
   验证 Step 1 preflight 通过、dry-run 占位输出正确、Step 4.5/5/6 未执行。
3. 运行真实 patch release：
   ```bash
   bash <git-npm>/scripts/publish.sh patch
   ```
   验证 Phase 1 全部 7 步走通，Phase 2 通过 agent 交接完成。
4. 核对 AE1 / AE2 / AE5 / AE7 / AE8 / AE9 / AE10 / AE11 / AE12（见计划文档中的 Acceptance Examples）。

**Step 2 — 正式 target rollout（仅在 Step 1 全绿后执行）：**

1. 前置确认：
   - 目标仓库 `.npmignore` 或 `package.json#files` 已排除 `docs/VERSION/`（否则 Step 1 R19 必 abort）
   - 目标仓库 worktree 干净无 uncommitted 改动
2. 先跑 `--dry-run`，再跑真实 `patch` release。
3. 验证 `git show v<NEW>` 不含 `docs/VERSION/`；主干 HEAD 在 tag 之后多一条 notes commit。

**Step 3 — Lessons 回填：**

首次真实 rollout 完成后，若暴露新的真实坑，在本文件新增 `## Real-world lessons from <project>@<version>` 节追加经验。**不要预置空占位节**；有内容时才创建。

## Important guardrails

- `auto` 失败后默认不要再次 bump
- 先满足仓库 hook，再继续 release
- token 优先于 OTP
- 不要默认自动 merge/push 主干，除非仓库明确采用这种策略
- 发布成功不等于全部收尾完成；还要检查 registry、tag、主干状态、Phase 2 是否已消化 pending marker
- 若仓库规则指定 `master` 为直接提交分支，发布完成后默认应补一个 release snapshot commit 到 `master`（v1.5.5+ 由 Step 4.5 自动处理）
- **始终显式指定 `--registry=https://registry.npmjs.org`，不要信任本机默认 registry**
- **大规模 rename/迁移未收口前，不触发真实 publish**
- **真实发布完成后立刻把工作区提交成 release snapshot，避免 tarball 与 git HEAD 漂移**（由 Step 4.5 自动化）
- **每次真实发布必创建 `v<version>` lightweight tag**（R14）；dry-run 不创建任何 tag
- **bump-commit 先于 tag**：Step 4.5 负责对齐目标仓库 `release:publish` 的 git-state 副作用（R21）
- **同名 tag 指向同 commit 幂等；指向不同 commit warn + SKIP_NOTES=true 不 exit**（R17）——保持退出码区分 publish 失败 vs 后置步骤失败
- **tag 本地创建失败 warn + 跳 notes + 不撤 publish**（R18）
- **tag push 1 次 2s 重试后 warn**；本地 tag 是权威（R16）
- **preflight R19 校验 `docs/VERSION/` 已从 npm pack 排除**；未排除 abort，不自动补写
- **LLM 不可用或输出 < 3 个必需分块** → F2 降级：warn + 保留 facts + 保留 pending marker + 不阻塞 publish
- **release notes 是辅助归档，非审计证据**（R20）；审计链只到 `v<version>` tag ↔ tarball
- **`SKIP_NOTES=false` 必须在 Step 5 入口显式初始化**（`set -u` 防御）
- **Phase 2 不依赖同会话**；通过 `.git/spec-first/pending-notes-<v>` marker + 约定触发短语，任一后续 agent 会话都可消化
