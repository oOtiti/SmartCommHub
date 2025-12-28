# 路由聚合
from fastapi import APIRouter
from app.api.v1 import auth as auth_v1
from app.api.v1 import elderly as elderly_v1
from app.api.v1 import providers as providers_v1
from app.api.v1 import services as services_v1
from app.api.v1 import orders as orders_v1
from app.api.v1 import health as health_v1
from app.api.v1 import access as access_v1
from app.api.v1 import notices as notices_v1
from app.api.v1 import edge as edge_v1
from app.api.v1 import families as families_v1
from app.api.v1 import alerts as alerts_v1

api_router = APIRouter()

api_router.include_router(auth_v1.router, prefix="/auth", tags=["auth"])
api_router.include_router(elderly_v1.router, prefix="/elders", tags=["elders"])
api_router.include_router(providers_v1.router, prefix="/providers", tags=["providers"])
api_router.include_router(services_v1.router, prefix="/services", tags=["services"])
api_router.include_router(orders_v1.router, prefix="/orders", tags=["orders"])
api_router.include_router(health_v1.router, prefix="/health-records", tags=["health-records"])
api_router.include_router(access_v1.router, prefix="/access", tags=["access"])
api_router.include_router(notices_v1.router, prefix="/notices", tags=["notices"])
api_router.include_router(edge_v1.router, prefix="/edge", tags=["edge"])
api_router.include_router(families_v1.router, prefix="/families", tags=["families"])
api_router.include_router(alerts_v1.router, prefix="/alerts", tags=["alerts"])
