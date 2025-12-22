# 技术文档增量约定
# 要求后端开发在每次GIT提交到远端仓库前，要归档一份增量说明进docs，命名格式要求: ${TIMESTAMP}_{MAIN_CHAG}    (时间戳加主要变更)

# 里面的内容要求至少包括 1、增量工作简介 2、BUG的原因分析及其表现（如果不是功能增量而是BUG FIX） 3、功能的解释和使用（如果不是BUG FIX 而是功能增量） 4、核心做法，以及核心的使用说明 ，涉及的命令 5、Q&A 6、其他特定的相关补充

---

## 2025-12-22_DB_REBUILD_AND_IMPORT_SCRIPTS

- 增量简介：
	- 新增数据库重建与数据填充脚本（scripts/sql 与 scripts/python），支持幂等执行与列级加密标注。
	- 适配后端模型与API：将 `health_record.monitor_value` 改为数值型、`is_abnormal` 改为整型，新增 `device_id` 字段。

- 功能说明与使用：
	- 一键迁移：参见 smartcommhub-backend/scripts/migrate.sh，可传参 `--rows/--batch-size/--workers/--seed/--clean/--report`。
	- SQL 脚本：
		- 01_schema_v1.sql 建表/索引/约束/注释（含 `#ENCRYPT`）。
		- 03_seed_dict.sql 插入服务类型与社区字典。
		- 02_ted_encrypt.sql 示例性创建 CMK/CEK 并扫描注释自动加密（需按环境配置）。
		- rollback_v1.sql 清场回滚。
	- Python 导入器：scripts/python/data_importer.py 使用 SQLAlchemy asyncio、Faker 与 bcrypt，导入 S/M/L 三档数据规模。

- 核心做法：
	- 健康记录分区设计（按月 RANGE 分区），优化时序查询与写入。
	- 敏感列以注释 `#ENCRYPT` 标注，由列加密脚本统一处理；ORM 层通过 `info={'encrypt': True}` 提示透明使用。
	- 后端 API 入参类型调整：monitor_value(float)、is_abnormal(int)、device_id(默认值)。

- 相关命令：
	- 执行迁移：
		- `chmod +x smartcommhub-backend/scripts/migrate.sh`
		- `DATABASE_URL=postgresql://username:pswd@localhost:5432/smartcommhub ./smartcommhub-backend/scripts/migrate.sh --rows 100000 --clean --seed 42 --report`

- Q&A：
	- Q：环境未开启列级加密怎么办？
		- A：02_ted_encrypt.sql 内置幂等与忽略策略，未支持时不会中断；生产需按官方文档完成 KMS 配置。
	- Q：老版本接口是否受影响？
		- A：数据类型改造在模型与API层已适配，前端读取不受影响；如使用旧入参字符串类型，请按新类型更新。

- 其他：
	- 后续将补充每月分区自动滚动脚本与导入器的更多实体数据生成逻辑。


