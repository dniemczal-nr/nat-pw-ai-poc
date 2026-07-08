# Phase 4 – Non-UI Capability Layer (REST, DB, SSH/SCP/SFTP, MQ)

## Goals

- Implement reusable technical capabilities for REST, Database, SSH/SCP/SFTP, and MQ.
- Integrate these capabilities into the Cucumber World and step layer.
- Provide example feature files and steps that showcase each capability.

## Scope

Phase 4 focuses on **non-UI capabilities**:

- REST client abstraction.
- Database access abstraction.
- SSH/SCP/SFTP wrapper.
- MQ publish/consume abstraction.

Capabilities must be driven by the config layer (Phase 1) and accessible via the World (Phase 2).

## Outcomes

By the end of Phase 4:

- Each capability has a dedicated module under `src/capabilities/`.
- World exposes `this.rest`, `this.db`, `this.ssh`, `this.mq` (or similar) to steps.
- Example feature files and step definitions exist for:
  - REST API health checks or simple CRUD operations.
  - DB data verification or manipulation.
  - SSH command execution or remote file inspection.
  - MQ message publishing and consumption.

## REST Capability

### Responsibilities

- Perform HTTP requests with:
  - method (`GET`, `POST`, `PUT`, etc.);
  - path or URL;
  - optional query parameters, headers, body.

- Integrate with config for:
  - base API URL;
  - authentication (e.g. tokens, basic auth);
  - timeouts.

### Interface (Conceptual)

```js
rest.request(method, path, options) -> { status, headers, body }
```

Options may include:

- `query` – query string parameters.
- `body` – JSON or other payload.
- `headers` – additional headers.
- `timeout` – request-specific timeout.

### Validation Example

Feature (conceptual): `features/api/health-check.feature`:

```gherkin
@API @SMOKE
Scenario: API health endpoint returns 200
  When I call the "health" API endpoint
  Then the response status should be 200
```

Steps map to REST capability calls.

## Database Capability

### Responsibilities

- Manage DB connections (single connection or pool).
- Execute queries and return results.
- Optionally support transactions.

### Interface (Conceptual)

```js
db.query(sql, params) -> rows

db.transaction(async (tx) => { /* use tx.query(...) */ })
```

### Configuration

- Use config variables for:
  - `db.host`, `db.port`;
  - `db.user`, `db.password`;
  - `db.name`.

Credentials should ideally be loaded via ENV.

### Validation Example

Feature (conceptual): `features/db/user-count.feature`:

```gherkin
@DB @INTEGRATION
Scenario: User count in DB matches expected
  When I query the user table
  Then the user count should be greater than 0
```

Steps call DB capability to query and evaluate results.

## SSH/SCP/SFTP Capability

### Responsibilities

- Connect via SSH to remote hosts.
- Execute commands and capture stdout, stderr, exit code.
- Upload/download files via SCP or SFTP.

### Interface (Conceptual)

```js
ssh.exec(command) -> { stdout, stderr, code }
ssh.upload(localPath, remotePath)
ssh.download(remotePath, localPath)
```

### Configuration

- Use config for:
  - `ssh.host`, `ssh.port`;
  - `ssh.user`;
  - authentication details.

### Validation Example

Feature (conceptual): `features/ssh/check-process.feature`:

```gherkin
@SSH @INTEGRATION
Scenario: Remote process is running
  When I run "ps aux | grep my-process" on the remote host
  Then I should see at least one matching line
```

Steps call SSH capability and assert on `stdout`.

## MQ Capability

### Responsibilities

- Publish messages to topics/queues.
- Consume messages from topics/queues.

### Interface (Conceptual)

```js
mq.publish(topicOrQueue, message)

mq.consume(topicOrQueue, handler, options)
```

Options for consumption may include:

- timeout;
- message filtering;
- acknowledgement behavior.

### Configuration

- Use config for:
  - `mq.host`, `mq.port`;
  - queue/topic names;
  - credentials.

### Validation Example

Feature (conceptual): `features/mq/publish-consume.feature`:

