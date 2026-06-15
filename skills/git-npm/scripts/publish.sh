#!/bin/bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════
# Git + npm Release Workflow (safer spec-first oriented variant)
#
# 7 steps total (Phase 1 Deterministic bash pipeline):
#   Step 1  Preflight      — worktree clean, npm auth, registry, docs/VERSION/ excluded
#   Step 2  Quality Gates  — typecheck, build
#   Step 3  Publish        — $PM run release:publish (PM 按 lockfile 探测)
#   Step 4  Post-publish verify — registry version match
#   Step 4.5 Bump-commit   — align release:publish git-state differences (R21)
#   Step 5  Tag            — v<version> lightweight tag (R14–R18)
#   Step 6  Facts + marker — .git/spec-first/{version-facts,pending-notes}-<v>
#
# Phase 2 (host Agent + LLM) is triggered via stdout message after Step 6.
# ═══════════════════════════════════════════════════════════════════════════

VERSION_TYPE=${1:-auto}
DRY_RUN=false

for arg in "$@"; do
  case $arg in
    --dry-run) DRY_RUN=true ;;
  esac
done

echo "════════════════════════════════════════════════════════════════════════"
echo "  Git + npm Release Workflow"
echo "════════════════════════════════════════════════════════════════════════"

REMOTE=""
if git remote | grep -q "^github$"; then
  REMOTE="github"
elif git remote | grep -q "^origin$"; then
  REMOTE="origin"
else
  echo "✗ No 'github' or 'origin' remote found"
  exit 1
fi

CURRENT_BRANCH=$(git branch --show-current)
PKG_NAME=$(node -p "require('./package.json').name")
CURRENT_VERSION=$(node -p "require('./package.json').version")

# 包管理器探测：按 lockfile 推断，默认 npm；可用环境变量 PM 覆盖
# （历史默认写死 pnpm，但真实目标仓库可能是 npm/yarn，会导致 Step 2/3 误用错的 runner）
if [[ -z "${PM:-}" ]]; then
  if [[ -f pnpm-lock.yaml ]]; then PM=pnpm
  elif [[ -f yarn.lock ]]; then PM=yarn
  else PM=npm
  fi
fi

echo ""
echo "▸ Package: $PKG_NAME"
echo "▸ Current branch: $CURRENT_BRANCH"
echo "▸ Remote: $REMOTE"
echo "▸ Package manager: $PM"
echo "▸ Version type: $VERSION_TYPE"
echo "▸ Current package.json version: $CURRENT_VERSION"
[[ "$DRY_RUN" == true ]] && echo "▸ Mode: DRY-RUN (no actual publish)"

echo ""
echo "─────────────────────────────────────────────────────────────────────"
echo "  Step 1: Preflight"
echo "─────────────────────────────────────────────────────────────────────"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "✗ Working tree is not clean"
  echo "  请先提交或清理本地改动，再执行发布"
  exit 1
fi

echo "✓ Working tree is clean"

echo "▸ Checking npm auth..."
if ! npm whoami --registry=https://registry.npmjs.org >/dev/null 2>&1; then
  echo "✗ npm auth is not ready"
  echo "  推荐先配置 Access Token："
  echo "  npm config set //registry.npmjs.org/:_authToken=YOUR_TOKEN"
  exit 1
fi
echo "✓ npm auth is ready"

