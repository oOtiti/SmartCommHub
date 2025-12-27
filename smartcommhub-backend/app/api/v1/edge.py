from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.api.deps import get_current_user
from app.services.edge.anomaly import anomaly_engine

router = APIRouter()


@router.get("/baseline")
def get_baseline(
    elderly_id: int = Query(...),
    device_id: Optional[str] = Query(None),
    monitor_type: str = Query(...),
    current=Depends(get_current_user),
):
    key = (elderly_id, device_id or "mock_device_001", monitor_type)
    st = anomaly_engine.get_state(key)
    if st is None:
        return {"exists": False}
    return {
        "exists": True,
        "elderly_id": elderly_id,
        "device_id": device_id or "mock_device_001",
        "monitor_type": monitor_type,
        "n": st.n,
        "mu": st.mu,
        "mdev": st.mdev,
        "sigma": 1.253 * st.mdev,
        "alpha": anomaly_engine.alpha,
        "k": anomaly_engine.k,
        "min_samples": anomaly_engine.min_samples,
    }
