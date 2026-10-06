-- Cumulative cursor statistics; the perf workload diffs a snapshot taken before and after
-- the run to list the statements it caused (stand-in for StatsPack/AWR, unavailable on AWS PERF).
-- Requires SELECT on V_$SQL (e.g. SELECT_CATALOG_ROLE). Read-only.
SELECT sql_id,
       child_number,
       plan_hash_value,
       executions,
       elapsed_time,
       cpu_time,
       buffer_gets,
       disk_reads,
       rows_processed,
       parsing_schema_name,
       module,
       SUBSTR(sql_text, 1, 300) AS sql_text
  FROM v$sql
 WHERE parsing_schema_name NOT IN ('SYS', 'SYSTEM', 'RDSADMIN', 'DBSNMP')
   AND last_active_time >= SYSDATE - 1
