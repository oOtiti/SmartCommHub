#!/usr/bin/env python
"""
数据导入器（psycopg2原生版）：
- 直接使用 psycopg2 连接 openGauss，规避 SQLAlchemy 版本解析问题
- Faker + 自定义校验，bcrypt 哈希密码
- 支持 --rows/--batch-size/--seed/--clean/--report
"""
from __future__ import annotations
import argparse
import os
import random
import time
from typing import List, Tuple

import bcrypt
from faker import Faker
from tqdm import tqdm
import psycopg2
from psycopg2.extras import execute_batch

# validators 同目录导入
import sys
CURRENT_DIR = os.path.dirname(__file__)
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)
from validators import valid_id_card, valid_phone, strong_password

# 读取并规范化连接串：转换为 postgresql URL，psycopg2 可识别
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://username:pswd@localhost:5432/smartcommhub")
DATABASE_URL = DATABASE_URL.replace("opengauss+psycopg2://", "postgresql://")
DATABASE_URL = DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://")

faker = Faker("zh_CN")
_seen_usernames: set[str] = set()

def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--rows", type=int, default=10000, help="总记录数（默认1w）")
    p.add_argument("--batch-size", type=int, default=5000, help="单批提交行数（默认5000）")
    p.add_argument("--seed", type=int, default=1, help="随机种子（可复现）")
    p.add_argument("--clean", action="store_true", help="导入前清空业务表")
    p.add_argument("--report", action="store_true", help="导入后输出报告")
    return p.parse_args()

def connect():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    return conn

def truncate_tables(conn):
    with conn.cursor() as cur:
        cur.execute("SET search_path TO public")
        for t in [
            "access_record","sys_usr_account","community_notice","health_record",
            "service_order","service_item","provider","family_member","elderly"
        ]:
            try:
                cur.execute(f"TRUNCATE TABLE public.{t} RESTART IDENTITY CASCADE")
                conn.commit()
            except Exception:
                conn.rollback()

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

def gen_username() -> str:
    # 避免 faker.unique 的池耗尽，改为自造后缀，并在本次运行内去重
    for _ in range(20):
        base = faker.user_name()
        suffix = random.randint(1000, 999999)
        uname = f"{base}{suffix}"
        if uname not in _seen_usernames:
            _seen_usernames.add(uname)
            return uname
    # 退避方案
    uname = f"user{int(time.time()*1000)}{random.randint(100,999)}"
    _seen_usernames.add(uname)
    return uname

