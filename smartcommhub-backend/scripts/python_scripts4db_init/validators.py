"""
字段级正则与校验函数，供模型层与API层复用。
"""
from __future__ import annotations
import re
from typing import Optional

ID_CARD_RE = re.compile(r"^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$")
PHONE_RE = re.compile(r"^1[3-9]\d{9}$")
EMAIL_RE = re.compile(r"^[\w\.-]+@([\w-]+\.)+[\w-]{2,4}$")

SPECIAL_RE = re.compile(r"[!@#$%^&*(),.?/:;{}\[\]<>_+-]")
UPPER_RE = re.compile(r"[A-Z]")
LOWER_RE = re.compile(r"[a-z]")
DIGIT_RE = re.compile(r"\d")

def valid_id_card(s: str) -> bool:
    """身份证号正则校验（18位含校验位）。"""
    return bool(ID_CARD_RE.match(s))

def valid_phone(s: str) -> bool:
    """手机号 1[3-9] 开头 11 位。"""
    return bool(PHONE_RE.match(s))

def valid_email(s: str) -> bool:
    """邮箱格式校验。"""
    return bool(EMAIL_RE.match(s))

def strong_password(s: str, min_len: int = 8) -> bool:
    """密码复杂度校验：长度≥min_len，含大小写、数字、特殊符号。"""
    if not s or len(s) < min_len:
        return False
    return all([
        bool(UPPER_RE.search(s)),
        bool(LOWER_RE.search(s)),
        bool(DIGIT_RE.search(s)),
        bool(SPECIAL_RE.search(s)),
    ])

def luhn_check(number: str) -> bool:
    """银行卡 Luhn 算法校验。"""
    if not number or not number.isdigit():
        return False
    digits = [int(x) for x in number]
    checksum = 0
    parity = len(digits) % 2
    for i, d in enumerate(digits):
        if i % 2 == parity:
            d *= 2
            if d > 9:
                d -= 9
        checksum += d
    return checksum % 10 == 0
