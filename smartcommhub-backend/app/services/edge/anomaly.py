# -*- coding: utf-8 -*-
"""
轻量个性化异常检测引擎（在线更新 + 即时评分）
- 维度：按 (elderly_id, device_id, monitor_type) 维护基线
- 基线：EWMA 均值 μ 与 EWMA 绝对偏差 mdev（近似稳健尺度）
- 评分：z = |x-μ| / (σ + eps)，其中 σ ≈ 1.253 * mdev
- 判定：当样本数 >= min_samples 且 z > k_sigma 记为个人化异常
- 置信度：综合样本量占比与偏差幅度（0-1）

说明：该模块为内存级状态（进程生命周期有效）。如需持久化，可扩展至数据库。
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, Tuple, Optional

from app.core.config import settings


Key = Tuple[int, str, str]  # (elderly_id, device_id, monitor_type)


@dataclass
class State:
    n: int = 0
    mu: float = 0.0
    mdev: float = 0.0  # EWMA of absolute deviation


class AnomalyEngine:
    def __init__(self, alpha: float, k_sigma: float, min_samples: int):
        self.alpha = max(0.001, min(alpha, 0.999))
        self.k = max(0.5, k_sigma)
        self.min_samples = max(1, min_samples)
        self._store: Dict[Key, State] = {}

    def _get(self, key: Key) -> State:
        st = self._store.get(key)
        if st is None:
            st = State()
            self._store[key] = st
        return st

    def update_and_score(self, key: Key, x: float) -> Dict[str, float | int | bool]:
        """
        更新基线并返回评分结果：
        - score: z 值（越大偏差越大）
        - confidence: 0-1
        - personal_abnormal: 是否触发个性化异常
        - n: 当前样本数
        - mu/mdev/sigma: 当前基线摘要
        """
        st = self._get(key)
        a = self.alpha
        if st.n == 0:
            st.mu = x
            st.mdev = 0.0
        else:
            st.mu = (1 - a) * st.mu + a * x
            st.mdev = (1 - a) * st.mdev + a * abs(x - st.mu)
        st.n += 1

        sigma = 1.253 * st.mdev  # Laplace 近似
        eps = 1e-6
        z = abs(x - st.mu) / (sigma + eps)

        enough = st.n >= self.min_samples
        personal_abnormal = bool(enough and z > self.k)

        # 置信度：样本量比例 * 偏差幅度比例（截断）
        sample_ratio = min(st.n / self.min_samples, 1.0)
        deviation_ratio = min(z / (2 * self.k), 1.0)
        confidence = max(0.0, min(1.0, 0.2 + 0.8 * sample_ratio * deviation_ratio))

        return {
            "score": float(z),
            "confidence": float(confidence),
            "personal_abnormal": personal_abnormal,
            "n": st.n,
            "mu": float(st.mu),
            "mdev": float(st.mdev),
            "sigma": float(sigma),
            "k": float(self.k),
        }

    def get_state(self, key: Key) -> Optional[State]:
        return self._store.get(key)


# 全局实例（进程级）
anomaly_engine = AnomalyEngine(
    alpha=settings.ANOMALY_ALPHA,
    k_sigma=settings.ANOMALY_K_SIGMA,
    min_samples=settings.ANOMALY_MIN_SAMPLES,
)
