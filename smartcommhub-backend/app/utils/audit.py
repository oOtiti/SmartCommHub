from typing import Optional, Any, Dict
from sqlalchemy.orm import Session
from app.core.logging import logger


def audit_log(
    db: Session,
    actor_id: Optional[int],
    action: str,
    resource: str,
    resource_id: Optional[int] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> None:
    # 目前先写入应用日志；未来可接入审计表或外部系统
    logger.info(
        "AUDIT actor=%s action=%s resource=%s resource_id=%s extra=%s",
        str(actor_id) if actor_id is not None else "anonymous",
        action,
        resource,
        str(resource_id) if resource_id is not None else None,
        extra or {},
    )
