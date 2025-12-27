# 2025-12-22_DB_IMPORTER_EXTENDED

- 增量简介
  - 扩展 psycopg2 原生导入器，覆盖 `provider`、`service_item`、`family_member`、`service_order`、`access_record`、`community_notice`、`sys_usr_account`，保持幂等。
  - 新增固定测试账户集，明文写入 scripts/TEST_key.txt，数据库仅存哈希。

- 使用说明
  - 快速导入（不清空，幂等追加）：
    - `./smartcommhub-backend/scripts/migrate.sh --rows 100000 --seed 42 --report`
  - 重置导入（清空覆盖）：
    - `./smartcommhub-backend/scripts/migrate.sh --rows 100000 --clean --seed 42 --report`

- 设计要点
  - 幂等插入：统一使用 `INSERT ... SELECT ... WHERE NOT EXISTS`，按唯一键或复合键规避重复。
  - 外键顺序：外键引用前置生成（服务商→服务项、老人→家属、老人/服务项→订单、老人→门禁）即：provider→service_item；elderly→family_member；elderly & service_item→service_order；elderly→access_record。
  - 测试账户：固定用户名与密码集合，便于联调；明文存放 `scripts/TEST_key.txt`。

- 验证命令
  - `psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM provider"`
  - `psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM service_item"`
  - `psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM family_member"`
  - `psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM service_order"`
  - `psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM access_record"`
  - `psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM community_notice"`
  - `psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM sys_usr_account"`

- Q&A
  - Q: 是否需要覆盖已存在数据？
    - A: 默认不覆盖（幂等追加）。若需一致性重置，请加 `--clean` 清空后重导。
  - Q: 测试账户明文在哪里？
    - A: 在 smartcommhub-backend/scripts/TEST_key.txt。仅测试用途，不可用于生产。

- 备注
  - 后续可引入更细粒度参数（如 `--providers 200 --orders 50000`）控制各表规模；如需请告知。
  - 如需特定分布/规模参数，可在导入器中增加独立控制（elderly/provider/order 等），后续可按需求扩展。


  










