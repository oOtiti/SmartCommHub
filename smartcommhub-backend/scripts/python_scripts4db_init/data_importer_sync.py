#!/usr/bin/env python
"""
数据导入器（同步版）：
- 使用 SQLAlchemy + psycopg2 同步驱动，兼容 openGauss server_version
- Faker + 自定义校验，bcrypt 哈希密码
- 支持 --rows/--batch-size/--seed/--clean/--report
"""
from __future__ import annotations
import argparse
import os
import random
import time
from typing import List

import bcrypt
from faker import Faker
from tqdm import tqdm
from sqlalchemy import create_engine, text

# validators 同目录导入
import sys
CURRENT_DIR = os.path.dirname(__file__)
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)
from validators import valid_id_card, valid_phone, strong_password

# 读取并规范化连接串：保持 psycopg2 同步驱动
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://username:pswd@localhost:5432/smartcommhub")
DATABASE_URL = DATABASE_URL.replace("opengauss+psycopg2://", "postgresql+psycopg2://")

faker = Faker("zh_CN")

def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--rows", type=int, default=10000, help="总记录数（默认1w）")
    p.add_argument("--batch-size", type=int, default=5000, help="单批提交行数（默认5000）")
    p.add_argument("--seed", type=int, default=1, help="随机种子（可复现）")
    p.add_argument("--clean", action="store_true", help="导入前清空业务表")
    p.add_argument("--report", action="store_true", help="导入后输出报告")
    return p.parse_args()

def main():
    args = parse_args()
    random.seed(args.seed)
    Faker.seed(args.seed)

    engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)

    with engine.begin() as conn:
        conn.execute(text("SET search_path TO public"))

    if args.clean:
        truncate_tables(engine)

    import_elderly_and_records(engine, rows=args.rows, batch_size=args.batch_size)

    if args.report:
        write_report(engine)

def truncate_tables(engine):
    with engine.begin() as conn:
        tables = [
            "access_record","sys_usr_account","community_notice","health_record",
            "service_order","service_item","provider","family_member","elderly"
        ]
        for t in tables:
            try:
                conn.execute(text(f"TRUNCATE TABLE public.{t} RESTART IDENTITY CASCADE"))
            except Exception:
                pass

def gen_id_card() -> str:
    for _ in range(10):
        candidate = faker.ssn()
        if valid_id_card(candidate):
            return candidate
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
        plain = plain + "#A1"
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")

def import_elderly_and_records(engine, rows: int, batch_size: int):
    elderly_rows = max(1, rows // 5)
    hr_rows = rows

    # elderly 批量
    insert_elderly_sql = text(
        """
        INSERT INTO elderly (name, id_card, age, health_level, emergency_contact, address, register_time)
        SELECT :name, :id_card, :age, :health_level, :emergency_contact, :address, now()
        WHERE NOT EXISTS (
          SELECT 1 FROM elderly e WHERE e.id_card = :id_card
        )
        """
    )
    buf = []
    with engine.begin() as conn:
        for _ in tqdm(range(elderly_rows), desc="生成elderly"):
            buf.append({
                "name": faker.name(),
                "id_card": gen_id_card(),
                "age": random.randint(60, 95),
                "health_level": random.choice(["A","B","C"]),
                "emergency_contact": gen_phone(),
                "address": faker.address().replace("\n"," "),
            })
            if len(buf) >= batch_size:
                conn.execute(insert_elderly_sql, buf)
                buf.clear()
        if buf:
            conn.execute(insert_elderly_sql, buf)
            buf.clear()

    # elderly_id 集合
    with engine.connect() as conn:
        res = conn.execute(text("SELECT elderly_id FROM elderly"))
        ids = [row[0] for row in res.fetchall()]
        if not ids:
            return

    # health_record 批量
    insert_hr_sql = text(
        """
        INSERT INTO health_record (elderly_id, monitor_type, monitor_value, monitor_time, is_abnormal, device_id, created_at, updated_at)
        VALUES (:elderly_id, :monitor_type, :monitor_value, :monitor_time, :is_abnormal, :device_id, now(), now())
        """
    )
    buf = []
    now_ts = int(time.time())
    with engine.begin() as conn:
        for _ in tqdm(range(hr_rows), desc="生成health_record"):
            eid = random.choice(ids)
            ts = now_ts - random.randint(0, 30*24*3600)
            mt = random.choice(["heart_rate","blood_pressure"])
            if mt == "heart_rate":
                val = random.randint(60, 100)
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
                conn.execute(insert_hr_sql, buf)
                buf.clear()
        if buf:
            conn.execute(insert_hr_sql, buf)
            buf.clear()

def write_report(engine):
    lines = []
    with engine.connect() as conn:
        tables = [
            "elderly","family_member","provider","service_item","service_order",
            "health_record","community_notice","sys_usr_account","access_record"
        ]
        for t in tables:
            try:
                size = conn.execute(text(f"SELECT pg_size_pretty(pg_total_relation_size('{t}'))")).scalar()
                lines.append(f"{t}: {size or 'N/A'}")
            except Exception:
                lines.append(f"{t}: N/A")
        try:
            enc_count = conn.execute(text("SELECT count(*) FROM pg_encrypted_columns")).scalar()
            lines.append(f"encrypted_columns_count: {enc_count}")
        except Exception:
            lines.append("encrypted_columns_count: N/A")
    out = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs", "import_report.txt")
    with open(out, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

if __name__ == "__main__":
    main()
