# Phase 4 – Non-UI capabilities (archive)

Planned REST, DB, SSH/SFTP, and MQ capability modules behind Cucumber steps.

## Outcome (current)

| Capability | Status |
|------------|--------|
| **SSH** | Done — `src/capabilities/sshClient.ts` + `tests/ssh/*.spec.ts` (project `ssh`) |
| REST | Not implemented (stub keys in config only) |
| DB | Not implemented |
| MQ | Not implemented |

SSH no longer uses Cucumber; same Playwright runner as UI.
