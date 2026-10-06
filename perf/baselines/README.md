# Perf baselines

Agreed reference runs, one folder per release: `perf/baselines/<release>/summary.json`
(copied from `reports/perf/<runId>/summary.json`).

- `perf.baselineFile=perf/baselines/<release>/summary.json` adds a "vs baseline" table to every run.
- `npm run perf:compare -- perf/baselines/<old>/summary.json reports/perf/<runId>/summary.json`
  compares any two runs (p90 per screen, regression above `--threshold`, default 20%).

Only summaries belong here: screen ids and timings. Never commit `measurements.csv` or `top-sql.csv`,
because they contain user logins and SQL text.
