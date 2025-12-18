#!/usr/bin/env python3
"""
批量创建账户脚本：
- 扫描 elderly、family_member、provider 三表
- 对于尚未在 sys_usr_account 绑定的记录，创建账户：
  - username: eld_{elderly_id} / fam_{family_id} / pro_{provider_id}
  - user_type: 1=老人, 2=家属, 3=服务商（如库内约定不同，请按需修改）
  - 密码：随机生成；明文写入 scripts/resouse/usr_key_abstract.txt；数据库仅存 hash
- 处理 phone 唯一约束：若冲突或不可用则置为 NULL

用法：
    PYTHONPATH=. python3 scripts/bulk_create_accounts.py
"""
from __future__ import annotations
import os
import secrets
import string
from dataclasses import dataclass
from typing import Dict, Set, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.logging import logger
from app.core.security import get_password_hash
from app.models.user import User
from app.models.elderly import Elderly
from app.models.family_member import FamilyMember
from app.models.provider import Provider

RES_DIR = os.path.join(os.path.dirname(__file__), "resouse")
RES_FILE = os.path.join(RES_DIR, "usr_key_abstract.txt")

@dataclass
class Created:
    username: str
    plain_pwd: str
    user_type: int
    bind: str

ALPHABET = string.ascii_letters + string.digits
SPECIALS = "!@#%_+-="


def gen_password(n: int = 12) -> str:
    # 至少包含大小写、数字、特殊字符
    pwd = [
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.digits),
        secrets.choice(SPECIALS),
    ]
    pwd += [secrets.choice(ALPHABET + SPECIALS) for _ in range(max(0, n - 4))]
    secrets.SystemRandom().shuffle(pwd)
    return "".join(pwd)


def load_used_phones(db: Session) -> Set[str]:
    stmt = select(User.phone).where(User.phone.isnot(None))
    return {row[0] for row in db.execute(stmt).all() if row[0]}


def bulk_create() -> Tuple[int, int, int, Dict[str, Created]]:
    os.makedirs(RES_DIR, exist_ok=True)
    created: Dict[str, Created] = {}
    total_e = total_f = total_p = 0

    db: Session = SessionLocal()
    try:
        used_phones = load_used_phones(db)

        # Elderly
        elderly_ids = {row[0] for row in db.execute(select(Elderly.elderly_id)).all()}
        existing_e = {row[0] for row in db.execute(select(User.elderly_id).where(User.elderly_id.isnot(None))).all()}
        for eid in sorted(elderly_ids - set(filter(None, existing_e))):
            username = f"eld_{eid}"
            plain = gen_password()
            user = User(
                username=username,
                password_hash=get_password_hash(plain),
                user_type=1,
                is_active=True,
                elderly_id=eid,
            )
            db.add(user)
            created[username] = Created(username, plain, 1, f"elderly_id={eid}")
            total_e += 1

        # FamilyMember
        fam_rows = db.execute(select(FamilyMember.family_id, FamilyMember.phone)).all()
        existing_f = {row[0] for row in db.execute(select(User.family_id).where(User.family_id.isnot(None))).all()}
        for fid, phone in fam_rows:
            if fid in existing_f:
                continue
            username = f"fam_{fid}"
            plain = gen_password()
            phone_to_set = phone if (phone and phone not in used_phones) else None
            if phone_to_set:
                used_phones.add(phone_to_set)
            user = User(
                username=username,
                phone=phone_to_set,
                password_hash=get_password_hash(plain),
                user_type=2,
                is_active=True,
                family_id=fid,
            )
            db.add(user)
            created[username] = Created(username, plain, 2, f"family_id={fid}")
            total_f += 1

        # Provider
        prov_ids = {row[0] for row in db.execute(select(Provider.provider_id)).all()}
        existing_p = {row[0] for row in db.execute(select(User.provider_id).where(User.provider_id.isnot(None))).all()}
        for pid in sorted(prov_ids - set(filter(None, existing_p))):
            username = f"pro_{pid}"
            plain = gen_password()
            user = User(
                username=username,
                password_hash=get_password_hash(plain),
                user_type=3,
                is_active=True,
                provider_id=pid,
            )
            db.add(user)
            created[username] = Created(username, plain, 3, f"provider_id={pid}")
            total_p += 1

        db.commit()

        # 写明文映射
        with open(RES_FILE, "w", encoding="utf-8") as f:
            for k in sorted(created.keys()):
                c = created[k]
                f.write(f"{c.username},{c.plain_pwd},{c.user_type},{c.bind}\n")

        logger.info("Accounts created: elderly=%d, family=%d, provider=%d. Output: %s", total_e, total_f, total_p, RES_FILE)
        return total_e, total_f, total_p, created
    except Exception as e:
        db.rollback()
        logger.exception("批量创建账户失败: %s", e)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    e, f, p, _ = bulk_create()
    print(f"created elderly={e}, family={f}, provider={p}; see: {RES_FILE}")
