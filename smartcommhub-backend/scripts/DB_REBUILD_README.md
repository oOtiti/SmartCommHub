# SmartCommHub 数据库重建与数据填充说明

本目录包含数据库结构重建、列加密、字典数据、数据导入器、回滚与一键迁移脚本。所有脚本支持幂等执行，并提供 S/M/L 三档数据规模。

## 目录结构
- sql/
  - 01_schema_v1.sql：建表/索引/约束/注释（敏感列含 `#ENCRYPT` 标记）
  - 02_ted_encrypt.sql：创建 CMK/CEK 并按注释自动加密列（AES-128-GCM）
  - 03_seed_dict.sql：基础字典数据
  - rollback_v1.sql：按依赖顺序清场
- python/
  - models.py：SQLAlchemy 模型映射（与 SQL 1:1）
  - validators.py：字段级正则与校验函数
  - data_importer.py：异步批量导入器（Faker、bcrypt、自定义 Provider、报告）
  - requirements.txt：导入器依赖
- migrate.sh：一键执行脚本（结构→字典→加密→导入→报告）
- logs/
  - import_report.txt：导入结果报告（自动生成）

## 执行顺序
1. sql/01_schema_v1.sql
2. sql/03_seed_dict.sql
3. sql/02_ted_encrypt.sql
4. python/data_importer.py （可选参数：--rows/--batch-size/--workers/--seed/--clean/--report）

## 注意
- 连接信息读取自后端配置 `app/core/config.py` 或环境变量 `.env`。
- 加密列对 ORM 透明，按普通字符串读写即可。
- 健康记录表采用月分区，便于海量时序数据管理。
