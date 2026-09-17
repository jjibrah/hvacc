# Modules

Each directory is one product or infrastructure capability. Keep its schema,
server logic, UI, and tests together when they are specific to that capability.

- Modules may import from `src/shared`.
- A module should expose intentional entry points such as `index.ts` or
  `server.ts`; routes should not reach into another module's internal folders.
- Cross-module workflows belong in the module that owns the use case, not in a
  generic `utils` or `services` dumping ground.
- Create a new module only when implementation starts. Authentication and RBAC
  now live in `src/modules/authentication`.
