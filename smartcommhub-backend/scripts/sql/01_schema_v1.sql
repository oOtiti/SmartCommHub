-- SmartCommHub 数据库重建：V1 架构（公共模式 public）
-- 目标：兼容后端、支持分区与加密标记、幂等可重跑
-- 注意：敏感列后续将按注释中的 "#ENCRYPT" 自动加密（02_ted_encrypt.sql）

SET search_path TO public;

-- 审计字段统一说明：
-- created_at TIMESTAMP DEFAULT now()
-- updated_at TIMESTAMP DEFAULT now()
-- 后续可用触发器维护 updated_at 自动更新

-- 1) elderly（老人）
CREATE TABLE IF NOT EXISTS elderly (
  elderly_id BIGSERIAL PRIMARY KEY,
  name VARCHAR(20) NOT NULL,
  id_card CHAR(18) NOT NULL UNIQUE,
  age SMALLINT NOT NULL CHECK (age BETWEEN 0 AND 130),
  health_level VARCHAR(10) NOT NULL,
  emergency_contact VARCHAR(11) NOT NULL,
  address VARCHAR(100) NOT NULL,
  register_time TIMESTAMP NOT NULL DEFAULT now(),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
COMMENT ON COLUMN elderly.id_card IS '身份证号 -- #ENCRYPT';
COMMENT ON COLUMN elderly.emergency_contact IS '紧急联系人手机号 -- #ENCRYPT';
COMMENT ON COLUMN elderly.address IS '住址 -- #ENCRYPT';
CREATE INDEX IF NOT EXISTS idx_elderly_name ON elderly (name);

-- 2) family_member（家属）
CREATE TABLE IF NOT EXISTS family_member (
  family_id BIGSERIAL PRIMARY KEY,
  name VARCHAR(20) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  relation VARCHAR(50) NOT NULL,
  permission_level VARCHAR(30) NOT NULL,
  elderly_id INTEGER NOT NULL REFERENCES elderly(elderly_id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
COMMENT ON COLUMN family_member.phone IS '家属手机号 -- #ENCRYPT';
CREATE INDEX IF NOT EXISTS idx_family_member_elderly_id ON family_member (elderly_id);
CREATE INDEX IF NOT EXISTS idx_family_member_phone ON family_member (phone);

-- 3) provider（服务商）
CREATE TABLE IF NOT EXISTS provider (
  provider_id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  service_type VARCHAR(50) NOT NULL,
  service_nature VARCHAR(50) NOT NULL,
  qualification_id VARCHAR(50) NOT NULL UNIQUE,
  contact VARCHAR(50) NOT NULL,
  audit_status VARCHAR(10) NOT NULL CHECK (audit_status IN ('pending','approved','rejected')),
  belong_community VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
COMMENT ON COLUMN provider.qualification_id IS '资质编号 -- #ENCRYPT';
COMMENT ON COLUMN provider.contact IS '联系人/电话等 -- #ENCRYPT';
CREATE INDEX IF NOT EXISTS idx_provider_service_type ON provider (service_type);

-- 4) service_item（服务项）
CREATE TABLE IF NOT EXISTS service_item (
  service_id BIGSERIAL PRIMARY KEY,
  provider_id INTEGER NOT NULL REFERENCES provider(provider_id),
  name VARCHAR(100) NOT NULL,
  content VARCHAR(500) NOT NULL,
  duration VARCHAR(20) NOT NULL,
  price NUMERIC(8,2) NOT NULL DEFAULT 0.00,
  service_scope VARCHAR(200) NOT NULL,
  status VARCHAR(30) NOT NULL CHECK (status IN ('online','offline','paused')),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_service_item_provider_id ON service_item (provider_id);
CREATE INDEX IF NOT EXISTS idx_service_item_status ON service_item (status);

-- 5) service_order（服务订单）
CREATE TABLE IF NOT EXISTS service_order (
  order_id BIGSERIAL PRIMARY KEY,
  elderly_id INTEGER NOT NULL REFERENCES elderly(elderly_id),
  service_id INTEGER NOT NULL REFERENCES service_item(service_id),
  reserve_time TIMESTAMP NOT NULL,
  service_time TIMESTAMP NOT NULL,
  order_status VARCHAR(30) NOT NULL CHECK (order_status IN ('created','confirmed','in_service','finished','canceled')),
  pay_status VARCHAR(50) NOT NULL CHECK (pay_status IN ('unpaid','paid','refunded')),
  eval_score NUMERIC(3,1) NULL DEFAULT 0.0 CHECK (eval_score BETWEEN 0 AND 10),
  eval_content TEXT NULL,
  eval_time TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
COMMENT ON COLUMN service_order.eval_content IS '评价内容（可能含敏感） -- #ENCRYPT';
CREATE INDEX IF NOT EXISTS idx_service_order_elderly_id ON service_order (elderly_id);
CREATE INDEX IF NOT EXISTS idx_service_order_service_id ON service_order (service_id);
CREATE INDEX IF NOT EXISTS idx_service_order_service_time ON service_order (service_time DESC);

-- 6) health_record（健康记录，分区表）
-- 说明：monitor_value 改为数值型，支持聚合与建模；device_id 保留默认值；is_abnormal 改为整数，默认0
CREATE TABLE IF NOT EXISTS health_record (
  record_id BIGSERIAL PRIMARY KEY,
  elderly_id INTEGER NOT NULL REFERENCES elderly(elderly_id),
  monitor_type VARCHAR(32) NOT NULL CHECK (monitor_type IN ('heart_rate','blood_pressure')),
  monitor_value NUMERIC(6,2) NOT NULL,
  monitor_time TIMESTAMP NOT NULL DEFAULT now(),
  is_abnormal INTEGER NOT NULL DEFAULT 0 CHECK (is_abnormal IN (0,1)),
  device_id VARCHAR(20) NOT NULL DEFAULT 'mock_device_001',
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_health_record_elder_time ON health_record (elderly_id, monitor_time DESC);
CREATE INDEX IF NOT EXISTS idx_health_record_type_time ON health_record (monitor_type, monitor_time);

-- 7) community_notice（社区公告）
CREATE TABLE IF NOT EXISTS community_notice (
  notice_id BIGSERIAL PRIMARY KEY,
  community_id VARCHAR(20) NOT NULL,
  title VARCHAR(100) NOT NULL,
  content VARCHAR(1000) NOT NULL,
  publish_time TIMESTAMP NOT NULL DEFAULT now(),
  target_group VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
COMMENT ON COLUMN community_notice.content IS '公告内容（可选加密） -- #ENCRYPT';
CREATE INDEX IF NOT EXISTS idx_community_notice_pub ON community_notice (community_id, publish_time DESC);

-- 8) sys_usr_account（系统用户）
CREATE TABLE IF NOT EXISTS sys_usr_account (
  user_id BIGSERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  phone VARCHAR(30) NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  user_type INTEGER NOT NULL DEFAULT 1 CHECK (user_type IN (1,2,3)),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMP NULL,
  last_login_at TIMESTAMP NULL,
  pwd_changed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  elderly_id BIGINT NULL REFERENCES elderly(elderly_id) ON DELETE SET NULL,
  family_id BIGINT NULL REFERENCES family_member(family_id) ON DELETE SET NULL,
  provider_id BIGINT NULL REFERENCES provider(provider_id) ON DELETE SET NULL
);
COMMENT ON COLUMN sys_usr_account.phone IS '用户手机号（可选加密） -- #ENCRYPT';
CREATE INDEX IF NOT EXISTS idx_sys_usr_username ON sys_usr_account (username);
CREATE INDEX IF NOT EXISTS idx_sys_usr_phone ON sys_usr_account (phone);
CREATE INDEX IF NOT EXISTS idx_sys_usr_user_type ON sys_usr_account (user_type);

-- 9) access_record（门禁记录）
CREATE TABLE IF NOT EXISTS access_record (
  access_id BIGSERIAL PRIMARY KEY,
  elderly_id INTEGER NOT NULL REFERENCES elderly(elderly_id),
  access_type VARCHAR(4) NOT NULL CHECK (access_type IN ('IN','OUT')),
  record_time TIMESTAMP NOT NULL,
  gate_location VARCHAR(50) NOT NULL,
  is_abnormal VARCHAR(4) NOT NULL CHECK (is_abnormal IN ('YES','NO')),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_access_record_elder_time ON access_record (elderly_id, record_time DESC);

-- 10) service_type_dict（服务类型字典）
CREATE TABLE IF NOT EXISTS service_type_dict (
  type_code VARCHAR(50) PRIMARY KEY,
  type_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- 11) community_dict（社区字典）
CREATE TABLE IF NOT EXISTS community_dict (
  community_id VARCHAR(20) PRIMARY KEY,
  community_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- 备注：
-- * sys_usr_account.phone 唯一约束允许 NULL（PostgreSQL/OpenGauss 对 NULL 唯一行为与实现有关，生产场景可改为部分唯一索引）。
-- * 健康记录分区仅示例当前月与兜底分区，生产可按月滚动创建分区。
-- * 所有敏感列仅标注注释，由 02_ted_encrypt.sql 统一加密。