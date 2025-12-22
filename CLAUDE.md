# zirc3

This is essentially a next-generation version of The Lounge IRC - a multi-tenant IRC bouncer Elysia server, which is accessed via a SolidJS web app.

- Currently we only handle single user with no auth, while implementing the core functionality.
- IRC events will eventually be persisted to db. We avoid using irc-framework's opinionated event helpers as they're not suited to this use case.
- bun's UUIDv7 implementation is monotonic, so we can call it from anywhere.

## Philosophy

- Many components of the server app qualify as reasonable cases for using class definitions.

## Scripts

- `bun check-types`: This is a fullstack app, you can't partially typecheck the individual workspaces, as you may have caused issues downstream.

## Coding

- The linter will aggressively remove unused code, such as imports. If you import something, make sure you're using it in the same edit, or just add the import last.

## Logging

Log to help debug, not to look pretty. The goal is to surface issues quickly.

**Format:** `[module] context: data`

```typescript
// Good: log the actual object - catches config bugs immediately
console.log("[networks] creating client:", config);

// Bad: extracted values hide the full picture
console.log(`Creating client "${name}" on ${host}:${port}`);
```

**What to log:**
- Config/options objects when creating things (clients, connections, etc.)
- State transitions: `[module] context: connecting -> connected`
- Errors with the full error object: `console.error("[module] error:", err)`
- Incoming commands/requests with their args

**What NOT to do:**
- Don't extract individual fields into formatted strings - log the object
- Don't create "pretty" multi-line banners or decorative output
- Don't log routine success cases ("message sent successfully")
- Don't wrap in try/catch just to log - let errors bubble up with stack traces

**Levels:**
- `console.log` - normal operations worth knowing about
- `console.error` - actual errors
- Skip debug-level logging for now (add later if needed)

## Monorepo

**Apps:**
- `apps/server-orpc`: oRPC server - IRC bouncer, manages network connections
- `apps/web`: SolidJS web client
- `apps/cli`: CLI tools for testing/debugging

**Packages:**
- `packages/irc-client`: Enhanced irc-framework wrapper
- `packages/db`: Drizzle ORM + libsql (not yet integrated)
- `packages/config`: Shared TypeScript config

## Scripts

From the root:
```bash
bun run server              # Start server directly
bun run cli <script>        # Run CLI script (e.g., bun run cli add-network --help)
bun run dev                 # Start all dev servers via turbo
bun run dev:server          # Start just the server
bun run dev:web             # Start just the web client
bun run check-types         # Type check all packages
```

CLI scripts (from apps/cli or via `bun run cli`):
```bash
add-network <name> [--host] [--port] [--nick] [--tls] [--channels]
delete-network <name>
list-networks [--json]
send-command <network> <command> [...args]
subscribe [--json]
```

# IRC

- `ngircd` is running locally for demoing functionality, host: `localhost`, port: `6667`