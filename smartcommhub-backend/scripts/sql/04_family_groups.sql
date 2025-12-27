-- 家庭组相关表：支持多老人家庭订阅与过滤
-- 目标：与 SQLAlchemy 模型一致；幂等、可重复执行

SET search_path TO public;

-- family_group（家庭组定义）
CREATE TABLE IF NOT EXISTS family_group (
  group_id BIGSERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_family_group_name ON family_group (name);

-- family_group_member_map（家属成员 -> 家庭组 映射）
CREATE TABLE IF NOT EXISTS family_group_member_map (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES family_group(group_id) ON DELETE CASCADE,
  family_id BIGINT NOT NULL REFERENCES family_member(family_id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fg_member_group_id ON family_group_member_map (group_id);
CREATE INDEX IF NOT EXISTS idx_fg_member_family_id ON family_group_member_map (family_id);

-- family_group_elder_map（老人 -> 家庭组 映射）
CREATE TABLE IF NOT EXISTS family_group_elder_map (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES family_group(group_id) ON DELETE CASCADE,
  elderly_id BIGINT NOT NULL REFERENCES elderly(elderly_id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fg_elder_group_id ON family_group_elder_map (group_id);
CREATE INDEX IF NOT EXISTS idx_fg_elder_elderly_id ON family_group_elder_map (elderly_id);