def import_elderly_and_records(conn, rows: int, batch_size: int):
    with conn.cursor() as cur:
        cur.execute("SET search_path TO public")

    elderly_rows = max(1, rows // 5)
    hr_rows = rows

    # elderly 批量：使用 WHERE NOT EXISTS 保障幂等
    insert_elderly_sql = (
        "INSERT INTO elderly (name, id_card, age, health_level, emergency_contact, address, register_time) "
        "SELECT %(name)s, %(id_card)s, %(age)s, %(health_level)s, %(emergency_contact)s, %(address)s, now() "
        "WHERE NOT EXISTS (SELECT 1 FROM elderly e WHERE e.id_card = %(id_card)s)"
    )
    buf: List[dict] = []
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
            with conn.cursor() as cur:
                execute_batch(cur, insert_elderly_sql, buf, page_size=min(1000, batch_size))
                conn.commit()
            buf.clear()
    if buf:
        with conn.cursor() as cur:
            execute_batch(cur, insert_elderly_sql, buf, page_size=min(1000, batch_size))
            conn.commit()
        buf.clear()

    # elderly_id 集合
    with conn.cursor() as cur:
        cur.execute("SELECT elderly_id FROM elderly")
        ids = [row[0] for row in cur.fetchall()]
        if not ids:
            return

    # health_record 批量
    insert_hr_sql = (
        "INSERT INTO health_record (elderly_id, monitor_type, monitor_value, monitor_time, is_abnormal, device_id, created_at, updated_at) "
        "VALUES (%(elderly_id)s, %(monitor_type)s, %(monitor_value)s, %(monitor_time)s, %(is_abnormal)s, %(device_id)s, now(), now())"
    )
    buf = []
    now_ts = int(time.time())
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
            with conn.cursor() as cur:
                execute_batch(cur, insert_hr_sql, buf, page_size=min(1000, batch_size))
                conn.commit()
            buf.clear()
    if buf:
        with conn.cursor() as cur:
            execute_batch(cur, insert_hr_sql, buf, page_size=min(1000, batch_size))
            conn.commit()
        buf.clear()

def import_provider_and_items(conn, rows: int, batch_size: int):
    with conn.cursor() as cur:
        cur.execute("SET search_path TO public")
        # 获取字典值
        try:
            cur.execute("SELECT type_code FROM service_type_dict")
            service_types = [r[0] for r in cur.fetchall()] or ["home_care","meal","medical"]
        except Exception:
            service_types = ["home_care","meal","medical"]
        try:
            cur.execute("SELECT community_id FROM community_dict")
            communities = [r[0] for r in cur.fetchall()] or ["C001","C002"]
        except Exception:
            communities = ["C001","C002"]

    provider_rows = max(50, rows // 500)
    service_items_per_provider = 3

    insert_provider_sql = (
        "INSERT INTO provider (name, service_type, service_nature, qualification_id, contact, audit_status, belong_community) "
        "SELECT %(name)s, %(service_type)s, %(service_nature)s, %(qualification_id)s, %(contact)s, %(audit_status)s, %(belong_community)s "
        "WHERE NOT EXISTS (SELECT 1 FROM provider p WHERE p.qualification_id = %(qualification_id)s)"
    )
    buf = []
    for _ in tqdm(range(provider_rows), desc="生成provider"):
        buf.append({
            "name": faker.company(),
            "service_type": random.choice(service_types),
            "service_nature": random.choice(["公益","市场","混合"]),
            "qualification_id": f"Q-{faker.unique.bothify(text='??##??##')}",
            "contact": gen_phone(),
            "audit_status": random.choice(["pending","approved","rejected"]),
            "belong_community": random.choice(communities),
        })
        if len(buf) >= batch_size:
            with conn.cursor() as cur:
                execute_batch(cur, insert_provider_sql, buf, page_size=min(1000, batch_size))
                conn.commit()
            buf.clear()
    if buf:
        with conn.cursor() as cur:
            execute_batch(cur, insert_provider_sql, buf, page_size=min(1000, batch_size))
            conn.commit()
        buf.clear()

    # 获取 provider_id 列表
    with conn.cursor() as cur:
        cur.execute("SELECT provider_id, name FROM provider")
        providers: List[Tuple[int,str]] = cur.fetchall()
        if not providers:
            return

    insert_item_sql = (
        "INSERT INTO service_item (provider_id, name, content, duration, price, service_scope, status) "
        "SELECT %(provider_id)s, %(name)s, %(content)s, %(duration)s, %(price)s, %(service_scope)s, %(status)s "
        "WHERE NOT EXISTS (SELECT 1 FROM service_item si WHERE si.provider_id=%(provider_id)s AND si.name=%(name)s)"
    )
    buf = []
    for pid, pname in tqdm(providers, desc="生成service_item"):
        for k in range(service_items_per_provider):
            buf.append({
                "provider_id": pid,
                "name": f"{pname}-套餐{k+1}",
                "content": faker.text(max_nb_chars=120),
                "duration": random.choice(["30min","60min","90min"]),
                "price": round(random.uniform(10, 500), 2),
                "service_scope": random.choice(["上门","到店","远程"]),
                "status": random.choice(["online","offline","paused"]),
            })
            if len(buf) >= batch_size:
                with conn.cursor() as cur:
                    execute_batch(cur, insert_item_sql, buf, page_size=min(1000, batch_size))
                    conn.commit()
                buf.clear()
    if buf:
        with conn.cursor() as cur:
            execute_batch(cur, insert_item_sql, buf, page_size=min(1000, batch_size))
            conn.commit()
        buf.clear()

def import_family_members(conn, rows: int, batch_size: int):
    with conn.cursor() as cur:
        cur.execute("SET search_path TO public")
        cur.execute("SELECT elderly_id FROM elderly")
        elders = [r[0] for r in cur.fetchall()]
        if not elders:
            return
    fam_rows = max(1, len(elders))
    insert_sql = (
        "INSERT INTO family_member (name, phone, relation, permission_level, elderly_id) "
        "SELECT %(name)s, %(phone)s, %(relation)s, %(permission_level)s, %(elderly_id)s "
        "WHERE NOT EXISTS (SELECT 1 FROM family_member f WHERE f.phone = %(phone)s)"
    )
    buf = []
    for _ in tqdm(range(fam_rows), desc="生成family_member"):
        buf.append({
            "name": faker.name(),
            "phone": gen_phone(),
            "relation": random.choice(["子女","配偶","兄弟姐妹","亲戚"]),
            "permission_level": random.choice(["read","write","admin"]),
            "elderly_id": random.choice(elders),
        })
        if len(buf) >= batch_size:
            with conn.cursor() as cur:
                execute_batch(cur, insert_sql, buf, page_size=min(1000, batch_size))
                conn.commit()
            buf.clear()
    if buf:
        with conn.cursor() as cur:
            execute_batch(cur, insert_sql, buf, page_size=min(1000, batch_size))
            conn.commit()
        buf.clear()

def import_service_orders(conn, rows: int, batch_size: int):
    with conn.cursor() as cur:
        cur.execute("SET search_path TO public")
        cur.execute("SELECT elderly_id FROM elderly")
        elders = [r[0] for r in cur.fetchall()]
        cur.execute("SELECT service_id FROM service_item")
        items = [r[0] for r in cur.fetchall()]
        if not elders or not items:
            return
    order_rows = max(100, rows // 2)
    insert_sql = (
        "INSERT INTO service_order (elderly_id, service_id, reserve_time, service_time, order_status, pay_status, eval_score, eval_content, eval_time) "
        "SELECT %(elderly_id)s, %(service_id)s, %(reserve_time)s, %(service_time)s, %(order_status)s, %(pay_status)s, %(eval_score)s, %(eval_content)s, %(eval_time)s "
        "WHERE NOT EXISTS (SELECT 1 FROM service_order so WHERE so.elderly_id=%(elderly_id)s AND so.service_id=%(service_id)s AND so.service_time=%(service_time)s)"
    )
    buf = []
    now_ts = int(time.time())
    for _ in tqdm(range(order_rows), desc="生成service_order"):
        rt = now_ts - random.randint(20*24*3600, 40*24*3600)
        st = rt + random.randint(0, 10*24*3600)
        buf.append({
            "elderly_id": random.choice(elders),
            "service_id": random.choice(items),
            "reserve_time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(rt)),
            "service_time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(st)),
            "order_status": random.choice(["created","confirmed","in_service","finished","canceled"]),
            "pay_status": random.choice(["unpaid","paid","refunded"]),
            "eval_score": round(random.uniform(0, 10), 1),
            "eval_content": random.choice([faker.text(50), None]),
            "eval_time": random.choice([time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(st+3600)), None]),
        })
        if len(buf) >= batch_size:
            with conn.cursor() as cur:
                execute_batch(cur, insert_sql, buf, page_size=min(1000, batch_size))
                conn.commit()
            buf.clear()
    if buf:
        with conn.cursor() as cur:
            execute_batch(cur, insert_sql, buf, page_size=min(1000, batch_size))
            conn.commit()
        buf.clear()

def import_access_records(conn, rows: int, batch_size: int):
    with conn.cursor() as cur:
        cur.execute("SET search_path TO public")
        cur.execute("SELECT elderly_id FROM elderly")
        elders = [r[0] for r in cur.fetchall()]
        if not elders:
            return
    ar_rows = max(100, rows // 5)
    insert_sql = (
        "INSERT INTO access_record (elderly_id, access_type, record_time, gate_location, is_abnormal) "
        "SELECT %(elderly_id)s, %(access_type)s, %(record_time)s, %(gate_location)s, %(is_abnormal)s "
        "WHERE NOT EXISTS (SELECT 1 FROM access_record ar WHERE ar.elderly_id=%(elderly_id)s AND ar.record_time=%(record_time)s AND ar.access_type=%(access_type)s)"
    )
    buf = []
    now_ts = int(time.time())
    for _ in tqdm(range(ar_rows), desc="生成access_record"):
        ts = now_ts - random.randint(0, 7*24*3600)
        buf.append({
            "elderly_id": random.choice(elders),
            "access_type": random.choice(["IN","OUT"]),
            "record_time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(ts)),
            "gate_location": random.choice(["东门","西门","南门","北门"]),
            "is_abnormal": random.choice(["YES","NO"]),
        })
        if len(buf) >= batch_size:
            with conn.cursor() as cur:
                execute_batch(cur, insert_sql, buf, page_size=min(1000, batch_size))
                conn.commit()
            buf.clear()
    if buf:
        with conn.cursor() as cur:
            execute_batch(cur, insert_sql, buf, page_size=min(1000, batch_size))
            conn.commit()
        buf.clear()

def import_sys_users(conn, rows: int, batch_size: int):
    with conn.cursor() as cur:
        cur.execute("SET search_path TO public")
        cur.execute("SELECT elderly_id FROM elderly")
        elders = [r[0] for r in cur.fetchall()]
        cur.execute("SELECT family_id FROM family_member")
        fams = [r[0] for r in cur.fetchall()]
        cur.execute("SELECT provider_id FROM provider")
        provs = [r[0] for r in cur.fetchall()]
        # 读取已存在手机号集合，避免唯一约束冲突
        try:
            cur.execute("SELECT phone FROM sys_usr_account WHERE phone IS NOT NULL")
            existing_phones = {r[0] for r in cur.fetchall() if r[0]}
        except Exception:
            existing_phones = set()

    user_rows = max(100, rows // 10)
    insert_sql = (
        "INSERT INTO sys_usr_account (username, phone, password_hash, user_type, is_active, elderly_id, family_id, provider_id) "
        "SELECT %(username)s, %(phone)s, %(password_hash)s, %(user_type)s, TRUE, %(elderly_id)s, %(family_id)s, %(provider_id)s "
        "WHERE NOT EXISTS (SELECT 1 FROM sys_usr_account u WHERE u.username=%(username)s)"
    )
    buf = []
    generated_phones = set()
    for _ in tqdm(range(user_rows), desc="生成sys_usr_account"):
        ut = random.choice([1, 2, 3])
        eid = random.choice(elders) if elders and ut == 1 else None
        fid = random.choice(fams) if fams and ut == 1 and random.random() < 0.5 else None
        pid = random.choice(provs) if provs and ut == 2 else None
        uname = gen_username()
        phone = None
        if random.random() < 0.7:
            # 尝试生成不与已存在或本批重复的号码
            for _ in range(10):
                cand = gen_phone()
                if cand not in existing_phones and cand not in generated_phones:
                    phone = cand
                    generated_phones.add(cand)
                    break
        buf.append({
            "username": uname,
            "phone": phone,
            "password_hash": hash_password(faker.password(length=10)),
            "user_type": ut,
            "elderly_id": eid,
            "family_id": fid,
            "provider_id": pid,
        })
        if len(buf) >= batch_size:
            with conn.cursor() as cur:
                execute_batch(cur, insert_sql, buf, page_size=min(1000, batch_size))
                conn.commit()
            buf.clear()
    if buf:
        with conn.cursor() as cur:
            execute_batch(cur, insert_sql, buf, page_size=min(1000, batch_size))
            conn.commit()
        buf.clear()

def import_notices(conn, rows: int, batch_size: int):
    with conn.cursor() as cur:
        cur.execute("SET search_path TO public")
        try:
            cur.execute("SELECT community_id FROM community_dict")
            communities = [r[0] for r in cur.fetchall()] or ["C001","C002"]
        except Exception:
            communities = ["C001","C002"]
    notice_rows = max(20, rows // 1000)
    insert_sql = (
        "INSERT INTO community_notice (community_id, title, content, publish_time, target_group) "
        "SELECT %(community_id)s, %(title)s, %(content)s, %(publish_time)s, %(target_group)s "
        "WHERE NOT EXISTS (SELECT 1 FROM community_notice n WHERE n.title=%(title)s AND n.publish_time=%(publish_time)s)"
    )
    buf = []
    now_ts = int(time.time())
    for _ in tqdm(range(notice_rows), desc="生成community_notice"):
        ts = now_ts - random.randint(0, 60*24*3600)
        buf.append({
            "community_id": random.choice(communities),
            "title": faker.sentence(nb_words=5),
            "content": faker.text(max_nb_chars=200),
            "publish_time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(ts)),
            "target_group": random.choice(["老人","家属","服务商","全部"]),
        })
        if len(buf) >= batch_size:
            with conn.cursor() as cur:
                execute_batch(cur, insert_sql, buf, page_size=min(1000, batch_size))
                conn.commit()
            buf.clear()
    if buf:
        with conn.cursor() as cur:
            execute_batch(cur, insert_sql, buf, page_size=min(1000, batch_size))
            conn.commit()
        buf.clear()

def import_fixed_test_accounts(conn) -> List[Tuple[str,str]]:
    """插入一组固定测试账户（admin/operator/provider/elderly/family），返回 (username, plaintext)。"""
    with conn.cursor() as cur:
        cur.execute("SET search_path TO public")
        # 关联ID用于部分账户绑定
        cur.execute("SELECT elderly_id FROM elderly LIMIT 50")
        elders = [r[0] for r in cur.fetchall()]
        cur.execute("SELECT family_id FROM family_member LIMIT 50")
        fams = [r[0] for r in cur.fetchall()]
        cur.execute("SELECT provider_id FROM provider LIMIT 50")
        provs = [r[0] for r in cur.fetchall()]

    accounts: List[Tuple[str,str,int,dict]] = []
    for i in range(1, 6):
        accounts.append((f"admin{i:03d}", "Admin@12345", 3, {}))
    for i in range(1, 11):
        accounts.append((f"operator{i:03d}", "Operator@12345", 2, {}))
    for i in range(1, 11):
        pid = provs[i % len(provs)] if provs else None
        accounts.append((f"provider{i:03d}", "Provider@12345", 2, {"provider_id": pid}))
    for i in range(1, 11):
        eid = elders[i % len(elders)] if elders else None
        accounts.append((f"elderly{i:03d}", "Elderly@12345", 1, {"elderly_id": eid}))
    for i in range(1, 11):
        fid = fams[i % len(fams)] if fams else None
        accounts.append((f"family{i:03d}", "Family@12345", 1, {"family_id": fid}))

    sql = (
        "INSERT INTO sys_usr_account (username, phone, password_hash, user_type, is_active, elderly_id, family_id, provider_id, created_at, updated_at) "
        "SELECT %(username)s, %(phone)s, %(password_hash)s, %(user_type)s, TRUE, %(elderly_id)s, %(family_id)s, %(provider_id)s, now(), now() "
        "WHERE NOT EXISTS (SELECT 1 FROM sys_usr_account u WHERE u.username = %(username)s)"
    )
    buf = []
    for username, plain, utype, extras in accounts:
        buf.append({
            "username": username,
            # 固定测试账号不写入手机号，避免与随机数据冲突
            "phone": None,
            "password_hash": hash_password(plain),
            "user_type": utype,
            "elderly_id": extras.get("elderly_id"),
            "family_id": extras.get("family_id"),
            "provider_id": extras.get("provider_id"),
        })
    with conn.cursor() as cur:
        execute_batch(cur, sql, buf, page_size=min(1000, len(buf) or 1))
        conn.commit()
    return [(u, p) for (u, p, _, _) in accounts]

def write_plaintext_keys(keys: List[Tuple[str,str]]):
    """将测试账户明文写入 scripts/TEST_key.txt（覆盖写）。"""
    root_scripts = os.path.dirname(os.path.dirname(__file__))
    out = os.path.join(root_scripts, "TEST_key.txt")
    lines = ["# 测试账户明文（仅用于联调与本地验证，不用于生产）"]
    for u, p in keys:
        lines.append(f"{u}: {p}")
    with open(out, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

def write_report(conn):
    lines = []
    with conn.cursor() as cur:
        for t in [
            "elderly","family_member","provider","service_item","service_order",
            "health_record","community_notice","sys_usr_account","access_record"
        ]:
            try:
                cur.execute(f"SELECT pg_size_pretty(pg_total_relation_size('{t}'))")
                size = cur.fetchone()[0]
                lines.append(f"{t}: {size}")
            except Exception:
                lines.append(f"{t}: N/A")
        try:
            cur.execute("SELECT count(*) FROM pg_encrypted_columns")
            cnt = cur.fetchone()[0]
            lines.append(f"encrypted_columns_count: {cnt}")
        except Exception:
            lines.append("encrypted_columns_count: N/A")
    out = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs", "import_report.txt")
    with open(out, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

def main():
    args = parse_args()
    random.seed(args.seed)
    Faker.seed(args.seed)
    conn = connect()
    try:
        if args.clean:
            truncate_tables(conn)
        import_elderly_and_records(conn, rows=args.rows, batch_size=args.batch_size)
        import_provider_and_items(conn, rows=args.rows, batch_size=args.batch_size)
        import_family_members(conn, rows=args.rows, batch_size=args.batch_size)
        import_service_orders(conn, rows=args.rows, batch_size=args.batch_size)
        import_access_records(conn, rows=args.rows, batch_size=args.batch_size)
        import_sys_users(conn, rows=args.rows, batch_size=args.batch_size)
        import_notices(conn, rows=args.rows, batch_size=args.batch_size)
        # 固定测试账户 + 明文写入
        keys = import_fixed_test_accounts(conn)
        write_plaintext_keys(keys)
        if args.report:
            write_report(conn)
    finally:
        conn.close()

if __name__ == "__main__":
    main()
