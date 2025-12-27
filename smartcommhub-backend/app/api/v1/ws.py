# -*- coding: utf-8 -*-
"""
WebSocket 预警通道（最小可用实现）
- /ws/warning：客户端连接后，将实时接收异常预警消息。
- 从后台线程（MQTT 消费者）安全入队，异步协程周期性广播给所有连接客户端。

可改进的核心算法（由你优化）：
- 消息聚合与抖动控制：当前直接逐条广播，可加入节流/合并。
- 用户/会话权限控制：按老人ID或社区分组推送；当前为公共通道。
"""
from __future__ import annotations
import asyncio
from collections import deque
from typing import Any, Deque, Dict, Set, Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

_clients: Set[WebSocket] = set()
# 每个客户端的订阅过滤（允许的 elderly_id 集合；None 表示公共订阅）
_filters: Dict[WebSocket, Optional[Set[int]]] = {}
# 线程安全：生产者（线程）只追加；消费者（协程）单线程读取
_msg_queue: Deque[Dict[str, Any]] = deque()
_queue_lock = asyncio.Lock()  # 仅在协程侧使用，线程侧不等待事件循环


def push_warning(payload: Dict[str, Any]) -> None:
    """供后台线程调用：将预警消息入队，等待协程侧广播。"""
    # 注意：不能在此处使用 asyncio API（线程上下文）
    _msg_queue.append(payload)


async def _drain_and_broadcast():
    """周期性检查队列并广播给所有客户端。"""
    while True:
        # 取出队列中所有消息（批量发送）
        if _msg_queue:
            batch = []
            while _msg_queue:
                batch.append(_msg_queue.popleft())
            dead = []
            for ws in list(_clients):
                try:
                    # 过滤：仅推送匹配 elderly_id 的消息；公共订阅则全部推送
                    allow = _filters.get(ws)
                    for msg in batch:
                        if isinstance(allow, set):
                            try:
                                eid = int(msg.get("elderly_id"))
                            except Exception:
                                eid = None
                            if eid is None or eid not in allow:
                                continue
                        await ws.send_json(msg)
                except Exception:
                    dead.append(ws)
            for d in dead:
                try:
                    _clients.discard(d)
                    await d.close()
                except Exception:
                    pass
        await asyncio.sleep(0.2)  # 200ms 批次扫描，降低广播开销


@router.websocket("/ws/warning")
async def ws_warning(ws: WebSocket):
    # 握手阶段：强制要求 token；解析订阅老人集合（家庭组或绑定老人）
    from jose import jwt, JWTError
    from app.core.config import settings
    from app.core.database import SessionLocal
    from app.services.user_service import user_service
    from app.dao.family_member_dao import family_member_dao

    allow_ids: Optional[Set[int]] = None
    qp = ws.query_params
    # 1) 显式订阅（elderly_id）
    try:
        if "elderly_id" in qp:
            eid = int(qp.get("elderly_id"))
            allow_ids = allow_ids or set()
            allow_ids.add(eid)
    except Exception:
        pass
    # 2) Token 鉴权（解析用户绑定的 elderly/family）
    token = qp.get("token")
    if not token:
        # 未携带 token，拒绝连接
        await ws.close(code=1008)  # Policy Violation
        return
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username = payload.get("sub")
        if not username:
            await ws.close(code=1008)
            return
        with SessionLocal() as db:
            user = user_service.get_by_username(db, username)
            if not user:
                await ws.close(code=1008)
                return
            # 管理员/运营：允许接收全部（演示/运营用途）
            # user_type 使用数值枚举，参考 deps.require_admin: 0/4 为管理员
            ut = getattr(user, "user_type", None)
            if ut in (0, 4):
                allow_ids = None
            else:
                allow_ids = allow_ids or set()
                # 用户直接绑定 elderly_id
                if getattr(user, "elderly_id", None):
                    allow_ids.add(int(user.elderly_id))
                # 家属通过 family_id -> group -> elderly 集合
                elif getattr(user, "family_id", None):
                    from app.services.family_group_service import family_group_service
                    elder_ids = family_group_service.elders_by_family_id(db, int(user.family_id))
                    if elder_ids:
                        allow_ids.update(int(e) for e in elder_ids)
                    else:
                        # 回退：通过 family_member 绑定的单个老人
                        fm = family_member_dao.get(db, int(user.family_id))
                        if fm and getattr(fm, "elderly_id", None):
                            allow_ids.add(int(fm.elderly_id))
    except JWTError:
        await ws.close(code=1008)
        return

    await ws.accept()
    _clients.add(ws)
    _filters[ws] = allow_ids  # None 表示允许全部；set 表示过滤订阅
    try:
        while True:
            # 客户端发来的任意消息都忽略，仅用于保活
            await ws.receive_text()
    except WebSocketDisconnect:
        _clients.discard(ws)
        _filters.pop(ws, None)
    except Exception:
        _clients.discard(ws)
        _filters.pop(ws, None)
        try:
            await ws.close()
        except Exception:
            pass


async def start_broadcast_loop():
    """应用启动时由 main 调用，创建广播后台任务。"""
    asyncio.create_task(_drain_and_broadcast(), name="ws-broadcast-loop")
