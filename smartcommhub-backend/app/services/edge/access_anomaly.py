from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, Optional, Tuple, List
from datetime import datetime, timezone

from app.core.config import settings


@dataclass
class AccessState:
    last_out: Optional[datetime] = None
    last_in: Optional[datetime] = None
    open_out: bool = False
    # 外出时长基线
    mu_out: float = 0.0
    mdev_out: float = 0.0
    n_out: int = 0
    # 外出间隔（相邻 OUT 之间的时间）基线
    mu_interval: float = 0.0
    mdev_interval: float = 0.0
    n_interval: int = 0
    # 告警状态避免重复
    warned_long_out: bool = False
    warned_inactivity: bool = False


class AccessAnomalyEngine:
    def __init__(self, alpha: float, k_sigma: float, min_samples: int):
        self.alpha = float(alpha)
        self.k = float(k_sigma)
        self.min = int(min_samples)
        self.states: Dict[int, AccessState] = {}

    def _get(self, elderly_id: int) -> AccessState:
        st = self.states.get(elderly_id)
        if not st:
            st = AccessState()
            self.states[elderly_id] = st
        return st

    @staticmethod
    def _to_ts(dt: datetime) -> float:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.timestamp()

    def on_out(self, elderly_id: int, t: datetime) -> None:
        st = self._get(elderly_id)
        # 更新外出间隔基线
        if st.last_out:
            interval_h = (self._to_ts(t) - self._to_ts(st.last_out)) / 3600.0
            st.n_interval += 1
            if st.n_interval == 1:
                st.mu_interval = interval_h
                st.mdev_interval = 0.0
            else:
                st.mu_interval = self.alpha * interval_h + (1 - self.alpha) * st.mu_interval
                st.mdev_interval = self.alpha * abs(interval_h - st.mu_interval) + (1 - self.alpha) * st.mdev_interval
        st.last_out = t
        st.open_out = True
        st.warned_long_out = False

    def on_in(self, elderly_id: int, t: datetime) -> Optional[Dict]:
        st = self._get(elderly_id)
        st.last_in = t
        if st.open_out and st.last_out:
            dur_h = (self._to_ts(t) - self._to_ts(st.last_out)) / 3600.0
            st.n_out += 1
            if st.n_out == 1:
                st.mu_out = dur_h
                st.mdev_out = 0.0
            else:
                st.mu_out = self.alpha * dur_h + (1 - self.alpha) * st.mu_out
                st.mdev_out = self.alpha * abs(dur_h - st.mu_out) + (1 - self.alpha) * st.mdev_out
            st.open_out = False
            # 个性化异常：外出时长过长
            sigma = 1.253 * st.mdev_out
            z = abs(dur_h - st.mu_out) / (sigma + 1e-9) if st.n_out >= self.min and sigma > 0 else 0.0
            personal_abnormal = (st.n_out >= self.min) and (z > self.k)
            return {
                "type": "access_out_duration",
                "duration_hours": dur_h,
                "personal_abnormal": personal_abnormal,
                "score": z,
                "n": st.n_out,
                "mu": st.mu_out,
                "sigma": sigma,
            }
        return None

    def check_timeouts(self, now: datetime) -> List[Dict]:
        """周期检查：
        - 长时间未归：有 open_out，且外出时长超过基线阈值
        - 长时间未出门：距离上次 OUT 的间隔超过基线阈值
        返回需要告警的事件列表。
        """
        results: List[Dict] = []
        for elderly_id, st in self.states.items():
            # 未归检查
            if st.open_out and st.last_out:
                dur_h = (self._to_ts(now) - self._to_ts(st.last_out)) / 3600.0
                sigma = 1.253 * st.mdev_out
                z = abs(dur_h - st.mu_out) / (sigma + 1e-9) if st.n_out >= self.min and sigma > 0 else 0.0
                if (st.n_out >= self.min and z > self.k) and not st.warned_long_out:
                    st.warned_long_out = True
                    results.append({
                        "elderly_id": elderly_id,
                        "type": "access_out_duration",
                        "duration_hours": dur_h,
                        "personal_abnormal": True,
                        "score": z,
                        "n": st.n_out,
                        "mu": st.mu_out,
                        "sigma": sigma,
                    })
            # 未出门检查
            if st.last_out and not st.open_out:
                interval_h = (self._to_ts(now) - self._to_ts(st.last_out)) / 3600.0
                sigma_i = 1.253 * st.mdev_interval
                z_i = abs(interval_h - st.mu_interval) / (sigma_i + 1e-9) if st.n_interval >= self.min and sigma_i > 0 else 0.0
                if (st.n_interval >= self.min and z_i > self.k) and not st.warned_inactivity:
                    st.warned_inactivity = True
                    results.append({
                        "elderly_id": elderly_id,
                        "type": "access_inactivity",
                        "interval_hours": interval_h,
                        "personal_abnormal": True,
                        "score": z_i,
                        "n": st.n_interval,
                        "mu": st.mu_interval,
                        "sigma": sigma_i,
                    })
        return results


access_anomaly_engine = AccessAnomalyEngine(
    alpha=settings.ACCESS_ALPHA,
    k_sigma=settings.ACCESS_K_SIGMA,
    min_samples=settings.ACCESS_MIN_SAMPLES,
)
