-- 基础示例数据插入（不包含用户账户，管理员已存在：username=admin, type=0）
-- 数据库：smartcommhub（请按实际连接执行）

-- provider（服务商）——幂等插入（按 qualification_id 判断是否存在）
INSERT INTO provider (name, service_type, service_nature, qualification_id, contact, audit_status, belong_community)
SELECT '阳光护理中心', '居家护理', '民营', 'QUAL-2025-0001', '400-800-900', 'approved', '东城社区'
WHERE NOT EXISTS (
  SELECT 1 FROM provider WHERE qualification_id = 'QUAL-2025-0001'
);

INSERT INTO provider (name, service_type, service_nature, qualification_id, contact, audit_status, belong_community)
SELECT '安心送餐服务', '餐饮配送', '个体', 'QUAL-2025-0002', '400-666-777', 'approved', '西城社区'
WHERE NOT EXISTS (
  SELECT 1 FROM provider WHERE qualification_id = 'QUAL-2025-0002'
);

-- elderly（老人）——幂等插入（按 id_card 判断是否存在）
INSERT INTO elderly (name, id_card, age, health_level, emergency_contact, address)
SELECT '张三', '110101199001011234', 72, '良好', '13800000001', '东城社区 1 号楼 302'
WHERE NOT EXISTS (
  SELECT 1 FROM elderly WHERE id_card = '110101199001011234'
);

INSERT INTO elderly (name, id_card, age, health_level, emergency_contact, address)
SELECT '李四', '110101198512129876', 78, '一般', '13800000002', '西城社区 3 号楼 602'
WHERE NOT EXISTS (
  SELECT 1 FROM elderly WHERE id_card = '110101198512129876'
);

-- family_member（家属）——按老人身份证号定位 elderly_id，避免硬编码
INSERT INTO family_member (name, phone, relation, permission_level, elderly_id)
SELECT '王小明', '13911112222', '儿子', '全部',
       (SELECT elderly_id FROM elderly WHERE id_card='110101199001011234' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM family_member WHERE phone='13911112222'
);

INSERT INTO family_member (name, phone, relation, permission_level, elderly_id)
SELECT '赵婷婷', '13933334444', '女儿', '普通',
       (SELECT elderly_id FROM elderly WHERE id_card='110101198512129876' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM family_member WHERE phone='13933334444'
);

-- 可选：服务项目（示例）——补齐必填字段(content, duration, service_scope)
INSERT INTO service_item (name, provider_id, content, duration, price, service_scope, status)
SELECT '上门护理（2小时）',
       (SELECT provider_id FROM provider WHERE qualification_id = 'QUAL-2025-0001' LIMIT 1),
       '基础上门护理服务（清洁、测量生命体征等）',
       '2h',
       199.00,
       '上门护理',
       'online'
WHERE NOT EXISTS (
  SELECT 1 FROM service_item WHERE name='上门护理（2小时）'
);

INSERT INTO service_item (name, provider_id, content, duration, price, service_scope, status)
SELECT '每日送餐（一个月）',
       (SELECT provider_id FROM provider WHERE qualification_id = 'QUAL-2025-0002' LIMIT 1),
       '每日两餐，营养配比，按需加配',
       '30d',
       899.00,
       '养老餐配送',
       'online'
WHERE NOT EXISTS (
  SELECT 1 FROM service_item WHERE name='每日送餐（一个月）'
);
-- sys_usr_account.user_type：0=管理员，1=老人，2=家属，3=服务商
-- 通过 sys_usr_account.elderly_id / family_id / provider_id 与业务表建立关联
-- 为了避免密码明文出现在 SQL 中，这里复用已存在管理员账号(admin)的 password_hash，
-- 因此以下示例账户的初始密码均与 admin 相同（admin123）。
-- 示例账户清单（用户名 / 身份 / 关联信息 / 密码）
-- 1) 管理员（0）：用户名=admin，密码=admin123（系统已存在）
-- 2) 老人（1）：用户名=elderly001，关联 elderly.id_card='110101199001011234'（张三），账户手机号='13800000011'，密码=admin123
-- 4) 服务商（3）：用户名=provider001，关联 provider.qualification_id='QUAL-2025-0001'（阳光护理中心），账户手机号='13955556666'，密码=admin123
INSERT INTO sys_usr_account (username, phone, password_hash, user_type, is_active, elderly_id)
SELECT 'elderly001', '13800000011', (SELECT password_hash FROM sys_usr_account WHERE username='admin' LIMIT 1), 1, TRUE,
       (SELECT elderly_id FROM elderly WHERE id_card='110101199001011234' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM sys_usr_account WHERE username='elderly001'
);

