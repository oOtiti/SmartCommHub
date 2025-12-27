-- 告警表：持久化异常预警，支持确认与静音
SET search_path TO public;

CREATE TABLE IF NOT EXISTS alerts (
  alert_id BIGSERIAL PRIMARY KEY,
  elderly_id BIGINT NOT NULL REFERENCES elderly(elderly_id) ON DELETE CASCADE,
  monitor_type VARCHAR(32) NOT NULL CHECK (monitor_type IN ('heart_rate','blood_pressure','access_out_duration','access_inactivity')),
  monitor_value NUMERIC(6,2) NOT NULL,
  monitor_time TIMESTAMP NOT NULL,
  device_id VARCHAR(50) NOT NULL DEFAULT 'mock_device_001',
  global_abnormal INTEGER NOT NULL DEFAULT 0 CHECK (global_abnormal IN (0,1)),
  personal_abnormal INTEGER NOT NULL DEFAULT 0 CHECK (personal_abnormal IN (0,1)),
  score NUMERIC(6,3) NULL,
  confidence NUMERIC(6,3) NULL,
  k NUMERIC(6,3) NULL,
  n BIGINT NULL,
  mu NUMERIC(8,3) NULL,
  sigma NUMERIC(8,3) NULL,
  ack_status VARCHAR(16) NOT NULL DEFAULT 'UNACKED' CHECK (ack_status IN ('UNACKED','ACKED')),
  ack_time TIMESTAMP NULL,
  silence_until TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_elder_time ON alerts (elderly_id, monitor_time DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_ack ON alerts (ack_status);
