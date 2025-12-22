-- 列级加密（TDE）占位脚本：当前数据库环境不支持相关对象创建，故跳过。
SET search_path TO public;
SELECT 'Skip column encryption: environment not supporting CMK/CEK' AS info;
