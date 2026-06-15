#!/usr/bin/env python3
"""
Git Push 自动化脚本

功能：
- 检查 git 状态
- 智能生成 commit message
- 执行 add/commit/push 流程
- 支持多远程仓库推送
- 处理常见错误场景
"""

import subprocess
import sys
import argparse
import os
import re
from typing import Tuple, Optional, List, Dict
from datetime import datetime


class GitPushError(Exception):
    """Git 操作错误"""
    pass


class GitPusher:
    """Git 推送管理器"""

    def __init__(self, dry_run: bool = False, remotes: Optional[List[str]] = None):
        self.dry_run = dry_run
        self.target_remotes = remotes  # 指定要推送的远程仓库列表，None 表示全部
        self.log_messages = []

    def log(self, message: str, level: str = "INFO"):
        """记录日志"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_msg = f"[{timestamp}] [{level}] {message}"
        self.log_messages.append(log_msg)
        print(log_msg)

    def run_command(self, cmd: List[str], check: bool = True) -> Tuple[int, str, str]:
        """
        执行命令

        返回: (返回码, stdout, stderr)
        """
        if self.dry_run:
            self.log(f"[DRY RUN] 将执行: {' '.join(cmd)}")
            return 0, "", ""

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=check
            )
            return result.returncode, result.stdout, result.stderr
        except subprocess.CalledProcessError as e:
            if check:
                raise GitPushError(f"命令执行失败: {' '.join(cmd)}\n{e.stderr}")
            return e.returncode, e.stdout, e.stderr

    def check_git_repo(self) -> bool:
        """检查是否在 git 仓库中"""
        returncode, _, _ = self.run_command(
            ["git", "rev-parse", "--git-dir"],
            check=False
        )
        return returncode == 0

    def get_current_branch(self) -> str:
        """获取当前分支名"""
        _, stdout, _ = self.run_command(["git", "branch", "--show-current"])
        return stdout.strip()

    def get_remotes(self) -> Dict[str, str]:
        """
        获取所有远程仓库

        返回: {remote_name: url}
        """
        _, stdout, _ = self.run_command(["git", "remote", "-v"])
        remotes = {}

        for line in stdout.strip().split('\n'):
            if not line:
                continue
            # 格式: origin	https://gitee.com/xxx.git (fetch)
            match = re.match(r'^(\S+)\s+(\S+)\s+\(fetch\)$', line)
            if match:
                remotes[match.group(1)] = match.group(2)

        return remotes

    def get_tracking_remote(self, branch: str) -> Optional[str]:
        """获取当前分支跟踪的远程仓库名"""
        _, stdout, _ = self.run_command(
            ["git", "config", "--get", f"branch.{branch}.remote"],
            check=False
        )
        return stdout.strip() if stdout.strip() else None

    def check_status(self) -> Tuple[bool, List[str], List[str]]:
        """
        检查 git 状态

        返回: (有改动, 已修改文件列表, 未跟踪文件列表)
        """
        _, stdout, _ = self.run_command(["git", "status", "--porcelain"])

        if not stdout.strip():
            return False, [], []

        modified_files = []
        untracked_files = []

        for line in stdout.strip().split('\n'):
            if not line:
                continue
            status = line[:2]
            filename = line[3:]

            if status.strip() == '??':
                untracked_files.append(filename)
            else:
                modified_files.append(filename)

        return True, modified_files, untracked_files

    def generate_commit_message(self, modified_files: List[str], untracked_files: List[str]) -> str:
        """
        智能生成 commit message

        根据文件类型和数量生成合适的 commit message
        """
        all_files = modified_files + untracked_files
        total_count = len(all_files)

        if total_count == 0:
            return "chore: 更新代码"

        # 分析文件类型
        file_types = {
            'frontend': 0,
            'backend': 0,
            'docs': 0,
            'config': 0,
            'test': 0,
            'skill': 0,
            'other': 0
        }

        for file in all_files:
            file_lower = file.lower()
            if any(x in file_lower for x in ['frontend/', 'src/', '.tsx', '.jsx', '.vue', '.css', '.scss']):
                file_types['frontend'] += 1
            elif any(x in file_lower for x in ['backend/', 'app/', '.py', 'api/']):
                file_types['backend'] += 1
            elif any(x in file_lower for x in ['doc', 'readme', '.md']):
                file_types['docs'] += 1
            elif any(x in file_lower for x in ['test', 'spec', '__tests__']):
                file_types['test'] += 1
            elif any(x in file_lower for x in ['skill', '.claude/skills']):
                file_types['skill'] += 1
            elif any(x in file_lower for x in ['config', '.json', '.yaml', '.yml', '.env']):
                file_types['config'] += 1
            else:
                file_types['other'] += 1

        # 确定主要改动类型
        max_type = max(file_types.items(), key=lambda x: x[1])
        main_type = max_type[0]

        # 生成 commit message
        if main_type == 'docs':
            return f"docs: 更新文档 ({total_count}个文件)"
        elif main_type == 'test':
            return f"test: 更新测试 ({total_count}个文件)"
        elif main_type == 'config':
            return f"chore: 更新配置 ({total_count}个文件)"
        elif main_type == 'frontend':
            return f"feat: 更新前端代码 ({total_count}个文件)"
        elif main_type == 'backend':
            return f"feat: 更新后端代码 ({total_count}个文件)"
        elif main_type == 'skill':
            return f"feat: 更新 skill 文件 ({total_count}个文件)"
        else:
            return f"chore: 更新代码 ({total_count}个文件)"

    def stage_all_changes(self):
        """添加所有改动到暂存区"""
        self.log("正在添加所有改动...")
        self.run_command(["git", "add", "."])
        self.log("✓ 所有改动已添加到暂存区")

    def commit_changes(self, message: str):
        """提交改动"""
        self.log(f"正在提交改动: {message}")
        self.run_command(["git", "commit", "-m", message])
        self.log("✓ 改动已提交到本地仓库")

    def push_to_single_remote(self, remote: str, branch: str, set_upstream: bool = False) -> bool:
        """
        推送到单个远程仓库

        返回: 是否成功
        """
        self.log(f"正在推送到 {remote}/{branch}...")

        cmd = ["git", "push"]
        if set_upstream:
            cmd.extend(["-u", remote, branch])
        else:
            cmd.append(remote)

        returncode, stdout, stderr = self.run_command(cmd, check=False)

        if returncode != 0:
            # 检查是否需要设置上游分支
            if "no upstream branch" in stderr or "set-upstream" in stderr:
                self.log(f"分支 {branch} 未关联 {remote}，正在设置上游分支...")
                returncode, _, stderr = self.run_command(
                    ["git", "push", "-u", remote, branch],
                    check=False
                )
                if returncode != 0:
                    self.log(f"推送 {remote} 失败: {stderr}", level="ERROR")
                    return False
            else:
                self.log(f"推送 {remote} 失败: {stderr}", level="ERROR")
                return False

        self.log(f"✓ 已成功推送到 {remote}")
        return True

    def push_to_all_remotes(self, branch: str) -> Dict[str, bool]:
        """
        推送到所有或指定的远程仓库

        返回: {remote_name: 是否成功}
        """
        all_remotes = self.get_remotes()

        if not all_remotes:
            raise GitPushError("没有配置任何远程仓库")

        # 确定要推送的远程仓库
        if self.target_remotes:
            # 使用指定的远程仓库
            remotes_to_push = {k: v for k, v in all_remotes.items() if k in self.target_remotes}
            if not remotes_to_push:
                raise GitPushError(f"指定的远程仓库 {self.target_remotes} 不存在")
        else:
            # 推送所有远程仓库
            remotes_to_push = all_remotes

        # 获取当前分支跟踪的远程
        tracking_remote = self.get_tracking_remote(branch)

        results = {}
        self.log(f"将推送到 {len(remotes_to_push)} 个远程仓库: {', '.join(remotes_to_push.keys())}")

        for remote_name, remote_url in remotes_to_push.items():
            # 第一个推送的远程仓库（或跟踪的远程）设置上游分支
            set_upstream = (remote_name == tracking_remote) or (tracking_remote is None and remote_name == list(remotes_to_push.keys())[0])
            success = self.push_to_single_remote(remote_name, branch, set_upstream)
            results[remote_name] = success

        return results

    def execute(self, custom_message: Optional[str] = None, no_push: bool = False):
        """
        执行完整的 git push 流程

        参数:
            custom_message: 自定义 commit message
            no_push: 是否跳过 push 步骤
        """
        # 1. 检查是否在 git 仓库中
        if not self.check_git_repo():
            raise GitPushError("当前目录不是 git 仓库")

        # 2. 获取当前分支
        branch = self.get_current_branch()
        self.log(f"当前分支: {branch}")

        # 3. 显示远程仓库
        remotes = self.get_remotes()
        if remotes:
            self.log(f"远程仓库: {', '.join([f'{k} ({v})' for k, v in remotes.items()])}")

        # 4. 检查状态
        has_changes, modified_files, untracked_files = self.check_status()

        if not has_changes:
            self.log("没有需要提交的改动")
            return

        # 5. 显示改动信息
        self.log(f"发现 {len(modified_files)} 个已修改文件, {len(untracked_files)} 个未跟踪文件")

        # 6. 生成或使用 commit message
        if custom_message:
            message = custom_message
            self.log(f"使用自定义 commit message: {message}")
        else:
            message = self.generate_commit_message(modified_files, untracked_files)
            self.log(f"生成 commit message: {message}")

        # 7. 添加所有改动
        self.stage_all_changes()

        # 8. 提交改动
        self.commit_changes(message)

        # 9. 推送到远程（如果需要）
        if not no_push:
            results = self.push_to_all_remotes(branch)

            # 汇总结果
            success_count = sum(1 for v in results.values() if v)
            total_count = len(results)

            if success_count == total_count:
                self.log(f"✓ 所有 {total_count} 个远程仓库推送成功")
            else:
                failed = [k for k, v in results.items() if not v]
                self.log(f"⚠️ {success_count}/{total_count} 个远程仓库推送成功，失败: {', '.join(failed)}", level="WARN")
        else:
            self.log("跳过推送步骤（--no-push）")


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description="Git Push 自动化工具 - 支持多远程仓库推送",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s                              # 自动生成 commit message 并推送到所有远程仓库
  %(prog)s -m "feat: 添加新功能"         # 使用自定义 commit message
  %(prog)s -r github origin             # 只推送到 github 和 origin
  %(prog)s --no-push                    # 只提交不推送
  %(prog)s --dry-run                    # 预览操作不实际执行
        """
    )

    parser.add_argument(
        "-m", "--message",
        type=str,
        help="自定义 commit message"
    )

    parser.add_argument(
        "-r", "--remotes",
        nargs="+",
        type=str,
        help="指定要推送的远程仓库（多个用空格分隔），默认推送所有"
    )

    parser.add_argument(
        "--no-push",
        action="store_true",
        help="只提交不推送到远程"
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="预览操作不实际执行"
    )

    args = parser.parse_args()

    # 创建 GitPusher 实例
    pusher = GitPusher(dry_run=args.dry_run, remotes=args.remotes)

    try:
        pusher.execute(
            custom_message=args.message,
            no_push=args.no_push
        )
        print("\n✅ 操作完成!")
        return 0

    except GitPushError as e:
        print(f"\n❌ 错误: {e}", file=sys.stderr)
        return 1

    except KeyboardInterrupt:
        print("\n\n⚠️  操作已取消", file=sys.stderr)
        return 130

    except Exception as e:
        print(f"\n❌ 未预期的错误: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
