---
name: git-push
description: Automates git commit and push workflow. Use when user wants to commit and push code changes to remote repository. Handles git status check, staging files, generating commit messages, committing, and pushing to ALL remote branches (supports multi-repo like GitHub + Gitee).
---

# Git Push

## Overview

自动化 Git 提交和推送工作流，智能生成 commit message，**支持多远程仓库推送**，处理常见错误场景。适用于需要快速提交和推送代码改动的场景。

## When to Use This Skill

使用此 skill 当用户说：
- "提交所有改动并推送"
- "push 代码到远程"
- "保存当前工作进度"
- "git push"
- "提交代码"
- "推送到远程分支"
- "推送到所有仓库"

## Workflow

### 1. 检查 Git 状态

首先检查当前仓库状态：
- 是否在 git 仓库中
- 当前分支名称
- **所有远程仓库列表**
- 是否有未提交的改动
- 是否有未跟踪的文件

### 2. 生成 Commit Message

根据改动内容智能生成 commit message：
- 分析改动的文件类型和数量
- 识别改动类型（feat/fix/docs/refactor/test/skill 等）
- 生成简洁清晰的中文描述
- 遵循项目的 commit 规范

### 3. 执行提交流程

按顺序执行：
1. `git add .` - 添加所有改动
2. `git commit -m "<message>"` - 提交到本地仓库
3. **推送到所有远程仓库**（或指定的远程仓库）

### 4. 多仓库推送

自动检测所有远程仓库并推送：
- 支持 `github` + `gitee` 双仓库
- 支持 `-r` 参数指定特定远程仓库
- 自动设置上游分支
- 汇总推送结果

### 5. 错误处理

处理常见错误：
- **需要先 pull**：提示用户先拉取远程更新
- **存在冲突**：提示用户手动解决冲突
- **分支未关联远程**：自动设置上游分支
- **无改动**：提示没有需要提交的内容
- **部分推送失败**：汇总成功/失败的远程仓库

## Usage Examples

### 示例 1：基本使用（推送到所有远程仓库）

```
用户: /git-push
助手: [检查状态] → [生成 commit message] → [推送到所有远程仓库]
```

### 示例 2：自定义 commit message

```
用户: /git-push "feat: 添加用户登录功能"
助手: [使用用户提供的 message] → [推送到所有远程仓库]
```

### 示例 3：只推送到特定远程仓库

```
用户: /git-push -r github
助手: [推送到 github 远程仓库]
```

### 示例 4：推送到多个指定远程仓库

```
用户: /git-push -r github origin
助手: [推送到 github 和 origin]
```

### 示例 5：只提交不推送

```
用户: /git-push --no-push
助手: [执行 add/commit] → [跳过 push]
```

## Script Reference

### scripts/git_push.py

主要的 git 推送脚本，提供以下功能：

**函数列表**：
- `check_git_repo()` - 检查是否在 git 仓库中
- `get_current_branch()` - 获取当前分支名
- `get_remotes()` - 获取所有远程仓库
- `get_tracking_remote()` - 获取当前分支跟踪的远程
- `generate_commit_message()` - 智能生成 commit message
- `stage_all_changes()` - 添加所有改动
- `commit_changes(message)` - 提交改动
- `push_to_single_remote()` - 推送到单个远程仓库
- `push_to_all_remotes()` - 推送到所有/指定的远程仓库
- `main()` - 主流程控制

**命令行参数**：
- `--message, -m` - 自定义 commit message
- `--remotes, -r` - 指定要推送的远程仓库（多个用空格分隔）
- `--no-push` - 只提交不推送
- `--dry-run` - 预览操作不实际执行

## Best Practices

1. **提交前检查**：确保代码已经过测试
2. **清晰的 message**：commit message 应该清晰描述改动内容
3. **小步提交**：频繁提交小的改动，而不是一次性提交大量改动
4. **遵循规范**：遵循项目的 commit message 规范
5. **多仓库同步**：配置多个远程仓库时，确保代码同步到所有仓库

## Error Handling

### 常见错误及解决方案

**错误 1：需要先 pull**
```
error: failed to push some refs to 'origin'
hint: Updates were rejected because the remote contains work
```
**解决**：先执行 `git pull` 拉取远程更新

**错误 2：存在冲突**
```
CONFLICT (content): Merge conflict in <file>
```
**解决**：手动解决冲突后再提交

**错误 3：分支未关联远程**
```
fatal: The current branch has no upstream branch
```
**解决**：脚本自动执行 `git push -u origin <branch>`

**错误 4：部分远程推送失败**
```
⚠️ 1/2 个远程仓库推送成功，失败: gitee
```
**解决**：检查失败的远程仓库连接，稍后重试

## Safety Features

- **预览模式**：使用 `--dry-run` 预览操作
- **状态检查**：提交前检查仓库状态
- **多仓库汇总**：显示所有远程仓库的推送结果
- **日志记录**：记录所有操作日志

## Multi-Remote Support

当项目配置了多个远程仓库时（如同时使用 GitHub 和 Gitee）：

```bash
# 查看远程仓库
$ git remote -v
github  https://github.com/user/repo.git (fetch)
github  https://github.com/user/repo.git (push)
origin  https://gitee.com/user/repo.git (fetch)
origin  https://gitee.com/user/repo.git (push)

# 推送到所有远程仓库
$ python git_push.py
[2024-01-15 10:30:00] [INFO] 当前分支: main
[2024-01-15 10:30:00] [INFO] 远程仓库: github (https://github.com/...), origin (https://gitee.com/...)
[2024-01-15 10:30:00] [INFO] 将推送到 2 个远程仓库: github, origin
[2024-01-15 10:30:01] [INFO] ✓ 已成功推送到 github
[2024-01-15 10:30:02] [INFO] ✓ 已成功推送到 origin
[2024-01-15 10:30:02] [INFO] ✓ 所有 2 个远程仓库推送成功
```

## Resources

### scripts/

- `git_push.py` - 主要的 git 推送脚本
