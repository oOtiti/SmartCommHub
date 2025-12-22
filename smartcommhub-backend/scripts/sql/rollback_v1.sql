-- 回滚清场：按依赖顺序删除对象
SET search_path TO public;

-- 分区表需先删除分区（示例按名称存在性判断，生产可更严格管理）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'health_record') THEN
    BEGIN
      EXECUTE 'ALTER TABLE health_record DETACH PARTITION health_record_y2025m12';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      EXECUTE 'ALTER TABLE health_record DETACH PARTITION health_record_pmax';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END$$;

DROP TABLE IF EXISTS access_record CASCADE;
DROP TABLE IF EXISTS sys_usr_account CASCADE;
DROP TABLE IF EXISTS community_notice CASCADE;
DROP TABLE IF EXISTS health_record CASCADE;
DROP TABLE IF EXISTS service_order CASCADE;
DROP TABLE IF EXISTS service_item CASCADE;
DROP TABLE IF EXISTS provider CASCADE;
DROP TABLE IF EXISTS family_member CASCADE;
DROP TABLE IF EXISTS elderly CASCADE;
DROP TABLE IF EXISTS service_type_dict CASCADE;
DROP TABLE IF EXISTS community_dict CASCADE;

-- 如使用了列加密对象（CMK/CEK），可在此处清理（根据实际名称）
-- 注意：生产环境谨慎执行以下语句
-- DROP COLUMN ENCRYPTION KEY cek1;
-- DROP CLIENT MASTER KEY cmk1;
