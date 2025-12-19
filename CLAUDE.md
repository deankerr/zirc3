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

## Monorepo

- `apps/server`: IRC bouncer/client manager, Elysia
- `apps/client`: SolidJS/Vite web client
- `packages/irc-framework`: We're not actually using the package from here, it's just for reference