echo "▸ Checking default npm registry..."
DEFAULT_REGISTRY=$(npm config get registry 2>/dev/null || true)
echo "▸ npm config registry: ${DEFAULT_REGISTRY:-unknown}"
if [[ "$DEFAULT_REGISTRY" != https://registry.npmjs.org* ]]; then
  echo "⚠ Default registry is not registry.npmjs.org"
  echo "  项目发布脚本若调用 bare 'npm publish'，可能会走到镜像源并失败 (ENEEDAUTH)"
  echo "  建议在真实发布前临时切换："
  echo "    npm config set registry https://registry.npmjs.org"
  echo "  或确保项目发布脚本显式传 --registry=https://registry.npmjs.org"
  if [[ "$DRY_RUN" != true ]]; then
    echo "✗ Refusing real publish with non-npmjs.org default registry. Fix above and retry."
    exit 1
  fi
fi

echo "▸ Checking registry published version..."
REGISTRY_VERSION=$(npm view "$PKG_NAME" version --registry=https://registry.npmjs.org 2>/dev/null || true)
if [[ -n "$REGISTRY_VERSION" ]]; then
  echo "▸ Registry latest: $REGISTRY_VERSION"
else
  echo "▸ Registry latest: unknown (package may not exist yet)"
fi

# 如果用户传入的是明确 semver，则检查是否已发布
if [[ "$VERSION_TYPE" =~ ^[0-9]+\.[0-9]+\.[0-9]+([-+].+)?$ ]]; then
  if [[ "$VERSION_TYPE" == "$REGISTRY_VERSION" && "$DRY_RUN" != true ]]; then
    echo "✗ Version $VERSION_TYPE has already been published to registry"
    echo "  Bump version first (auto/patch/minor/major), or use --dry-run"
    exit 1
  fi
fi

# 即使是 auto/patch/minor/major，也提示当前版本是否已发布
if [[ "$CURRENT_VERSION" == "$REGISTRY_VERSION" && "$VERSION_TYPE" == "auto" && "$DRY_RUN" != true ]]; then
  echo "⚠ package.json version $CURRENT_VERSION equals registry latest"
  echo "  release:publish 会把版本 bump 后再发布；如果失败后不要重复 auto"
fi

# R19: docs/VERSION/ 必须从 npm pack 排除（见 requirements R19）
echo "▸ Checking docs/VERSION/ excluded from npm pack (R19)..."
PACK_JSON=$(npm pack --dry-run --json 2>/dev/null || true)
if [[ -z "$PACK_JSON" ]] || ! echo "$PACK_JSON" | node -e "JSON.parse(require('fs').readFileSync(0,'utf8'))" >/dev/null 2>&1; then
  echo "⚠ npm pack --dry-run --json output unparseable (old npm version?); skipping R19 check"
  echo "  请人工确认 docs/VERSION/ 已在 .npmignore 或 package.json#files 中排除"
else
  VERSION_IN_PACK=$(echo "$PACK_JSON" | node -e "
const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
const entries = Array.isArray(data) ? data : [data];
for (const e of entries) {
  if (!e || !Array.isArray(e.files)) continue;
  for (const f of e.files) {
    if (f.path && /^docs\/VERSION(\/|$)/.test(f.path)) { console.log(f.path); break; }
  }
}
" 2>/dev/null || true)
  if [[ -n "$VERSION_IN_PACK" ]]; then
    echo "✗ docs/VERSION/ 必须从 npm pack 排除（发现: $VERSION_IN_PACK）"
    echo "  修复方式二选一："
    echo "    1) 在仓库根目录 .npmignore 中追加一行： docs/VERSION/"
    echo "    2) 在 package.json 的 \"files\" 字段中显式不包含 docs/VERSION/"
    echo "  修复后重跑本脚本。详见本 skill 的 SKILL.md \"Failure Modes\" F6。"
    exit 1
  fi
  echo "✓ docs/VERSION/ excluded from npm pack"
fi

# dry-run 占位：明确告知后续步骤将不执行
if [[ "$DRY_RUN" == true ]]; then
  echo ""
  echo "▸ Mode: DRY-RUN — Step 4.5 bump-commit 将不执行、Step 5 tag 将不创建、"
  echo "  Step 6 facts 将不写盘 .git/spec-first/；仅输出预期行为摘要"
fi

echo ""
echo "─────────────────────────────────────────────────────────────────────"
echo "  Step 2: Quality Gates"
echo "─────────────────────────────────────────────────────────────────────"

echo "▸ Running typecheck..."
$PM run typecheck
echo "✓ Typecheck passed"

echo "▸ Running build..."
$PM run build
echo "✓ Build completed"

echo ""
echo "─────────────────────────────────────────────────────────────────────"
echo "  Step 3: Publish"
echo "─────────────────────────────────────────────────────────────────────"

PUBLISH_ARGS="$VERSION_TYPE"
[[ "$DRY_RUN" == true ]] && PUBLISH_ARGS="$PUBLISH_ARGS --dry-run"

echo "▸ Running: $PM run release:publish -- $PUBLISH_ARGS"
$PM run release:publish -- $PUBLISH_ARGS

NEW_VERSION=$(node -p "require('./package.json').version")

echo ""
echo "─────────────────────────────────────────────────────────────────────"
echo "  Step 4: Post-publish checks"
echo "─────────────────────────────────────────────────────────────────────"

echo "▸ Checking published version on npm registry..."
PUBLISHED_VERSION=$(npm view "$PKG_NAME" version --registry=https://registry.npmjs.org 2>/dev/null || true)

if [[ "$DRY_RUN" == true ]]; then
  echo "✓ Dry-run finished; registry remains at: ${PUBLISHED_VERSION:-unknown}"
else
  echo "▸ Registry version: ${PUBLISHED_VERSION:-unknown}"
  if [[ -z "$PUBLISHED_VERSION" ]]; then
    echo "⚠ Could not read registry version; manually verify before tagging"
  elif [[ "$PUBLISHED_VERSION" != "$NEW_VERSION" ]]; then
    echo "⚠ Registry=$PUBLISHED_VERSION but package.json=$NEW_VERSION"
    echo "  Publish may have failed; do NOT rerun 'auto'. Resume from $NEW_VERSION instead."
  else
    echo "✓ Registry matches package.json at $NEW_VERSION"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# Step 4.5+ only run on successful real publish
# ═══════════════════════════════════════════════════════════════════════════

if [[ "$DRY_RUN" == true ]]; then
  echo ""
  echo "════════════════════════════════════════════════════════════════════════"
  echo "  Dry-run complete: current version $NEW_VERSION (not published)"
  echo "  Step 4.5 / 5 / 6 would run in real publish; see SKILL.md for expectations."
  echo "════════════════════════════════════════════════════════════════════════"
  exit 0
fi

# Initialize state flags (set -u defensive; required for downstream steps)
SKIP_NOTES=false
PRIOR_RELEASE_PUBLISH_SELF_COMMITTED=false
PREV_TAG=""
PREV_TAG_WARN=""

echo ""
echo "─────────────────────────────────────────────────────────────────────"
echo "  Step 4.5: Bump-commit alignment (R21)"
echo "─────────────────────────────────────────────────────────────────────"

CURRENT_STATUS=$(git status --porcelain || true)

if [[ -z "$CURRENT_STATUS" ]]; then
  echo "✓ release:publish self-managed git state (no bump residue); skipping Step 4.5"
  PRIOR_RELEASE_PUBLISH_SELF_COMMITTED=true
else
  # Verify dirty files are within bump allowlist
  # Allowed: package.json, CHANGELOG.md, package-lock.json, pnpm-lock.yaml, yarn.lock
  # porcelain v1 路径从第 4 列起（前 2 列状态 + 1 空格）；cut -c4- 比 awk '{print $2}' 更稳：
  # 能保留含空格的路径，重命名 'R old -> new' 也不会被截断成误判为已知 bump 文件
  UNEXPECTED_FILES=$(echo "$CURRENT_STATUS" | cut -c4- | grep -v -E '^(package\.json|CHANGELOG\.md|package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$' || true)
  if [[ -n "$UNEXPECTED_FILES" ]]; then
    echo "✗ publish 已成功但 Step 4.5 发现非 bump 脏文件："
    echo "$UNEXPECTED_FILES" | sed 's/^/    /'
    echo "  为避免把无关改动打进 release commit，Step 4.5 中止但不撤 publish"
    echo "  手工处理：git stash 非 bump 改动 → 仅对 bump 文件 git add + git commit + git push"
    echo "  详见 SKILL.md \"Failure Modes\" F7"
    SKIP_NOTES=true
  else
    echo "▸ 检测到 bump 残留改动；对齐为 release commit"
    BUMP_FILES=$(echo "$CURRENT_STATUS" | cut -c4-)
    # Detect commit convention on recent 20 commits
    RECENT_SUBJECTS=$(git log --format=%s -n 20 HEAD 2>/dev/null || true)
    CONV_COUNT=$(echo "$RECENT_SUBJECTS" | grep -cE '^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\([^)]+\))?!?:' || true)
    TOTAL=$(echo "$RECENT_SUBJECTS" | grep -c '' || echo 0)
    if [[ "$TOTAL" -gt 0 ]] && [[ $((CONV_COUNT * 100 / TOTAL)) -ge 50 ]]; then
      BUMP_MSG="chore(release): v$NEW_VERSION"
    else
      BUMP_MSG="bump: v$NEW_VERSION"
    fi
    # 逐行 stage（本分支仅在 worktree 非空时进入，BUMP_FILES 必非空）；
    # -I{} 把整行当单个参数，含空格的路径也安全
    echo "$BUMP_FILES" | xargs -I{} git add {}
    git commit -m "$BUMP_MSG"
    echo "✓ release commit created: $BUMP_MSG"
    # Push with 1 retry
    if git push "$REMOTE" "$CURRENT_BRANCH"; then
      echo "✓ release commit pushed to $REMOTE/$CURRENT_BRANCH"
    else
      sleep 2
      if git push "$REMOTE" "$CURRENT_BRANCH"; then
        echo "✓ release commit pushed on retry"
      else
        echo "⚠ publish 已成功但 release commit push 失败"
        echo "  本地 commit 已保留；请人工 git push $REMOTE $CURRENT_BRANCH"
        SKIP_NOTES=true
      fi
    fi
  fi
fi

echo ""
echo "─────────────────────────────────────────────────────────────────────"
echo "  Step 5: Tag"
echo "─────────────────────────────────────────────────────────────────────"

TAG="v$NEW_VERSION"
SNAPSHOT_COMMIT=$(git rev-parse HEAD)

# Capture previousTag BEFORE creating new tag (avoid polluting detection)
PREV_TAG=$(git tag --list --sort=-v:refname 'v*' 2>/dev/null | head -n 1 || true)
if [[ -z "$PREV_TAG" ]]; then
  ANY_TAG=$(git tag --list 2>/dev/null | head -n 1 || true)
  if [[ -n "$ANY_TAG" ]]; then
    PREV_TAG_WARN="no v* tag but other tags exist ($ANY_TAG); treating as non-v* convention, not first-release"
  fi
fi

if [[ "$SKIP_NOTES" == "true" ]]; then
  echo "▸ SKIP_NOTES=true (from Step 4.5); skipping tag creation to avoid mis-aligned anchor"
  echo "  publish 结果保留；release notes 交接跳过"
else
  EXISTING=$(git rev-parse --verify --quiet "$TAG" 2>/dev/null || true)
  if [[ -n "$EXISTING" ]]; then
    if [[ "$EXISTING" == "$SNAPSHOT_COMMIT" ]]; then
      echo "⚠ tag $TAG 已存在且指向同一 commit，跳过创建（幂等成功）"
    else
      echo "⚠ publish 已成功但 tag $TAG 冲突"
      echo "  已有 tag 指向: $EXISTING"
      echo "  本次 snapshot: $SNAPSHOT_COMMIT"
      echo "  不强制覆盖；release notes 已跳过；请人工处理 tag（git tag -d / git push --delete）"
      echo "  详见 SKILL.md \"Failure Modes\" F4"
      SKIP_NOTES=true
    fi
  else
    if git tag "$TAG" "$SNAPSHOT_COMMIT" 2>&1; then
      echo "✓ lightweight tag $TAG created at $SNAPSHOT_COMMIT"
      # Push tag with 1 retry
      if git push "$REMOTE" "$TAG" 2>&1; then
        echo "✓ tag $TAG pushed to $REMOTE"
      else
        sleep 2
        if git push "$REMOTE" "$TAG" 2>&1; then
          echo "✓ tag $TAG pushed on retry"
        else
          echo "⚠ tag push failed; local tag retained (authoritative); Phase 2 继续"
          echo "  手工 push: git push $REMOTE $TAG"
        fi
      fi
    else
      echo "⚠ publish 已成功但 tag $TAG 本地创建失败"
      echo "  可能原因: pre-tag hook / 磁盘 / 权限"
      echo "  release notes 交接已跳过；publish 不回滚"
      echo "  详见 SKILL.md \"Failure Modes\" F5"
      SKIP_NOTES=true
    fi
  fi
fi

echo ""
echo "─────────────────────────────────────────────────────────────────────"
echo "  Step 6: Facts + pending marker"
echo "─────────────────────────────────────────────────────────────────────"

if [[ "${SKIP_NOTES:-false}" == "true" ]]; then
  echo "▸ SKIP_NOTES=true; Step 6 facts 持久化与 pending marker 均跳过"
  echo "  publish 结果保留；请按 SKILL.md Failure Modes 手工恢复后再进入 Phase 2"
else
  FACTS_DIR=".git/spec-first"
  if ! mkdir -p "$FACTS_DIR" 2>/dev/null; then
    echo "⚠ 无法创建 $FACTS_DIR；facts 将仅输出到 stderr；pending marker 写入 \$TMPDIR"
    FACTS_DIR="${TMPDIR:-/tmp}"
  fi

  FACTS_PATH="$FACTS_DIR/version-facts-$NEW_VERSION.json"
  MARKER_PATH="$FACTS_DIR/pending-notes-$NEW_VERSION"

  # Collect facts using git + shell (no string interpolation into node -e)
  PUBLISHED_AT=$(date +%Y-%m-%dT%H:%M:%S%z)
  FIRST_RELEASE=false
  if [[ -z "$PREV_TAG" && -z "$PREV_TAG_WARN" ]]; then
    FIRST_RELEASE=true
  fi

  # Build commits JSONL (temp file) to avoid shell-string hell with special chars
  COMMITS_TMP=$(mktemp)
  if [[ -n "$PREV_TAG" ]]; then
    RANGE="$PREV_TAG..HEAD"
  else
    # First-release fallback or non-v* tag scenario: from repo root commit
    RANGE="$(git rev-list --max-parents=0 HEAD | head -n1)..HEAD"
  fi

  # Produce newline-delimited records: HASH\0SUBJECT (null-separated within record)
  git log --format='%H%x00%s' "$RANGE" 2>/dev/null > "$COMMITS_TMP" || true

  # Grab changelog entry via two-format fallback
  CHANGELOG_TMP=$(mktemp)
  if [[ -f CHANGELOG.md ]]; then
    # Format A: "## [?v?<version>" heading style
    awk -v v="$NEW_VERSION" '
      $0 ~ "^## \\[?v?" v { found=1; print; next }
      found && /^## / { exit }
      found { print }
    ' CHANGELOG.md > "$CHANGELOG_TMP"
    if [[ ! -s "$CHANGELOG_TMP" ]]; then
      # Format B: "- v<version> YYYY-..." flat-bullet style
      grep -E "^- v?${NEW_VERSION//./\\.} " CHANGELOG.md > "$CHANGELOG_TMP" 2>/dev/null || true
    fi
  fi

  # Compute commitConventionHint (reuse Step 4.5 detection; re-scan for facts consumer)
  RECENT_SUBJECTS=$(git log --format=%s -n 20 HEAD 2>/dev/null || true)
  CONV_COUNT=$(echo "$RECENT_SUBJECTS" | grep -cE '^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\([^)]+\))?!?:' || true)
  TASK_COUNT=$(echo "$RECENT_SUBJECTS" | grep -cE '^\[TASK-[^]]+\]' || true)
  TOTAL_SUB=$(echo "$RECENT_SUBJECTS" | grep -c '' || echo 0)
  HINT_CONV="freeform"
  HINT_TASK="false"
  if [[ "$TOTAL_SUB" -gt 0 ]]; then
    if [[ $((CONV_COUNT * 100 / TOTAL_SUB)) -ge 50 ]]; then HINT_CONV="conventional"; fi
    if [[ $((TASK_COUNT * 100 / TOTAL_SUB)) -ge 30 ]]; then HINT_TASK="true"; fi
  fi

  # Assemble JSON via node -e reading tmp files from env (NO string interpolation of data)
  FACTS_JSON=$(
    VERSION="$NEW_VERSION" \
    PUBLISHED_AT="$PUBLISHED_AT" \
    PREV_TAG="$PREV_TAG" \
    PREV_TAG_WARN="$PREV_TAG_WARN" \
    FIRST_RELEASE="$FIRST_RELEASE" \
    SNAPSHOT_COMMIT="$SNAPSHOT_COMMIT" \
    COMMITS_FILE="$COMMITS_TMP" \
    CHANGELOG_FILE="$CHANGELOG_TMP" \
    HINT_CONV="$HINT_CONV" \
    HINT_TASK="$HINT_TASK" \
    PKG_NAME="$PKG_NAME" \
    REMOTE="$REMOTE" \
    CURRENT_BRANCH="$CURRENT_BRANCH" \
    PRIOR_SELF="$PRIOR_RELEASE_PUBLISH_SELF_COMMITTED" \
    node -e '
const fs = require("fs");
const env = process.env;
const commitsRaw = fs.readFileSync(env.COMMITS_FILE, "utf8");
const changelogEntry = fs.existsSync(env.CHANGELOG_FILE) && fs.statSync(env.CHANGELOG_FILE).size > 0
  ? fs.readFileSync(env.CHANGELOG_FILE, "utf8").trimEnd()
  : null;

const commits = [];
const lines = commitsRaw.split("\n").filter(Boolean);
const MAX_COMMITS = 200;
const MAX_BYTES = 256 * 1024;
let totalBytes = 0;
let truncated = false;
for (const line of lines) {
  if (commits.length >= MAX_COMMITS) { truncated = true; break; }
  const [hash, subject] = line.split("\0", 2);
  if (!hash) continue;
  const rec = { hash, subject: subject || "", files: [] };
  // Files per commit via git show; fallback to empty array if fails
  try {
    const { execSync } = require("child_process");
    const out = execSync(`git show --name-only --format= ${hash}`, { encoding: "utf8" });
    rec.files = out.split("\n").filter(Boolean);
  } catch (e) { /* ignore */ }
  const recBytes = Buffer.byteLength(JSON.stringify(rec), "utf8");
  if (totalBytes + recBytes > MAX_BYTES) { truncated = true; break; }
  totalBytes += recBytes;
  commits.push(rec);
}

const facts = {
  version: env.VERSION,
  publishedAt: env.PUBLISHED_AT,
  previousTag: env.PREV_TAG || null,
  firstRelease: env.FIRST_RELEASE === "true",
  releaseSnapshotCommit: env.SNAPSHOT_COMMIT,
  commits,
  commitsTruncated: truncated,
  changelogEntry,
  commitConventionHint: {
    convention: env.HINT_CONV,
    taskPrefix: env.HINT_TASK === "true"
  },
  targetRepo: {
    name: env.PKG_NAME,
    remote: env.REMOTE,
    branch: env.CURRENT_BRANCH
  },
  priorReleasePublishSelfCommitted: env.PRIOR_SELF === "true"
};
if (env.PREV_TAG_WARN) facts.warning = env.PREV_TAG_WARN;

process.stdout.write(JSON.stringify(facts, null, 2));
'
  )

  # Validate JSON before writing
  if echo "$FACTS_JSON" | node -e "JSON.parse(require('fs').readFileSync(0,'utf8'))" >/dev/null 2>&1; then
    if [[ "$FACTS_DIR" == ".git/spec-first" ]]; then
      echo "$FACTS_JSON" > "$FACTS_PATH"
      echo "{\"version\":\"$NEW_VERSION\",\"created\":\"$PUBLISHED_AT\"}" > "$MARKER_PATH"
      FACTS_ABS=$(cd "$(dirname "$FACTS_PATH")" && pwd)/$(basename "$FACTS_PATH")
      MARKER_ABS=$(cd "$(dirname "$MARKER_PATH")" && pwd)/$(basename "$MARKER_PATH")
      echo "✓ facts written: $FACTS_ABS"
      echo "✓ pending marker: $MARKER_ABS"
    else
      # Fallback mode: only stdout + tmpdir marker
      echo "✗ facts JSON (fallback stdout):" >&2
      echo "$FACTS_JSON" >&2
      echo "{\"version\":\"$NEW_VERSION\",\"created\":\"$PUBLISHED_AT\"}" > "$MARKER_PATH"
      echo "⚠ pending marker in TMPDIR: $MARKER_PATH"
    fi
  else
    echo "⚠ facts JSON assembled but failed self-validation; raw output:" >&2
    echo "$FACTS_JSON" >&2
  fi

  rm -f "$COMMITS_TMP" "$CHANGELOG_TMP"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo "  Publish complete: package.json=$NEW_VERSION registry=${PUBLISHED_VERSION:-unknown}"
if [[ "${SKIP_NOTES:-false}" != "true" ]]; then
  echo ""
  echo "▸ Phase 2 — release notes handoff:"
  echo "    在任一 agent 会话中触发短语："
  echo "      继续处理 git-npm pending release notes"
  echo "    Agent 会读取上面的 facts 并生成 docs/VERSION/*.md + commit"
fi
echo "  Do not rerun 'auto' if publish failed after a version bump; resume from current version instead"
echo "════════════════════════════════════════════════════════════════════════"
