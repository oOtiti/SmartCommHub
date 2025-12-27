
"""
数据导入器（CLI）：
- 异步批量写入（sqlalchemy.ext.asyncio / asyncpg）
- Faker + 自定义 Provider 生成合法数据
- 密码统一存储 bcrypt 哈希（永不明文落盘）
- 支持 --rows S/M/L 三档、--clean 幂等重跑、--report 导入报告
"""
from __future__ import annotations
import argparse
import asyncio
import os
import random
import time
from typing import List, Tuple

import bcrypt
from faker import Faker
from tqdm import tqdm
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

import sys
CURRENT_DIR = os.path.dirname(__file__)
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)
from validators import valid_id_card, valid_phone, strong_password

# 读取连接串：优先环境变量 DATABASE_URL；否则默认本地smartcommhub
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://username:pswd@localhost:5432/smartcommhub")
if DATABASE_URL.startswith("opengauss+psycopg2://"):
    DATABASE_URL = DATABASE_URL.replace("opengauss+psycopg2://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql+psycopg2://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)

faker = Faker("zh_CN")

def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--rows", type=int, default=10000, help="总记录数（默认1w）")
    p.add_argument("--batch-size", type=int, default=5000, help="单批提交行数（默认5000）")
    p.add_argument("--workers", type=int, default=8, help="并发协程数（默认8）")
    p.add_argument("--seed", type=int, default=1, help="随机种子（可复现）")
    p.add_argument("--clean", action="store_true", help="导入前清空业务表")
    p.add_argument("--report", action="store_true", help="导入后输出报告")
    return p.parse_args()

async def async_main():
    args = parse_args()
    random.seed(args.seed)
    Faker.seed(args.seed)

    engine = create_async_engine(DATABASE_URL, echo=False, pool_size=5, max_overflow=5)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with engine.begin() as conn:
        # 设置 schema，避免 search_path 异常
        await conn.execute(text("SET search_path TO public"))

    if args.clean:
        await truncate_tables(async_session)

    # 示例：批量生成 elderly 与 health_record（其余表留空位后续补充）
    await import_elderly_and_records(async_session, rows=args.rows, batch_size=args.batch_size, workers=args.workers)

    if args.report:
        await write_report(async_session)

    await engine.dispose()

async def truncate_tables(async_session_maker):
    async with async_session_maker() as s:
        tables = [
            "access_record","sys_usr_account","community_notice","health_record",
            "service_order","service_item","provider","family_member","elderly"
        ]
        for t in tables:
            try:
                await s.execute(text(f"TRUNCATE TABLE public.{t} RESTART IDENTITY CASCADE"))
                await s.commit()
            except Exception:
                await s.rollback()

def gen_id_card() -> str:
    # 简化示例：使用 faker + 规则校验直到合法（生产可用更严谨生成器）
    for _ in range(10):
        candidate = faker.ssn()
        if valid_id_card(candidate):
            return candidate
    # 兜底：返回固定格式（演示用）
    return "110105199001011234"

def gen_phone() -> str:
    for _ in range(10):
        num = faker.phone_number()
        digits = ''.join([c for c in num if c.isdigit()])
        if len(digits) == 11 and valid_phone(digits):
            return digits
    return "13800138000"

def hash_password(plain: str) -> str:
    if not strong_password(plain):
        # 不满足复杂度则补强（演示）
        plain = plain + "#A1"
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")

async def import_elderly_and_records(async_session_maker, rows: int, batch_size: int, workers: int):
    # elderly 规模：rows 的 1/5；health_record：rows 的 5/5（示例）
    elderly_rows = max(1, rows // 5)
    hr_rows = rows

    # 生成老人数据并插入
    async with async_session_maker() as s:
        buf = []
        for i in tqdm(range(elderly_rows), desc="生成elderly"):
            buf.append({
                "name": faker.name(),
                "id_card": gen_id_card(),
                "age": random.randint(60, 95),
                "health_level": random.choice(["A","B","C"]),
                "emergency_contact": gen_phone(),
                "address": faker.address().replace("\n"," "),
            })
            if len(buf) >= batch_size:
                await bulk_insert_elderly(s, buf)
                buf.clear()
        if buf:
            await bulk_insert_elderly(s, buf)

    # 查询所有elderly_id
    async with async_session_maker() as s:
        res = await s.execute(text("SELECT elderly_id FROM elderly"))
        ids = [r[0] for r in res.fetchall()]
        if not ids:
            return

    # 生成健康记录数据（心率/血压交错），按时间序列分布近一月
    async with async_session_maker() as s:
        buf = []
        now = int(time.time())
        for i in tqdm(range(hr_rows), desc="生成health_record"):
            eid = random.choice(ids)
            ts = now - random.randint(0, 30*24*3600)
            mt = random.choice(["heart_rate","blood_pressure"])
            if mt == "heart_rate":
                val = random.randint(60, 100)
                # 10% 异常
                if random.random() < 0.1:
                    val = random.randint(120, 150)
            else:
                val = random.randint(110, 140)
                if random.random() < 0.1:
                    val = random.randint(140, 160)
            is_abnormal = 1 if (mt == "heart_rate" and val > 100) or (mt == "blood_pressure" and val > 140) else 0
            buf.append({
                "elderly_id": eid,
                "monitor_type": mt,
                "monitor_value": float(val),
                "monitor_time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(ts)),
                "is_abnormal": is_abnormal,
                "device_id": "mock_device_001",
            })
            if len(buf) >= batch_size:
                await bulk_insert_health_record(s, buf)
                buf.clear()
        if buf:
            await bulk_insert_health_record(s, buf)

async def bulk_insert_elderly(s: AsyncSession, rows: List[dict]):
    # 使用 executemany 提升性能；幂等由唯一约束保证（冲突忽略）
    stmt = text("""
        INSERT INTO elderly (name, id_card, age, health_level, emergency_contact, address, register_time)
        VALUES (:name, :id_card, :age, :health_level, :emergency_contact, :address, now())
        ON CONFLICT (id_card) DO NOTHING
    """)
    await s.execute(stmt, rows)
    await s.commit()

async def bulk_insert_health_record(s: AsyncSession, rows: List[dict]):
    stmt = text("""
        INSERT INTO health_record (elderly_id, monitor_type, monitor_value, monitor_time, is_abnormal, device_id, created_at, updated_at)
        VALUES (:elderly_id, :monitor_type, :monitor_value, :monitor_time, :is_abnormal, :device_id, now(), now())
    """)
    await s.execute(stmt, rows)
    await s.commit()

async def write_report(async_session_maker):
    async with async_session_maker() as s:
        # 简要体积与抽样校验
        tables = [
            "elderly","family_member","provider","service_item","service_order",
            "health_record","community_notice","sys_usr_account","access_record"
        ]
        lines = []
        for t in tables:
            try:
                size = await s.execute(text(f"SELECT pg_size_pretty(pg_total_relation_size('{t}'))"))
                size_str = size.scalar() or "N/A"
                lines.append(f"{t}: {size_str}")
            except Exception:
                lines.append(f"{t}: N/A")
        # 加密列存在性（若环境支持）
        try:
            enc = await s.execute(text("SELECT count(*) FROM pg_encrypted_columns"))
            lines.append(f"encrypted_columns_count: {enc.scalar()} ")
        except Exception:
            lines.append("encrypted_columns_count: N/A")

        out = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs", "import_report.txt")
        with open(out, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

if __name__ == "__main__":
    asyncio.run(async_main())