-- 家属用户 family001 -> 关联王小明（按 phone 定位 family_member）
INSERT INTO sys_usr_account (username, phone, password_hash, user_type, is_active, family_id)
SELECT 'family001', '13911112222', (SELECT password_hash FROM sys_usr_account WHERE username='admin' LIMIT 1), 2, TRUE,
       (SELECT family_id FROM family_member WHERE phone='13911112222' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM sys_usr_account WHERE username='family001'
);

-- 服务商用户 provider001 -> 关联“阳光护理中心”（按 qualification_id 定位 provider）
INSERT INTO sys_usr_account (username, phone, password_hash, user_type, is_active, provider_id)
SELECT 'provider001', '13955556666', (SELECT password_hash FROM sys_usr_account WHERE username='admin' LIMIT 1), 3, TRUE,
       (SELECT provider_id FROM provider WHERE qualification_id='QUAL-2025-0001' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM sys_usr_account WHERE username='provider001'
);

-- === 订单示例 ===
-- 1) 张三预约上门护理：已创建，未支付
INSERT INTO service_order (elderly_id, service_id, reserve_time, service_time, order_status, pay_status)
SELECT 
  (SELECT elderly_id FROM elderly WHERE id_card='110101199001011234' LIMIT 1),
  (SELECT service_id::integer FROM service_item WHERE name='上门护理（2小时）' LIMIT 1),
  now(),
  now() + interval '1 day',
  'created',
  'unpaid'
WHERE NOT EXISTS (
  SELECT 1 FROM service_order so
  WHERE so.elderly_id = (SELECT elderly_id FROM elderly WHERE id_card='110101199001011234' LIMIT 1)
    AND so.service_id = (SELECT service_id::integer FROM service_item WHERE name='上门护理（2小时）' LIMIT 1)
    AND so.order_status = 'created'
);

-- 2) 张三预约上门护理：已确认，已支付
INSERT INTO service_order (elderly_id, service_id, reserve_time, service_time, order_status, pay_status)
SELECT 
  (SELECT elderly_id FROM elderly WHERE id_card='110101199001011234' LIMIT 1),
  (SELECT service_id::integer FROM service_item WHERE name='上门护理（2小时）' LIMIT 1),
  now(),
  now() + interval '2 day',
  'confirmed',
  'paid'
WHERE NOT EXISTS (
  SELECT 1 FROM service_order so
  WHERE so.elderly_id = (SELECT elderly_id FROM elderly WHERE id_card='110101199001011234' LIMIT 1)
    AND so.service_id = (SELECT service_id::integer FROM service_item WHERE name='上门护理（2小时）' LIMIT 1)
    AND so.order_status = 'confirmed'
);

-- 3) 李四订餐：已完成，已评价
INSERT INTO service_order (elderly_id, service_id, reserve_time, service_time, order_status, pay_status, eval_score, eval_content, eval_time)
SELECT 
  (SELECT elderly_id FROM elderly WHERE id_card='110101198512129876' LIMIT 1),
  (SELECT service_id::integer FROM service_item WHERE name='每日送餐（一个月）' LIMIT 1),
  now() - interval '40 day',
  now() - interval '10 day',
  'finished',
  'paid',
  5,
  '餐品丰富，配送及时，家人很满意',
  now() - interval '9 day'
WHERE NOT EXISTS (
  SELECT 1 FROM service_order so
  WHERE so.elderly_id = (SELECT elderly_id FROM elderly WHERE id_card='110101198512129876' LIMIT 1)
    AND so.service_id = (SELECT service_id::integer FROM service_item WHERE name='每日送餐（一个月）' LIMIT 1)
    AND so.order_status = 'finished'
);