```gherkin
@MQ @INTEGRATION
Scenario: Message can be published and consumed
  When I publish a message to "orders" queue
  Then I should be able to consume that message within 5 seconds
```

Steps use MQ capability to publish and consume.

## World Integration

### Design

- World should be extended to include:
  - `this.rest` – instance of REST capability.
  - `this.db` – instance of DB capability.
  - `this.ssh` – instance of SSH/SCP/SFTP capability.
  - `this.mq` – instance of MQ capability.

- Instances may be created:
  - eagerly in World constructor;
  - lazily on first usage;
  - in `Before` hooks based on tags.

### Tag-driven Initialization

- Consider using tags to decide which capabilities to initialize:
  - e.g. `@API` -> REST;
  - `@DB` -> DB;
  - `@SSH` -> SSH;
  - `@MQ` -> MQ.

### Resource Management

- DB, SSH, MQ connections may be shared across scenarios or per-scenario depending on requirements.
- Hooks (`After` or `AfterAll`) must handle cleanup to prevent leaks.

## Step Layer Integration

### Design

- Create dedicated step files:
  - `src/steps/apiSteps.js`;
  - `src/steps/dbSteps.js`;
  - `src/steps/sshSteps.js`;
  - `src/steps/mqSteps.js`.

- Steps should:
  - accept business-level parameters;
  - call capabilities via World;
  - avoid technical details in Gherkin whenever possible.

### BDD Quality

- Ensure scenarios express intent clearly:
  - "When I call the \"health\" API endpoint" rather than specifying raw URLs.
  - "Then the user count should be greater than 0" rather than low-level SQL details.

## Validation Strategy for Phase 4

Once implemented, validation steps include:

- 
Run specific tagged test sets:
  - `npx cucumber-js --tags "@API"`;
  - `npx cucumber-js --tags "@DB"`;
  - `npx cucumber-js --tags "@SSH"`;
  - `npx cucumber-js --tags "@MQ"`.

- Confirm:
  - Each capability can connect to its target system (or a mock/test instance).
  - Simple scenarios pass.

We may use test doubles or local containers for DB/MQ depending on the environment.

## Risks & Considerations

- External dependencies (DB, SSH, MQ) may not be available in all environments.
  - Provide configuration for optional capabilities or fallback behavior.

- Security:
  - Credentials must be managed securely (prefer ENV vars).

- Timeouts and error handling:
  - Ensure robust error messages and sensible defaults.

## Agent Ownership (for implementation phase)

When we implement Phase 4, responsibilities will be:

- **@rest-capability**
  - Implement REST client abstraction.

- **@database-capability**
  - Implement DB client abstraction.

- **@ssh-sftp-capability**
  - Implement SSH/SCP/SFTP client abstraction.

- **@mq-capability**
  - Implement MQ client abstraction.

- **@bdd-step-engineer**
  - Implement capability-oriented step definitions.

- **@feature-template-generator**
  - Create feature templates for API/DB/SSH/MQ scenarios.

- **@quality-gate-reviewer**
  - Review capability interfaces for clarity, reuse, and safety.

## Commit Boundaries (when implemented)

Phase 4 should be delivered in multiple targeted commits:

1. **Commit K – REST Capability & API Steps**
   - Add REST client module.
   - Integrate into World.
   - Implement `apiSteps.js` and a sample API feature.

2. **Commit L – DB Capability & DB Steps**
   - Add DB client module.
   - Integrate into World.
   - Implement `dbSteps.js` and a sample DB feature.

3. **Commit M – SSH/SCP/SFTP Capability & SSH Steps**
   - Add SSH/SCP/SFTP client module.
   - Integrate into World.
   - Implement `sshSteps.js` and a sample SSH feature.

4. **Commit N – MQ Capability & MQ Steps**
   - Add MQ client module.
   - Integrate into World.
   - Implement `mqSteps.js` and a sample MQ feature.

5. **Commit O – Refactoring & Consolidation**
   - Cleanup duplicated patterns.
   - Ensure consistent naming and error handling across capabilities.

Each capability should be reviewable and testable in isolation before integration.
