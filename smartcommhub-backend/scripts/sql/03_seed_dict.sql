-- 基础字典数据（可幂等重跑）
SET search_path TO public;

-- 服务类型字典
INSERT INTO service_type_dict (type_code, type_name)
SELECT v.type_code, v.type_name FROM (
  VALUES
    ('home_care', '上门护理'),
    ('meal_delivery', '送餐服务'),
    ('medical_check', '体检服务'),
    ('rehab_training', '康复训练'),
    ('cleaning', '保洁服务')
) AS v(type_code, type_name)
WHERE NOT EXISTS (
  SELECT 1 FROM service_type_dict d WHERE d.type_code = v.type_code
);

-- 社区字典
INSERT INTO community_dict (community_id, community_name)
SELECT v.community_id, v.community_name FROM (
  VALUES
    ('c001', '东城社区'),
    ('c002', '西城社区'),
    ('c003', '南苑社区'),
    ('c004', '北苑社区'),
    ('c005', '中心社区')
) AS v(community_id, community_name)
WHERE NOT EXISTS (
  SELECT 1 FROM community_dict d WHERE d.community_id = v.community_id
);
