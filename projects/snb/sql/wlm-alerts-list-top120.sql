-- SSSMP1VUIO-2969: list query behind Group Work → All Alerts (Watch List Manager view).
-- The screen fetches the first 120 rows; DoD target is < 1 s with ~800k rows in ALERT_HEADER.
-- Read-only.
SELECT *
  FROM V_SNB_WLM_ALERTS_LIST
 WHERE ROWNUM <= 120
