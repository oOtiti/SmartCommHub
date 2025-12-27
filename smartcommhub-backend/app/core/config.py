#配置管理
#显示传入 > 环境变量 > .env > 类体默认值
#  类似：Settings(DATABASE_URL="postgresql+psycopg2://kwuser:kwpass@localhost:5432/kwdb") > EXPORT *** > .env > 类体默认值(class Settings(BaseSettings):下面***)
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parents[2]  
_ENV_FILE = _BACKEND_ROOT / ".env"

class Settings(BaseSettings):
    APP_NAME: str = ""
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    #连接OPENGAUSS，以及连接里的参数优化
    DATABASE_URL: str = "postgresql+psycopg2://username:pswd@localhost:5432/smartcommhub"
    DB_POOL_TIMEOUT: int = 5 # 获取连接的超时时间（秒），避免请求阻塞
    DB_POOL_SIZE: int = 5        # 连接池常驻连接数
    DB_MAX_OVERFLOW: int = 7     # 连接池最大溢出连接数
    DB_POOL_RECYCLE: int = 300    # 空闲连接回收时间（秒），小于 openGauss 超时（默认 10min）
    DB_ECHO_POOL: bool = False    # 是否打印连接池日志（开发环境可以开启）
    DB_CLIENT_ENCODING: str = "utf8"  # 强制 UTF8 避免中文乱码
    DB_SEARCH_PATH: str = "public"    # 默认 schema
    DB_ISOLATION_LEVEL: str = "READ COMMITTED"  # 事务隔离级别

    # 可选：Redis（不开启则不使用,后面有用在加）
    REDIS_ENABLED: bool = False
    REDIS_URL: str | None = None

    #令牌相关
    SECRET_KEY: str = "change-me-in-prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    #加密
    ENCRYPTION_KEY: str = "b64-fernet-key-32bytes"

    #分页与日志
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"

    # MQTT 配置（订阅端）
    # 可按实际环境修改，或在 .env 中覆盖
    MQTT_ENABLED: bool = True
    MQTT_BROKER_URL: str = "127.0.0.1"
    MQTT_BROKER_PORT: int = 1883
    MQTT_TOPIC: str = "smartcommhub/health"
    MQTT_ACCESS_TOPIC: str = "smartcommhub/access"
    MQTT_CLIENT_ID: str = "sch_backend_consumer"
    MQTT_QUEUE_MAXSIZE: int = 1000

    # 个性化异常检测（边缘）
    ANOMALY_PERSONAL_ENABLED: bool = True
    ANOMALY_ALPHA: float = 0.1            # EWMA 平滑系数（0-1）
    ANOMALY_K_SIGMA: float = 3.0          # 异常阈值（|x-μ| > k·σ）
    ANOMALY_MIN_SAMPLES: int = 50         # 至少样本数，冷启动前不启用个性化

    # 门禁进出个性化异常（边缘）
    ACCESS_ANOMALY_ENABLED: bool = True
    ACCESS_ALPHA: float = 0.1             # EWMA 平滑系数
    ACCESS_K_SIGMA: float = 3.0           # 异常阈值（|x-μ| > k·σ）
    ACCESS_MIN_SAMPLES: int = 20          # 冷启动样本数（外出时长/外出间隔）
    ACCESS_CHECK_INTERVAL_SECONDS: int = 30  # 周期检测间隔（未归/未出门）

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()