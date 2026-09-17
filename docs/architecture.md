# Application structure

The repository uses domain modules with a small shared layer. Framework files
stay where their tools expect them; business and infrastructure capabilities
live together under `src/modules`.

```text
hvacc/
├── .github/workflows/             Continuous-integration checks
├── docs/
│   ├── integrations/retell/       Retell prompts and synthetic knowledge
│   ├── modules/                   Module decisions and implementation notes
│   ├── product/                   Product requirements
│   ├── architecture.md            This structure and dependency policy
│   └── roadmap.md                 Delivery checklist
├── drizzle/                       Ordered, immutable SQL migrations
├── e2e/                           Browser-level tests
├── public/                        Static browser assets
└── src/
    ├── app/                       Next.js routes and route-level states
    ├── modules/
    │   ├── dashboard/             Dashboard UI capability
    │   └── database/              Drizzle schema, connection, seed, and tests
    ├── shared/
    │   ├── config/env/            Environment validation
    │   └── ui/                    Reusable presentation components
    └── test/                      Cross-module test setup
```

## Where new work belongs

- `src/app`: route composition only. Route files call module entry points and
  should not contain domain rules or direct database queries.
- `src/modules/<capability>`: code owned by one domain capability. Keep its
  server logic, components, validation, and tests together. Module 3 will use
  `src/modules/authentication` after approval.
- `src/shared`: code that is truly reusable and has no domain owner. Avoid
  generic `utils` and `services` folders; place a helper beside its owner until
  at least two modules require it.
- `drizzle`: generated and custom database migrations. Never move an applied
  migration or edit it after deployment; create the next migration instead.
- `docs/modules`: decisions and evidence for a delivery module. These documents
  do not belong in runtime source folders.

## Dependency direction

```text
Next.js app routes
  -> domain modules
      -> shared configuration and UI

domain modules
  -> another module only through an intentional public entry point

shared code
  -X-> domain modules
```

Browser components must never import the database module, server environment,
Supabase service credentials, Retell credentials, or server-only integration
code. ESLint enforces the major directory boundaries and the shared-UI secret
boundary.

## Module shape

Create only the folders a module needs:

```text
src/modules/example/
├── components/       Module-owned UI
├── server/           Server-only services and repositories
├── validation/       Input and domain schemas
├── *.test.ts         Tests beside the behavior they verify
├── index.ts          Browser-safe public exports, when needed
└── server.ts         Explicit server-only public exports, when needed
```

Do not create all of these as placeholders. A compact module is preferable to
empty architectural ceremony.
