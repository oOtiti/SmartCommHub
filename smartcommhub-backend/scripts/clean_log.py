#!/usr/bin/env python3
"""
清理后端日志的工具

用法：
  - 清空默认的 app.log:           python scripts/clean_log.py --truncate
  - 删除轮换的 backups (app.log.*): python scripts/clean_log.py --prune-backups
  - 清除 logs/ 目录下的所有 *.log:           python scripts/clean_log.py --clear-all
  - 指定自定义文件并截断：                python scripts/clean_log.py --file logs/custom.log --truncate
"""
from __future__ import annotations
import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LOG_FILE = BACKEND_ROOT / "logs" / "app.log"
LOGS_DIR = BACKEND_ROOT / "logs"


def truncate_log(file_path: Path) -> None:
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text("")
    print(f"Truncated: {file_path}")


def prune_backups(logs_dir: Path, base_name: str = "app.log") -> None:
    count = 0
    for p in logs_dir.glob(f"{base_name}.*"):
        try:
            p.unlink()
            count += 1
        except Exception as e:
            print(f"Skip {p}: {e}")
    print(f"Removed backups: {count}")


def clear_all_logs(logs_dir: Path) -> None:
    count = 0
    for p in logs_dir.glob("*.log"):
        try:
            p.unlink()
            count += 1
        except Exception as e:
            print(f"Skip {p}: {e}")
    print(f"Cleared *.log files: {count}")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Backend log cleaner")
    parser.add_argument("--file", type=str, default=str(DEFAULT_LOG_FILE), help="Target log file to truncate")
    parser.add_argument("--truncate", action="store_true", help="Truncate the target log file")
    parser.add_argument("--prune-backups", action="store_true", help="Remove rotated backups: app.log.*")
    parser.add_argument("--clear-all", action="store_true", help="Remove all *.log under logs directory")

    args = parser.parse_args(argv)

    file_path = Path(args.file)
    if not file_path.is_absolute():
        file_path = BACKEND_ROOT / file_path

    if args.truncate:
        truncate_log(file_path)
    if args.prune_backups:
        prune_backups(LOGS_DIR, base_name=file_path.name)
    if args.clear_all:
        clear_all_logs(LOGS_DIR)

    if not any([args.truncate, args.prune_backups, args.clear_all]):
        parser.print_help()
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
